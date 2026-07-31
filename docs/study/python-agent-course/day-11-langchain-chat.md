---
title: Day 11 用 LangChain 表达模型与消息
---

# Day 11：用 LangChain 表达模型与消息

> 今天引入 LangChain 作为「另一套写法」。我们新增 `app/langchain_client.py`，用 `ChatOpenAI` + `SystemMessage/HumanMessage/AIMessage` 表达同一个调用。**保留 Day 10 的原生 `DeepSeekClient` 不动**——本天的目标是「对比」，不是「替换」。

## 今天完成什么

- 安装 `langchain` / `langchain-openai`，新增 `app/langchain_client.py`。
- 实现 `to_langchain_messages`（把 `{role, content}` 字典转成 LangChain 消息对象）和 `langchain_chat(messages, stream=False)`。
- 在 `main.py` 里加一个「对比」分支：输入话题为「对比」时，用同一份 `messages` 分别跑原生 SDK 和 LangChain，并打印两段回复。

## 它接在昨天哪里

Day 10 留下了可靠的 `DeepSeekClient.chat(messages)`。今天在它旁边放一个 `langchain_chat(messages)`——两者吃的是**同一个** `messages`（`[{role, content}]`），只是「表达模型与消息」的方式不同。Day 12 起我们会基于 LangChain 做 Prompt 与结构化输出。

## 概念解释

- **`ChatOpenAI`**：LangChain 对「OpenAI 兼容聊天模型」的统一封装。因为 DeepSeek 兼容 OpenAI 接口，只需把 `base_url` 指向 DeepSeek、填上同款 Key，就能复用。
- **消息对象**：LangChain 用 `SystemMessage` / `HumanMessage` / `AIMessage` 代替裸字典。它们本质还是「角色 + 内容」，只是变成对象，方便链式组合。
- **`invoke`（同步）与 `stream`（流式）**：`llm.invoke(messages)` 一次拿回完整回复；`llm.stream(messages)` 逐块吐字，适合做「打字机」效果。对应原生 SDK 的 `stream=True`。

**必讲：LangChain 是封装层，不是另一个模型。** 你今天调用的仍然是 DeepSeek 的 `deepseek-v4-flash`。LangChain 只是把「建客户端、组消息、发请求、取文本」包装成更 Pythonic 的 API。别把它理解成「换了一个更聪明的模型」。

**类比的边界**：原生 SDK 像「直接用 fetch 调接口」；LangChain 像「引入了一个 axios + 一套请求/响应拦截与组合工具」。底层 HTTP 没变，变的是你怎么写代码。

## 动手前的目录

```text
python-learning-agent/
├─ app/
│  ├─ __init__.py
│  ├─ classifier.py
│  ├─ storage.py
│  ├─ deepseek_client.py
│  └─ models.py
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. `requirements.txt` 增加 `langchain` 与 `langchain-openai` 并安装。
2. 新建 `app/langchain_client.py`：定义 `to_langchain_messages` 把字典映射成消息对象；`langchain_chat` 用 `ChatOpenAI` 调 `invoke` / `stream`。
3. 改写 `main.py`：当用户输入话题为「对比」时，分别调用 `DeepSeekClient().chat` 与 `langchain_chat`，打印两者结果。
4. 运行验证：两种写法拿到语义相近的回复，确认「底层是同一模型」。

## 完整代码

**`python-learning-agent/requirements.txt`**

```text
python-dotenv>=1.0.0
openai>=2.45,<3
pydantic>=2,<3
langchain>=1.3,<2
langchain-openai>=1.3,<2
```

**`python-learning-agent/app/langchain_client.py`**

```python
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

load_dotenv()

MODEL = "deepseek-v4-flash"
# LangChain 会把 base_url 直接传给底层 OpenAI 客户端；DeepSeek 的端点正好是
# https://api.deepseek.com/chat/completions。若个别版本报 404，可改成
# "https://api.deepseek.com/v1" 试试（DeepSeek 同样兼容该路径）。
BASE_URL = "https://api.deepseek.com"


def to_langchain_messages(messages):
    """把 [{role, content}] 转换成 LangChain 消息对象列表。"""
    mapping = {
        "system": SystemMessage,
        "user": HumanMessage,
        "assistant": AIMessage,
    }
    result = []
    for m in messages:
        cls = mapping.get(m["role"])
        if cls is None:
            continue
        result.append(cls(content=m["content"]))
    return result


def langchain_chat(messages, stream=False):
    """用 LangChain 调用同一个 DeepSeek 模型。"""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）")

    llm = ChatOpenAI(
        model=MODEL,
        api_key=api_key,
        base_url=BASE_URL,
        temperature=0.7,
        extra_body={"thinking": {"type": "disabled"}},
        timeout=30,
    )
    lc_messages = to_langchain_messages(messages)

    if stream:
        chunks = []
        for chunk in llm.stream(lc_messages):
            text = chunk.content or ""
            print(text, end="", flush=True)
            chunks.append(text)
        print()
        return "".join(chunks)

    response = llm.invoke(lc_messages)
    return response.content
