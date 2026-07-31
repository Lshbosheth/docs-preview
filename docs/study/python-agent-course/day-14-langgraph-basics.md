---
title: Day 14 用 LangGraph 串起流程
---

# Day 14：用 LangGraph 串起流程

> 前 13 天的逻辑都藏在 `main.py` 的顺序代码里。今天用 **LangGraph** 把整个流程显式建成一张「图」：接收问题 → 分类 → 直接回答 / 调用模型 → 输出。每个节点、每次状态变化都能看见——这正是 Agent 工程化的关键一步。

## 今天完成什么

- 新增 `app/graph.py`，用 `StateGraph` 定义 `AgentState`（含 `messages` / `category` / `reply`）。
- 实现 4 个节点：`classify`（分类）、`task`（记录任务）、`model`（调用模型）、`output`（输出），以及条件路由 `route`。
- 在 `main.py` 里用 `build_graph().invoke(...)` 跑一次，并**打印每个节点的进入顺序和状态变化**。

## 它接在昨天哪里

Day 13 留下了 `chat_with_tools`（带工具的模型调用）和 `parse_task`（任务解析）。Day 14 不重写它们，而是把「分类 → 选分支 → 执行 → 输出」这条原本写在 `main` 里的顺序逻辑，提升成一张**可观察的图**。你会发现：昨天「隐式」的流程，今天变成「显式」的节点和边。

## 概念解释

- **`State`（状态）**：整张图共享的一份数据，用 `TypedDict` 定义。节点读写它，图据此推进。`messages` 用 `Annotated[list, add_messages]`，表示「新消息会自动追加」。
- **`Node`（节点）**：一个普通函数，接收 `state`，返回「要更新的字段」。比如 `classify_node` 返回 `{"category": ...}`。
- **`Edge`（边）**：节点之间的连线。`add_edge(START, "classify")` 表示入口先到分类节点。
- **`START` / `END`**：图的固定入口和出口，由 LangGraph 提供。
- **`add_conditional_edges`**：条件路由。`route(state)` 返回字符串（如 `"task"` 或 `"model"`），图据此走到对应节点。

**类比的边界**：这很像前端的状态机 / 工作流编排（如 XState）。区别是 LangGraph 的「状态」会跨节点累积（尤其 `messages` 自动追加），而且 Day 15 还会给它加「记忆」。

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
│  └─ tools.py
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. `requirements.txt` 增加 `langgraph` 并安装。
2. 新建 `app/graph.py`：定义 `AgentState`；写 `classify_node` / `task_node` / `model_node` / `output_node`，每个节点打印自己被进入。
3. `build_graph()` 把节点和边连起来，`route` 根据 `category` 决定走 `task` 还是 `model`；`compile()` 生成可运行的图。
4. 改写 `main.py`：用 `run_one(user_text, history)` 调图，打印 `reply` 并保存。
5. 运行验证：观察控制台依次打印 `classify → task/model → output`，看到状态在场间流动。

## 完整代码

**`python-learning-agent/requirements.txt`**

```text
python-dotenv>=1.0.0
openai>=2.45,<3
pydantic>=2,<3
langchain>=1.3,<2
langchain-openai>=1.3,<2
langgraph>=1.2,<2
```

**`python-learning-agent/app/graph.py`**

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

from app.classifier import classify_message
from app.deepseek_client import DeepSeekClient
from app.task_parser import parse_task


class AgentState(TypedDict):
    """整张图共享的状态。"""
    messages: Annotated[list, add_messages]  # 自动追加新消息
    category: str
    reply: str


def classify_node(state: AgentState) -> dict:
    last = state["messages"][-1]
    category = classify_message(last.content)
    print(f"[节点] classify_node -> category={category}")
    return {"category": category}


def route(state: AgentState) -> str:
    """根据分类决定下一步走向。"""
    return "task" if state["category"] == "记录任务" else "model"


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
    print("[节点] model_node -> 调用 DeepSeek（带工具）")
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
    g.add_node("task", task_node)
    g.add_node("model", model_node)
    g.add_node("output", output_node)

    g.add_edge(START, "classify")
    g.add_conditional_edges("classify", route, {"task": "task", "model": "model"})
    g.add_edge("task", "output")
    g.add_edge("model", "output")
    g.add_edge("output", END)
    return g.compile()


