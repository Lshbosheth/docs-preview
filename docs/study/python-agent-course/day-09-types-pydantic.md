---
title: Day 9 类型标注与结构化任务
---

# Day 9：类型标注与结构化任务

> 今天引入「类型」和「结构化数据」。我们新增 `app/models.py`，用 `TypedDict` 描述消息结构、用 `Pydantic` 定义 `LearningTask`（标题 / 优先级 / 完成状态）。重点是想清一件事：**普通消息字典、Pydantic 数据模型、模型输出文本，是三件完全不同的东西。**

## 今天完成什么

- 在 `app/models.py` 定义 `ChatMessage`（用 `TypedDict`）和 `LearningTask`（用 `Pydantic`）。
- 用 `LearningTask` 校验一个手工字典，看到「合法通过、非法报错」两种结果。
- 给 `main.py` 的 `messages` 加上 `ChatMessage` 类型标注，并用 Pydantic 演示结构化校验。

## 它接在昨天哪里

Day 8 留下了干净的 `DeepSeekClient.chat(messages)`。今天不改动它，而是在它「上游」补一层数据结构定义：`messages` 里每个元素到底是什么形状（`ChatMessage`），以及我们想从学习意图里提取出的「任务」长什么样（`LearningTask`）。Day 12 会让模型自动产出 `LearningTask`，今天先把它定义好、手工校验通。

## 概念解释

- **`list[str]`**：类型标注，表示「字符串组成的列表」。Python 3.9+ 可直接写，只做提示、运行时不强制。
- **`Literal["高", "中", "低"]`**：把取值限定在这几个字符串里，超出就错。
- **`TypedDict`**：给字典加「字段 + 类型」提示。它**还是普通 dict**，只是 IDE 和类型检查器能帮你发现拼错字段名。
- **`Pydantic BaseModel`**：运行时真正校验数据。字段类型不对、缺必填项、给了非法枚举值，都会当场抛错。

**三件不同的事（必讲）**：

1. **普通消息字典**：`{"role": "user", "content": "..."}`——程序运行时真正在 `messages` 里流动的数据。
2. **Pydantic 数据模型**：`LearningTask`——对「数据应该长什么样」的**约束与校验**规则，本身不是数据。
3. **模型输出**：DeepSeek 返回的 `content` 是一段**文本字符串**，还不是结构。要把它变成 `LearningTask`，需要解析（Day 12 做）。

> 一句话：消息字典是「货物」，Pydantic 是「质检标准」，模型输出是「还没拆封的快递」。

## 动手前的目录

```text
python-learning-agent/
├─ app/
│  ├─ __init__.py
│  ├─ classifier.py
│  ├─ storage.py
│  └─ deepseek_client.py
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. `requirements.txt` 增加 `pydantic>=2,<3` 并安装。
2. 新建 `app/models.py`：定义 `ChatMessage(TypedDict)` 与 `LearningTask(BaseModel)`。
3. 在 `main.py` 里 `from app.models import ChatMessage, LearningTask`，给 `messages` 标 `list[ChatMessage]`，并演示 `LearningTask(**raw)` 的校验成功与失败。
4. 运行验证：正常任务通过，非法优先级触发 Pydantic 报错。

## 完整代码

**`python-learning-agent/requirements.txt`**

```text
python-dotenv>=1.0.0
openai>=2.45,<3
pydantic>=2,<3
```

**`python-learning-agent/app/models.py`**

```python
from typing import Literal, TypedDict
from pydantic import BaseModel, Field


class ChatMessage(TypedDict):
    """一条对话消息的结构提示：role + content。它仍是普通 dict。"""
    role: str
    content: str


# 优先级的合法取值
Priority = Literal["高", "中", "低"]


class LearningTask(BaseModel):
    """从学习意图中整理出的结构化任务。"""
    title: str = Field(..., description="学习任务标题")
    priority: Priority = Field("中", description="优先级：高 / 中 / 低")
    done: bool = Field(False, description="是否已完成")