```

**`python-learning-agent/main.py`**

```python
from typing import List
from app.classifier import create_message, classify_message
from app.storage import load_messages, save_messages
from app.deepseek_client import DeepSeekClient
from app.langchain_client import langchain_chat
from app.models import ChatMessage, LearningTask


def main():
    name = input("你的名字：")
    topic = input("今天想学什么（输入『对比』可同时看原生与 LangChain 两种写法）：")

    messages: List[ChatMessage] = load_messages()
    user_msg = create_message("user", f"{name} 想学习：{topic}")
    messages.append(user_msg)

    category = classify_message(user_msg["content"])
    print(f"分类结果：{category}")

    messages.append(create_message("system", "你是一个耐心的中文编程学习助手。"))

    # 对比分支：同一份 messages，两种写法
    if topic.strip() == "对比":
        native_reply = DeepSeekClient().chat(messages)
        print(f"[原生 SDK] 助手：{native_reply}")
        lc_reply = langchain_chat(messages)
        print(f"[LangChain] 助手：{lc_reply}")
        messages.append(create_message("assistant", native_reply))
        save_messages(messages)
        return

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

> `app/classifier.py`、`app/storage.py`、`app/deepseek_client.py`、`app/models.py`、`.env.example`、`.gitignore` 沿用，无需改动。

## 运行命令

```powershell
cd python-learning-agent
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

## 预期输出

```text
你的名字：小明
今天想学什么：对比
分类结果：普通聊天
[原生 SDK] 助手：在 Python 中，字典（dict）用花括号保存键值对……
[LangChain] 助手：Python 的字典 dict 使用 {key: value} 的形式来组织数据……
已保存 4 条消息到 data/conversations.json
```

> 两段回复语义相近、措辞不同——因为它们底层是**同一个模型**，只是写法不同。内容因模型而异，每次可能不同。

## 常见错误

**问题 A**：`langchain_openai` 导入报错 `No module named 'langchain_openai'`。

**排查**：新装了 `langchain`，但 `ChatOpenAI` 在独立的 `langchain-openai` 包里。确认 `requirements.txt` 两项都装了：`pip install -r requirements.txt`。

**问题 B**：`langchain_chat` 报 `404 Not Found` 或 `AuthenticationError`。

**排查**：404 多半是 `base_url` 路径问题，参考代码注释改成 `https://api.deepseek.com/v1`；认证错误还是 Key 没读到，检查 `.env` 与 `load_dotenv()`。

**问题 C**：以为用了 LangChain 就「换了个更聪明的模型」。

**排查**：不是。`MODEL` 仍是 `deepseek-v4-flash`。LangChain 只是封装层；本课还通过 `extra_body` 显式关闭了 DeepSeek 思考模式，避免把框架差异和响应结构差异混在一起。

## 动手改一改

把 `langchain_chat(messages, stream=True)` 接到「对比」分支里，观察 LangChain 的流式输出（逐字打印）。再想想：流式输出适合什么场景？（提示：终端里的「打字机」效果、长时间任务的即时反馈。）

## 验收清单

- [ ] `app/langchain_client.py` 新增，提供 `to_langchain_messages` 与 `langchain_chat`。
- [ ] 原生 `DeepSeekClient` 仍保留可用，未被删除或覆盖。
- [ ] 「对比」分支下，两种写法拿到语义相近的回复。
- [ ] 明确理解「LangChain 是封装层，不是另一个模型」。

## 今日记录

```text
今天跑通：用 LangChain ChatOpenAI 表达同一调用，并与原生 SDK 对比
现在能解释：LangChain 是封装层；SystemMessage/HumanMessage/AIMessage 对应 role
明天先做：Day 12 用 PromptTemplate + PydanticOutputParser 把自然语言整理成 LearningTask
```

## 留给明天的接口

留下 `langchain_chat(messages)` 和「消息对象转换」能力。Day 12 会在 LangChain 之上加 `PromptTemplate`（带输入变量）与 `PydanticOutputParser`（把模型输出解析成 `LearningTask`）——也就是让模型吃一段「结构化提示」，吐出我们能直接用的 `LearningTask` 对象。

## 官方参考链接

- LangChain Models：<https://docs.langchain.com/oss/python/langchain/models>
- LangChain Messages：<https://docs.langchain.com/oss/python/langchain/messages>

> 阶段提示：仍在「LLM 应用」阶段。Day 11～12 用 LangChain 让「输入更可控、输出更结构化」。

<ProgressButton courseId="python-agent-course" dayId="day-11-langchain-chat" />
