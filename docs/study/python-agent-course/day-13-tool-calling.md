---
title: Day 13 让模型选择工具
---

# Day 13：让模型选择工具

> 从今天起进入「初级 Agent」阶段。前 12 天，模型只是「回答者」；今天开始，模型可以**自己决定要不要调用工具、调用哪个**。但记住铁律：**模型只提出「调用意图」，真正执行的权力在你（Python 程序）手里。**

## 今天完成什么

- 新增 `app/tools.py`，定义两个**安全的本地工具**：`get_current_date`（取今天日期）和 `read_learning_notes`（读项目内的示例学习记录）。
- 给 `DeepSeekClient` 增加 `chat_with_tools(messages)`：把工具 schema 发给模型，若模型返回 `tool_calls`，由 Python 执行并把结果交回模型。
- 在 `main.py` 里默认走 `chat_with_tools`，让模型自主选择是否用工具。

## 它接在昨天哪里

Day 12 让模型「按格式回答」；Day 13 让模型「按需行动」。两者的底层都是 Day 10 的 `DeepSeekClient`。今天我们在它上面加一层「工具循环」——这正是 Agent 与「纯 LLM 应用」的分水岭：模型开始参与**决策**（调用哪个工具），而程序负责**执行与状态**。

## 概念解释

- **工具定义（Tool Schema）**：用 JSON 描述「工具叫什么、干什么、参数长什么样」。模型靠这个 schema 知道「有哪些工具可用」。
- **Tool Call（工具调用意图）**：模型返回 `tool_calls`，里面是 `name` + `arguments`（JSON 字符串）。注意——这**只是意图**，模型并没有真的去读文件。
- **真正执行**：我们拿到 `name` 和 `arguments`，在 Python 里调用对应函数，拿到结果，再以 `role: "tool"` 消息回传给模型。

**必讲：模型提出调用意图，程序才拥有实际执行权。** 模型永远不能自己碰你的磁盘、执行命令。它只能「说」：我想调用 `read_learning_notes(topic='字典')`。是否执行、怎么执行，由你的代码决定。这正是「Agent 安全」的底座。

**安全边界**：本教程的两个工具都只读项目内的示例文件，**不删除、不修改、不执行任意命令**。这是设计文档的硬要求——工具范围必须可控。

## 动手前的目录

```text
python-learning-agent/
├─ app/
│  ├─ __init__.py
│  ├─ classifier.py
│  ├─ storage.py
│  ├─ deepseek_client.py
│  ├─ models.py
│  ├─ langchain_client.py
│  └─ task_parser.py
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. 新建 `app/tools.py`：实现 `get_current_date`、`read_learning_notes`，以及它们的 JSON schema 列表 `TOOLS` 和统一入口 `run_tool(name, arguments)`。
2. 改写 `app/deepseek_client.py`：新增 `chat_with_tools`，内部做「发请求 → 看 tool_calls → 执行 → 交回」的循环；异常翻译抽成 `_translate_error` 共用。
3. 改写 `main.py`：默认用 `client.chat_with_tools(messages)`，并把 `system` 提示改成「可以使用工具」。
4. 运行验证：问「今天几号」「我之前记过字典的笔记吗」，观察模型是否触发工具。

## 完整代码

**`python-learning-agent/app/tools.py`**

```python
import datetime
import json
from pathlib import Path

# 项目内示例学习记录（只读，不修改）
NOTES_FILE = Path(__file__).resolve().parent.parent / "data" / "notes.json"


def get_current_date() -> str:
    """返回今天的日期（本地时区），格式 YYYY-MM-DD。"""
    return datetime.date.today().strftime("%Y-%m-%d")


def read_learning_notes(topic: str) -> str:
    """读取本地学习记录中与 topic 相关的条目（只读项目内示例文件）。"""
    if not NOTES_FILE.exists():
        return "还没有本地学习记录。"
    notes = json.loads(NOTES_FILE.read_text(encoding="utf-8"))
    matched = [
        n for n in notes
        if topic in n.get("title", "") or topic in n.get("content", "")
    ]
    if not matched:
        return f"没有找到与『{topic}』相关的本地记录。"
    return "\n".join(f"- {n.get('title')}: {n.get('content')}" for n in matched)


# 工具 schema：告诉模型有哪些工具、参数长什么样
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_current_date",
            "description": "获取今天的日期（本地时区），当用户问到『今天几号』『日期』时使用。",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_learning_notes",
            "description": "读取本地学习记录中与某个主题相关的条目。",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "要查找的主题关键词"}
                },
                "required": ["topic"],
            },
        },
    },
]


