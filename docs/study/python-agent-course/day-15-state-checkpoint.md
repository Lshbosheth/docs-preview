---
title: Day 15 条件路由与会话状态
---

# Day 15：条件路由与会话状态

> 最后一天。我们给 Day 14 的图加上 **`MemorySaver` 检查点**和 **`thread_id`**，让同一会话能延续上下文、不同会话彼此隔离。同时把路由补全为「直接回答 / 模型回答（含工具调用）/ 记录任务」三种。至此，第 3 节列出的 8 项最小项目能力全部达成。

## 今天完成什么

- 在 `app/graph.py` 引入模块级 `MemorySaver` 检查点，`build_graph()` 用 `checkpointer=checkpointer` 编译。
- 补全路由：问候走 `direct`（不调模型），任务走 `task`，其余走 `model`（内部 `chat_with_tools` 按需触发工具调用）。
- 在 `main.py` 里用 `thread_id` 区分会话，连续多轮对话；演示「换 `thread_id` 状态隔离」。

## 它接在昨天哪里

Day 14 留下 `build_graph()` 与 `run_one(user_text, history)`，但图**没有记忆**——每次 `invoke` 都是全新状态。Day 15 给图装上「检查点」：编译时传入 `MemorySaver`，运行时用 `config={"configurable": {"thread_id": ...}}` 标识会话。同一个 `thread_id` 多次 `invoke` 会自动累积 `messages`；换一个 `thread_id` 则状态隔离。

## 概念解释

- **Checkpoint（检查点）**：图在每一步之后把「状态」存起来。`MemorySaver` 把它存在内存里，按 `thread_id` 分桶。这样中断后能从检查点恢复，也能跨多轮延续。
- **`thread_id`**：会话的唯一标识。同一个 `thread_id` 对应一份共享状态；不同 `thread_id` 互不可见——天然支持「多用户 / 多会话」。
- **Conditional Edge（条件边）**：Day 14 已用 `add_conditional_edges` + `route` 选分支；今天它要覆盖三种走向：`direct` / `task` / `model`。其中 `model` 节点内部会调用 `chat_with_tools`，模型自行决定是否触发工具——这就是「工具调用」分支在图里的体现。

**类比的边界**：`thread_id` 像前端的「会话标签页 / 用户登录态」——每个标签独立，互不串台。`MemorySaver` 像「存在内存里的标签页状态」；一旦程序重启就清空（要跨重启持久，得换 `PostgresSaver` / `MongoDBSaver`，或结合 Day 6 的 JSON 存储）。

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
│  ├─ task_parser.py
│  ├─ tools.py
│  └─ graph.py   ← 今天加 checkpointer + thread_id + direct 分支
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. 在 `app/graph.py` 顶部 `from langgraph.checkpoint.memory import MemorySaver`，建一个模块级 `checkpointer = MemorySaver()`。
2. 加 `direct_node`（问候直接回答，不调模型）和 `is_greeting` 判断；`route` 改成三分支（`direct` / `task` / `model`）。
3. `build_graph()` 末尾 `return g.compile(checkpointer=checkpointer)`；`run_one` 接收 `thread_id`，用 `config` 调用。
4. 改写 `main.py`：循环读输入，每次 `run_one(topic, thread_id=thread_id)`，并把本轮 user/assistant 追加进 JSON（跨进程持久）。
5. 运行验证：同一 `thread_id` 连续问两个关联问题（模型能接上 context）；换 `thread_id` 后上下文消失。

## 完整代码

**`python-learning-agent/app/graph.py`**

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

from app.classifier import classify_message
from app.deepseek_client import DeepSeekClient
from app.task_parser import parse_task

# 同进程内存检查点：按 thread_id 区分不同会话
checkpointer = MemorySaver()


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    category: str
    reply: str


def classify_node(state: AgentState) -> dict:
    last = state["messages"][-1]
    category = classify_message(last.content)
    print(f"[节点] classify_node -> category={category}")
    return {"category": category}


def is_greeting(text: str) -> bool:
    return text.strip().lower() in ("你好", "您好", "hi", "hello", "在吗")