```

**`python-learning-agent/main.py`**

```python
from typing import List
from app.classifier import create_message, classify_message
from app.storage import load_messages, save_messages
from app.deepseek_client import DeepSeekClient
from app.models import ChatMessage, LearningTask


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    # messages 现在有了明确的元素类型提示
    messages: List[ChatMessage] = load_messages()

    user_msg = create_message("user", f"{name} 想学习：{topic}")
    messages.append(user_msg)

    category = classify_message(user_msg["content"])
    print(f"分类结果：{category}")

    messages.append(create_message("system", "你是一个耐心的中文编程学习助手。"))

    # 演示 Pydantic 结构化校验（Day 12 才会让模型自动产出这种结构）
    raw = {"title": "练习字典和列表", "priority": "高", "done": False}
    task = LearningTask(**raw)
    print(f"结构化任务：{task.title} / 优先级={task.priority} / 完成={task.done}")

    # 故意演示校验失败：priority 不在 高/中/低 之内
    try:
        LearningTask(title="缺优先级但给了非法值", priority="紧急")
    except Exception as e:
        print(f"校验失败示例：{e}")

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
    print(f"已保存 {len(messages)} 条消息。")


if __name__ == "__main__":
    main()
```

> `app/classifier.py`、`app/storage.py`、`app/deepseek_client.py`、`.env.example`、`.gitignore` 沿用，无需改动。

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
今天想学什么：怎么用字典保存消息
分类结果：查资料
结构化任务：练习字典和列表 / 优先级=高 / 完成=False
校验失败示例：1 validation error for LearningTask
priority
  Input should be '高', '中' or '低' [type=literal_error, input_value='紧急', input_type=str]
助手：在 Python 中，字典用 {...} 保存键值对……
已保存 4 条消息到 data/conversations.json
```

> `助手：...` 的内容由模型生成，每次可能不同。重点是：结构化任务校验通过，非法优先级被 Pydantic 当场拦下。

## 常见错误

**问题 A**：`ImportError: cannot import name 'BaseModel' from 'pydantic'` 或 `Field` 报错。

**排查**：你装的是 Pydantic v1，而本教程用 v2 语法（`Field` 作为关键字参数 `Field(..., description=...)`）。运行 `pip install -U "pydantic>=2.0.0"` 升级。v1 的 `Field(..., title=...)` 写法不同。

**问题 B**：以为 `TypedDict` 会校验数据，结果传错字段也没报错。

**排查**：`TypedDict` **只做类型提示，不校验**。真正的校验靠 `LearningTask`（Pydantic）。需要运行时保证结构，用 Pydantic，不要用 TypedDict 当保险。

**问题 C**：把 `ChatMessage` 当对象用属性访问：`msg.role`（报错 `TypeError: 'dict' object has no attribute 'role'`）。

**排查**：`ChatMessage` 本质还是 dict，要用 `msg["role"]`。想用 `.role` 访问，就把它也定义成 Pydantic 模型——但 `messages` 要保持「普通 dict」以便直接发给 DeepSeek，所以这里故意用 TypedDict。

## 动手改一改

给 `LearningTask` 增加一个可选字段 `due: str | None = None`（截止日期）。试试用 `LearningTask(title="复习装饰器", due="2026-07-20")` 创建，并观察 `done` 的默认值仍是 `False`。

## 验收清单

- [ ] `app/models.py` 定义了 `ChatMessage`（TypedDict）与 `LearningTask`（Pydantic）。
- [ ] `LearningTask` 能正确校验合法输入；非法 `priority` 触发报错。
- [ ] `main.py` 的 `messages` 标注为 `list[ChatMessage]`。
- [ ] `requirements.txt` 含 `pydantic`，安装成功。

## 今日记录

```text
今天跑通：用 TypedDict 标注消息、用 Pydantic 校验 LearningTask
现在能解释：普通消息字典 / Pydantic 模型 / 模型输出文本 是三件不同的事
明天先做：Day 10 给模型调用加 try/except/超时/日志，处理缺 Key、网络失败、限流、空内容
```

## 留给明天的接口

留下 `ChatMessage` 与 `LearningTask` 两个定义，以及清晰的 `DeepSeekClient.chat(messages)`。Day 10 会在调用层加「错误处理 + 日志」：`chat` 内部要能区分「没 Key / 网络超时 / 被限流 / 返回空」，并把这些情况以面向学习者的方式暴露出来，同时保证日志里**绝不出现 Key**。

## 官方参考链接

- Pydantic 文档：<https://docs.pydantic.dev/latest/>
- Python typing 标准库：<https://docs.python.org/3/library/typing.html>

> 阶段提示：仍在「LLM 应用」阶段。今天我们让数据「有形状」，明天让调用「更可靠」。