def run_tool(name: str, arguments) -> str:
    """根据模型返回的工具名和参数，真正执行本地工具。"""
    if name == "get_current_date":
        return get_current_date()
    if name == "read_learning_notes":
        args = json.loads(arguments) if isinstance(arguments, str) else (arguments or {})
        return read_learning_notes(args.get("topic", ""))
    return f"未知工具：{name}"
```

**`python-learning-agent/app/deepseek_client.py`**（含 `chat` 与 `chat_with_tools`）

```python
import os
import logging
from openai import OpenAI
from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)
from dotenv import load_dotenv
from app.tools import TOOLS, run_tool

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("deepseek")

MODEL = "deepseek-v4-flash"
BASE_URL = "https://api.deepseek.com"


class DeepSeekClient:
    """对 DeepSeek 调用的薄封装，对外暴露 chat / chat_with_tools。"""

    def __init__(self, model=MODEL, timeout=30):
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise RuntimeError(
                "缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）"
            )
        self.model = model
        self.timeout = timeout
        self._client = OpenAI(api_key=api_key, base_url=BASE_URL)

    @staticmethod
    def _translate_error(e):
        if isinstance(e, AuthenticationError):
            return "API Key 无效（401）。请检查 .env 中的 DEEPSEEK_API_KEY。"
        if isinstance(e, RateLimitError):
            return "请求过于频繁，被限流（429）。请稍等几秒再试。"
        if isinstance(e, APITimeoutError):
            return "请求超时，模型未在限定时间内回应。请检查网络或调大 timeout。"
        if isinstance(e, APIConnectionError):
            return f"网络连接失败：{e}"
        logger.exception("DeepSeek 调用出现未预期错误")
        return f"调用 DeepSeek 时发生未知错误：{e}"

    def chat(self, messages):
        logger.info("调用 DeepSeek，消息条数=%d", len(messages))
        try:
            response = self._client.chat.completions.create(
                model=self.model, messages=messages, timeout=self.timeout,
                extra_body={"thinking": {"type": "disabled"}},
            )
        except Exception as e:
            raise RuntimeError(self._translate_error(e))
        content = response.choices[0].message.content
        if not content or not content.strip():
            raise RuntimeError("模型返回了空内容，请重试一次。")
        logger.info("DeepSeek 调用成功，回复长度=%d", len(content))
        return content

    def chat_with_tools(self, messages):
        work = list(messages)  # 用副本，不污染原始对话历史
        logger.info("调用 DeepSeek（带工具），消息条数=%d", len(work))
        try:
            response = self._client.chat.completions.create(
                model=self.model, messages=work, tools=TOOLS, timeout=self.timeout,
                extra_body={"thinking": {"type": "disabled"}},
            )
        except Exception as e:
            raise RuntimeError(self._translate_error(e))

        message = response.choices[0].message
        if not message.tool_calls:
            content = message.content or ""
            if not content.strip():
                raise RuntimeError("模型返回了空内容，请重试一次。")
            return content

        # 模型决定调用工具：把它的 tool_calls 记为 assistant 消息
        work.append({
            "role": "assistant",
            "content": message.content or "",
            "tool_calls": [tc.model_dump() for tc in message.tool_calls],
        })
        # Python 真正执行工具，把结果作为 tool 消息追加
        for tc in message.tool_calls:
            result = run_tool(tc.function.name, tc.function.arguments)
            work.append({"role": "tool", "tool_call_id": tc.id, "content": result})

        # 把工具结果交回模型，请它基于结果作答
        try:
            final = self._client.chat.completions.create(
                model=self.model, messages=work, timeout=self.timeout,
                extra_body={"thinking": {"type": "disabled"}},
            )
        except Exception as e:
            raise RuntimeError(self._translate_error(e))
        content = final.choices[0].message.content or ""
        if not content.strip():
            raise RuntimeError("模型返回了空内容，请重试一次。")
        return content