def route(state: AgentState) -> str:
    text = state["messages"][-1].content
    if classify_message(text) == "记录任务":
        return "task"
    if is_greeting(text):
        return "direct"
    return "model"


def direct_node(state: AgentState) -> dict:
    print("[节点] direct_node -> 直接回答（不调模型）")
    reply = "你好！我是你的 Python 学习助手，今天想学点什么？"
    return {"reply": reply, "messages": [{"role": "assistant", "content": reply}]}


def task_node(state: AgentState) -> dict:
    print("[节点] task_node -> 解析为结构化任务")
    try:
        task = parse_task(state["messages"][-1].content)
        reply = f"已记录任务：{task.title}（优先级 {task.priority}）"
    except RuntimeError as e:
        reply = f"任务解析失败：{e}"
    return {"reply": reply, "messages": [{"role": "assistant", "content": reply}]}


def to_dict_messages(messages):
    """把 LangGraph 的 BaseMessage 列表转回 {role, content} 字典列表，
    以便传给 OpenAI / DeepSeek 原生 SDK。"""
    role_map = {"human": "user", "ai": "assistant", "system": "system"}
    result = []
    for m in messages:
        role = getattr(m, "type", "user")
        result.append({"role": role_map.get(role, role), "content": m.content})
    return result


def model_node(state: AgentState) -> dict:
    print("[节点] model_node -> 调用 DeepSeek（带工具，可能触发工具调用）")
    try:
        client = DeepSeekClient()
        reply = client.chat_with_tools(to_dict_messages(state["messages"]))
    except RuntimeError as e:
        reply = f"调用失败：{e}"
    return {"reply": reply, "messages": [{"role": "assistant", "content": reply}]}


def output_node(state: AgentState) -> dict:
    preview = state.get("reply", "")[:30]
    print(f"[节点] output_node -> reply 前 30 字：{preview}...")
    return {}


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("classify", classify_node)
    g.add_node("direct", direct_node)
    g.add_node("task", task_node)
    g.add_node("model", model_node)
    g.add_node("output", output_node)

    g.add_edge(START, "classify")
    g.add_conditional_edges(
        "classify", route,
        {"direct": "direct", "task": "task", "model": "model"},
    )
    g.add_edge("direct", "output")
    g.add_edge("task", "output")
    g.add_edge("model", "output")
    g.add_edge("output", END)
    return g.compile(checkpointer=checkpointer)


def run_one(user_text: str, thread_id: str = "default"):
    graph = build_graph()
    config = {"configurable": {"thread_id": thread_id}}
    return graph.invoke(
        {"messages": [{"role": "user", "content": user_text}]},
        config,
    )
```

**`python-learning-agent/main.py`**

```python
from app.classifier import create_message
from app.storage import load_messages, save_messages
from app.graph import run_one


def main():
    thread_id = input("会话 ID（thread_id，留空用 default）：").strip() or "default"
    print(f"已进入会话 [{thread_id}]，输入 exit 退出。")
    while True:
        topic = input("你：")
        if topic.strip().lower() in ("exit", "quit", "退出"):
            break
        result = run_one(topic, thread_id=thread_id)
        reply = result["reply"]
        print(f"助手：{reply}")

        # 跨进程持久（MemorySaver 仅同进程内存，重启即清空）
        history = load_messages()
        history.append(create_message("user", topic))
        history.append(create_message("assistant", reply))
        save_messages(history)


if __name__ == "__main__":
    main()
