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
