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