def run_one(user_text: str, history=None):
    """运行一次图，返回最终状态（含 reply）。"""
    messages = list(history or [])
    messages.append({"role": "user", "content": user_text})
    graph = build_graph()
    return graph.invoke({"messages": messages})
```

**`python-learning-agent/main.py`**

```python
from typing import List
from app.classifier import create_message
from app.storage import load_messages, save_messages
from app.graph import run_one
from app.models import ChatMessage


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    history: List[ChatMessage] = load_messages()
    result = run_one(f"{name} 想学习：{topic}", history=history)

    reply = result["reply"]
    print(f"助手：{reply}")

    history.append(create_message("assistant", reply))
    save_messages(history)


if __name__ == "__main__":
    main()
```

> 其他文件（`classifier.py`、`storage.py`、`deepseek_client.py`、`models.py`、`langchain_client.py`、`task_parser.py`、`tools.py`、`.env.example`、`.gitignore`）沿用，无需改动。

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
今天想学什么：明天下班后学半小时字典
[节点] classify_node -> category=记录任务
[节点] task_node -> 解析为结构化任务
[节点] output_node -> reply 前 30 字：已记录任务：学半小时字典（优先…
助手：已记录任务：学半小时字典（优先级 中）
已保存 2 条消息到 data/conversations.json
```

> 若换个「查资料 / 普通聊天」类问题，你会看到 `classify → model → output` 的走向——条件路由生效了。

## 常见错误

**问题 A**：`ImportError: cannot import name 'add_messages' from 'langgraph.graph.message'`。

**排查**：`add_messages` 在 `langgraph.graph.message` 下。若你的版本路径不同，可改成 `from langgraph.graph import add_messages`（较新版本已提升到 `langgraph.graph`）。两种导入方式选其一即可。

**问题 B**：节点返回后状态没更新，或 `state["messages"]` 没追加 `assistant`。

**排查**：`messages` 字段必须用 `Annotated[list, add_messages]` 声明，LangGraph 才会把节点返回的 `{"messages": [...]}` **追加**进去；否则会被当作「覆盖」。

**问题 C**：条件路由报错 `Could not find key ... in path map`。

**排查**：`route(state)` 返回的字符串必须是 `add_conditional_edges` 第三个参数（path map）里的某个键。本例返回 `"task"` / `"model"`，path map 也正好有这两个键。

## 动手改一改

在 `build_graph` 里加一个 `greeting` 节点：当 `user_text` 只是「你好」时直接回「你好！今天想学点什么？」，不调模型。思考条件路由要怎么扩展才能覆盖三种分支（greeting / task / model）。

## 验收清单

- [ ] `app/graph.py` 定义了 `AgentState` 与 4 个节点 + `route`。
- [ ] 图能根据分类走不同分支（`task` / `model`），控制台打印节点进入顺序。
- [ ] `messages` 用 `add_messages` 正确追加，最终 `reply` 可用。
- [ ] `requirements.txt` 含 `langgraph`，安装成功。

## 今日记录

```text
今天跑通：用 LangGraph 把分类→分支→输出建成可观察的图
现在能解释：State/Node/Edge/START/END；条件路由靠 route 返回值选边
明天先做：Day 15 加 MemorySaver 与 thread_id，实现会话状态持久与隔离
```

## 留给明天的接口

留下 `build_graph()` 与 `run_one(user_text, history)`。Day 15 会给这张图加上 **`MemorySaver` 检查点**，并用 `thread_id` 区分不同会话——届时同一 `thread_id` 能延续上下文，换个 `thread_id` 则状态隔离。

## 官方参考链接

- LangGraph 快速开始：<https://docs.langchain.com/oss/python/langgraph/quickstart>
- LangGraph Graph API：<https://docs.langchain.com/oss/python/langgraph/graph-api>

> 阶段提示：Day 14 仍属「初级 Agent」阶段。图让流程「显式、可观察」，Day 15 再给它「记忆」。

<ProgressButton courseId="python-agent-course" dayId="day-14-langgraph-basics" />
