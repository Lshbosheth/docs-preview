---
title: Day 12 Prompt 与结构化输出
---

# Day 12：Prompt 与结构化输出

> 今天让模型「按固定格式回答」。我们用 `PromptTemplate` 给模型一套带变量的提示词，并用 `PydanticOutputParser` 把它的回复解析成 Day 9 定义的 `LearningTask` 对象。输入一句「明天下班后学半小时字典」，输出一个程序能直接用的结构化任务。

## 今天完成什么

- 新增 `app/task_parser.py`，用 `PromptTemplate` + `PydanticOutputParser` 把自然语言需求整理成 `LearningTask`。
- 处理「解析失败」：模型输出不符合 schema 时给出友好提示，而不是抛一堆英文错误。
- 在 `main.py` 里，当分类为「记录任务」时调用 `parse_task`，打印结构化结果。

## 它接在昨天哪里

Day 11 留下 `langchain_chat(messages)` 与消息对象转换。Day 9 留下 `LearningTask` 这个 Pydantic 模型。今天把两者接起来：用 LangChain 的「Prompt + 解析器」让模型产出**符合 `LearningTask` 结构**的对象——这正是 Day 9 说的「模型输出文本需要解析才变成结构」的那一步。

## 概念解释

- **`PromptTemplate`**：带 `{}` 占位符的提示词模板。`{query}` 是每次不同的输入变量；`{format_instructions}` 是「固定格式说明」，用 `partial_variables` 注入一次即可。
- **`PydanticOutputParser`**：告诉模型「按 `LearningTask` 的字段输出」，并把模型的文本回复反序列化成 `LearningTask` 对象。底层靠 `parser.get_format_instructions()` 生成给模型的格式要求。
- **LCEL 管道 `prompt | llm | parser`**：把三段串成一条链，`invoke({"query": ...})` 一次性跑完，直接拿到解析好的对象。类似前端管道 `fn1 | fn2 | fn3`。

**类比的边界**：`PromptTemplate` 像「带占位符的短信模板」；`PydanticOutputParser` 像「把对方回的短信按固定字段拆成表单」。但模型不是数据库，它可能「答非所问」或「格式跑偏」——所以解析可能失败，必须兜底。

## 动手前的目录

```text
python-learning-agent/
├─ app/
│  ├─ __init__.py
│  ├─ classifier.py
│  ├─ storage.py
│  ├─ deepseek_client.py
│  ├─ models.py
│  └─ langchain_client.py
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. 新建 `app/task_parser.py`：定义 `PROMPT_TEXT`，用 `PromptTemplate` 注入 `format_instructions`，用 `PydanticOutputParser(pydantic_object=LearningTask)` 解析。
2. `parse_task(query)` 组装 `prompt | llm | parser` 链，`invoke` 后返回 `LearningTask`；用 `try/except` 把解析异常转成 `RuntimeError`。
3. 改写 `main.py`：当 `classify_message` 结果为「记录任务」时，调用 `parse_task(topic)` 并打印结构化任务。
4. 运行验证：输入一句任务需求，得到 `title / priority / done` 固定结构。

## 完整代码

**`python-learning-agent/app/task_parser.py`**

```python
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from app.models import LearningTask

load_dotenv()

MODEL = "deepseek-v4-flash"
BASE_URL = "https://api.deepseek.com"

PROMPT_TEXT = """你是一个学习日程助手。请把用户的需求整理成一个结构化任务。
只输出符合下面格式的内容，不要多余解释。

{format_instructions}

用户需求：{query}

请返回结构化任务："""