```

**`python-learning-agent/main.py`**

```python
from typing import List
from app.classifier import create_message, classify_message
from app.storage import load_messages, save_messages
from app.deepseek_client import DeepSeekClient
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

    messages.append(create_message(
        "system",
        "你是一个耐心的中文编程学习助手，可以使用工具获取日期和本地学习记录。",
    ))

    if category == "记录任务":
        try:
            task = parse_task(topic)
            print(
                f"结构化任务 -> 标题：{task.title}｜优先级：{task.priority}｜完成：{task.done}"
            )
        except RuntimeError as e:
            print(f"任务解析失败：{e}")

    # Agent 阶段：让模型自己决定是否调用工具
    client = DeepSeekClient()
    try:
        reply = client.chat_with_tools(messages)
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

> 其他文件（`classifier.py`、`storage.py`、`models.py`、`langchain_client.py`、`task_parser.py`、`.env.example`、`.gitignore`、`requirements.txt`）沿用，无需改动。记得在 `data/` 放一个示例 `notes.json`（见下方「动手改一改」）以便体验 `read_learning_notes`。

## 运行命令

```powershell
cd python-learning-agent
.\.venv\Scripts\Activate.ps1
python main.py
```

## 预期输出

```text
你的名字：小明
今天想学什么：今天几号，我之前记过字典的笔记吗
分类结果：查资料
助手：今天是 2026-07-13。我查了本地学习记录，找到了一条与「字典」相关的笔记：- 字典练习：
把姓名和年龄存成字典并遍历。需要我帮你复习吗？
已保存 4 条消息到 data/conversations.json
```

> 回复内容因模型而异。重点是：你并没有在代码里写「如果问日期就调 get_current_date」——是**模型自己判断**该调工具，Python 只负责执行并把结果交回去。

## 常见错误

**问题 A**：模型返回 `tool_calls`，但运行时报 `KeyError: 'tool_calls'` 或 `tc.function` 报错。

**排查**：`message.tool_calls` 是列表，元素有 `.function.name` / `.function.arguments` 和 `.id`。`chat_with_tools` 里我们用 `tc.model_dump()` 把它存进 `assistant` 消息的 `tool_calls`，第二轮 `role: "tool"` 消息必须带 `tool_call_id=tc.id` 与之配对，否则模型会拒绝。

**问题 B**：`read_learning_notes` 报 `FileNotFoundError`。

**排查**：示例 `notes.json` 还没建。在 `data/` 下创建一个 `notes.json`（数组，元素含 `title` / `content`），或接受「还没有本地学习记录。」这句兜底返回。

**问题 C**：模型始终不调用工具，直接回答。

**排查**：可能 `system` 提示没说「可以使用工具」，或问题本身不需要工具。可在 `system` 里更明确：「当用户问日期或本地记录时，请使用提供的工具」。另外 `deepseek-v4-flash` 支持函数调用；若你的账号该模型暂不支持，可临时把 `MODEL` 改成 `deepseek-v4-pro`。

## 动手改一改

在 `data/notes.json` 里放几条学习笔记，例如：

```json
[
  {"title": "字典练习", "content": "把姓名和年龄存成字典并遍历。"},
  {"title": "列表推导", "content": "用 [x*2 for x in nums] 生成新列表。"}
]
```

再问「我之前记过列表的笔记吗」，观察 `read_learning_notes` 是否被触发、返回是否匹配。

## 验收清单

- [ ] `app/tools.py` 定义了 `get_current_date`、`read_learning_notes`、`TOOLS`、`run_tool`。
- [ ] 工具只读取项目内示例文件，不含删除 / 改写 / 执行命令。
- [ ] `chat_with_tools` 在模型返回 `tool_calls` 时由 Python 执行，并把结果以 `role: "tool"` 交回。
- [ ] 模型「自主选择工具」的行为可见（日志或回复体现调用了工具）。

## 今日记录

```text
今天跑通：模型自主选择工具，Python 负责执行并把结果交回
现在能解释：Tool Call 只是意图；真正执行权在程序；工具范围必须可控
明天先做：Day 14 用 LangGraph 把「接收→分类→回答/调用模型→输出」串成可观察的图
```

## 留给明天的接口

留下 `chat_with_tools(messages)` 这个「带工具的模型调用」。Day 14 会把整个流程（接收问题 → 分类 → 直接回答 / 调模型 → 输出）显式建成一张 **LangGraph 图**——每个节点、每次状态变化都看得见，而不是藏在 `main` 的顺序代码里。

## 官方参考链接

- DeepSeek Tool Calls：<https://api-docs.deepseek.com/guides/tool_calls>

> 阶段提示：Day 13～15 是「初级 Agent」阶段。模型开始参与决策（选工具），程序负责执行与状态——这正是 Agent 与「纯 LLM 应用」的根本区别。