```

> 其他文件（`classifier.py`、`storage.py`、`deepseek_client.py`、`models.py`、`langchain_client.py`、`task_parser.py`、`tools.py`、`.env.example`、`.gitignore`、`requirements.txt`）沿用，无需改动。

## 运行命令

```powershell
cd python-learning-agent
.\.venv\Scripts\Activate.ps1
python main.py
```

## 预期输出

```text
会话 ID（thread_id，留空用 default）：alice
已进入会话 [alice]，输入 exit 退出。
你：你好
[节点] classify_node -> category=普通聊天
[节点] direct_node -> 直接回答（不调模型）
[节点] output_node -> reply 前 30 字：你好！我是你的 Python 学习助手…
助手：你好！我是你的 Python 学习助手，今天想学点什么？
你：今天几号，我记过字典的笔记吗
[节点] classify_node -> category=查资料
[节点] model_node -> 调用 DeepSeek（带工具，可能触发工具调用）
[节点] output_node -> reply 前 30 字：今天是 2026-07-13。我查了本地…
助手：今天是 2026-07-13。我查了本地学习记录，找到一条与「字典」相关的笔记……
你：exit
```

> 内容因模型而异。重点：`direct` 分支没花 token；`model` 分支在内部触发了工具调用（`get_current_date` / `read_learning_notes`）。若在同一进程内换 `thread_id=bob` 再问，会看到它「不记得」alice 的上下文——隔离生效。

## 常见错误

**问题 A**：换了 `thread_id` 但模型「还记得」上一轮。

**排查**：你大概每次 `run_one` 都从外部把整段 `history` 重新塞进 `messages`。Day 15 的 `run_one` **只传当前这条 user 消息**，记忆交给 `MemorySaver` 按 `thread_id` 维护。不要把外部历史再灌进去，否则隔离被打乱。

**问题 B**：重启程序后 `thread_id` 记忆消失。

**排查**：`MemorySaver` 是内存检查点，进程结束即清空——这是预期行为。需要跨重启持久，要么结合 Day 6 的 `save_messages` / `load_messages`（本教程 `main.py` 已在做），要么换 `PostgresSaver` / `MongoDBSaver`。

**问题 C**：`graph.invoke` 报 `Missing config` 或记忆不生效。

**排查**：用检查点编译的图，调用时**必须**传 `config={"configurable": {"thread_id": ...}}`，否则 LangGraph 不知道把状态存到哪个桶。

## 动手改一改

把 `MemorySaver` 换成数据库检查点（仅思路，不强制实现）：`from langgraph.checkpoint.postgres import PostgresSaver`，用 `PostgresSaver.from_conn_string(DB_URI)` 创建，其余代码几乎不变。思考：什么场景必须用数据库检查点？（提示：多进程 / 多机部署、要长期保留会话。）

## 验收清单（对应第 3 节最小项目能力）

- [ ] 在终端接收学习问题或任务（`input`）。
- [ ] 保存 `user` 与 `assistant` 消息（`storage` + `MemorySaver`）。
- [ ] 使用 DeepSeek 生成回复（`chat_with_tools`）。
- [ ] 把自然语言需求整理成结构化学习任务（`parse_task` → `LearningTask`）。
- [ ] 根据问题选择：直接回答 / 查日期或读本地记录（`route` + 工具）。
- [ ] 用 LangGraph 管理节点、条件分支和会话状态（`graph.py`）。
- [ ] 用同一个 `thread_id` 延续对话（MemorySaver 验证）。
- [ ] API 调用失败时给出可理解的错误，且日志/输出不泄露 Key（`_translate_error`）。

## 今日记录

```text
今天跑通：给图加 MemorySaver + thread_id，完成三分支路由与最终验收
现在能解释：checkpoint 保存状态；thread_id 隔离会话；MemorySaver 仅同进程内存
```

## 课程结语

15 天走完了一条连续项目线：

```text
终端输入 → user 消息字典 → messages 列表 → JSON 本地记录
        → DeepSeek 生成 assistant 消息 → LangChain 封装模型与 Prompt
        → 模型选择并调用工具 → LangGraph 管理状态、分支和持久化
```

你从「只会收数据的普通 Python 程序」，走到了「能自己决策、能调工具、有记忆的初级 Agent」。下一步可以：把 `MemorySaver` 换成数据库检查点、给工具加写操作（带确认）、或把 CLI 换成网页/Telegram 前端——但项目骨架你已经有了。

## 官方参考链接

- LangGraph 持久化（Checkpoint / thread_id）：<https://docs.langchain.com/oss/python/langgraph/persistence>
- LangGraph Graph API：<https://docs.langchain.com/oss/python/langgraph/graph-api>

> 阶段提示：Day 13～15 是「初级 Agent」阶段。今天你完成了「能让模型选工具、有记忆、状态可观察」的最小 Agent——课程目标达成。