def parse_task(query):
    """把自然语言需求整理成 LearningTask 对象。"""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）")

    parser = PydanticOutputParser(pydantic_object=LearningTask)
    prompt = PromptTemplate(
        template=PROMPT_TEXT,
        input_variables=["query"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    llm = ChatOpenAI(
        model=MODEL,
        api_key=api_key,
        base_url=BASE_URL,
        temperature=0,  # 结构化输出要稳定，temperature 设 0
        extra_body={"thinking": {"type": "disabled"}},
    )
    chain = prompt | llm | parser
    try:
        return chain.invoke({"query": query})
    except Exception as e:
        raise RuntimeError(f"无法把需求解析成任务：{e}")
```

**`python-learning-agent/main.py`**

```python
from typing import List
from app.classifier import create_message, classify_message
from app.storage import load_messages, save_messages
from app.deepseek_client import DeepSeekClient
from app.langchain_client import langchain_chat
from app.task_parser import parse_task
from app.models import ChatMessage, LearningTask


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    messages: List[ChatMessage] = load_messages()
    user_msg = create_message("user", f"{name} 想学习：{topic}")
    messages.append(user_msg)

    category = classify_message(user_msg["content"])
    print(f"分类结果：{category}")

    messages.append(create_message("system", "你是一个耐心的中文编程学习助手。"))

    # 记录任务类：尝试把自然语言整理成 LearningTask
    if category == "记录任务":
        try:
            task = parse_task(topic)
            print(
                f"结构化任务 -> 标题：{task.title}｜优先级：{task.priority}｜完成：{task.done}"
            )
        except RuntimeError as e:
            print(f"任务解析失败：{e}")

    client = DeepSeekClient()
    try:
        reply = client.chat(messages)
    except RuntimeError as e:
        print(f"调用失败：{e}")
        return

    assistant_msg = create_message("assistant", reply)
    messages.append(assistant_msg)
    print(f"助手：{reply}")

    save_messages(messages)


if __name__ == "__main__":
    main()
```

> `app/classifier.py`、`app/storage.py`、`app/deepseek_client.py`、`app/models.py`、`app/langchain_client.py`、`.env.example`、`.gitignore`、`requirements.txt` 均沿用，无需改动。

## 运行命令

```powershell
cd python-learning-agent
.\.venv\Scripts\Activate.ps1
python main.py
```

## 预期输出

```text
你的名字：小明
今天想学什么：明天下班后学半小时字典
分类结果：记录任务
结构化任务 -> 标题：学半小时字典｜优先级：中｜完成：False
助手：好主意！字典是 Python 里非常常用的结构……
已保存 4 条消息到 data/conversations.json
```

> `标题 / 优先级 / 完成` 由模型从你的自然语言里抽取，每次可能略有不同，但结构固定。这就是「模型产出程序能继续处理的数据」——拿到 `LearningTask` 后，你可以把它存库、排进待办、按优先级排序。

## 常见错误

**问题 A**：`chain.invoke` 报 `missing value for input variable 'format_instructions'`。

**排查**：`format_instructions` 用的是 `partial_variables`（模板里预先填好），不是 `input_variables`。`input_variables` 只需列出你运行时传的 `query`。两者搞混就会提示缺变量。

**问题 B**：解析失败，模型输出带了 Markdown 代码块（```json ... ```）导致 `ValidationError`。

**排查**：`PydanticOutputParser` 通常能容忍代码块围栏，但个别模型会夹私货。可在 `PROMPT_TEXT` 里强调「只输出 JSON，不要代码块」；若仍失败，用 `try/except` 兜底（已做），提示用户换种说法重试。

**问题 C**：`priority` 解析成「高!」或「高。」带标点，触发 `Literal` 校验失败。

**排查**：在 `PROMPT_TEXT` 的格式说明里写清「优先级只能取：高 / 中 / 低，不要加标点」。同时本教程 `temperature=0` 已降低这种随机性。

## 动手改一改

给 `LearningTask` 增加可选字段 `due: str | None = None`（Day 9 若已加则直接用），并在 `PROMPT_TEXT` 里提示模型「若用户提到时间，填入 due，否则留空」。观察「明天下班后学」是否能被抽成 `due`。

## 验收清单

- [ ] `app/task_parser.py` 新增，使用 `PromptTemplate` + `PydanticOutputParser`。
- [ ] 自然语言需求能被整理成 `LearningTask`，字段固定可读。
- [ ] 解析失败时给出友好提示，不抛未处理异常。
- [ ] 明确理解「模型输出文本 → 解析 → 程序可用对象」这一链路。

## 今日记录

```text
今天跑通：用 PromptTemplate + PydanticOutputParser 把需求整理成 LearningTask
现在能解释：PromptTemplate 是带变量模板；解析失败必须兜底
明天先做：Day 13 让模型选择工具——模型提调用意图，Python 负责执行
```

## 留给明天的接口

留下 `parse_task(query)` 这个「模型产出结构化数据」的能力。Day 13 要往前再走一步：不再只是「模型回答」，而是「模型决定要不要调用工具、调用哪个」——模型提出调用意图，Python 真正执行，再把结果交回模型。那才是 Agent 的开始。

## 官方参考链接

- LangChain Models 与 Prompt Templates：<https://docs.langchain.com/oss/python/langchain/models>
- LangChain Structured Output：<https://docs.langchain.com/oss/python/langchain/structured-output>

> 阶段提示：Day 12 仍是「LLM 应用」阶段的收尾——模型很能「答」，但还不能「自己决定下一步」。

<ProgressButton courseId="python-agent-course" dayId="day-12-structured-output" />
