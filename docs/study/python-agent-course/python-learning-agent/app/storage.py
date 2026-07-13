from pathlib import Path
import json

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_FILE = DATA_DIR / "conversations.json"


def save_messages(messages):
    """把对话列表写入 data/conversations.json。"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(
        json.dumps(messages, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_messages():
    """读取 data/conversations.json；文件不存在时返回空列表。"""
    if not DATA_FILE.exists():
        return []
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))
