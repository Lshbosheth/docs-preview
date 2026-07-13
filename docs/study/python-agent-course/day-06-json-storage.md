---
title: Day 6 把对话保存成 JSON
---

# Day 6：把对话保存成 JSON

> 今天是「普通 Python 程序」阶段的最后一天。我们新增 `app/storage.py`，用 `pathlib` / `json` / `with` 把 `messages` 持久化到 `data/conversations.json`。**仍然没有碰模型**——这一步只解决一件事：让程序自己负责保存对话，而不是指望某个模型服务替你存。

## 今天完成什么

- 创建 `app/storage.py`，实现 `load_messages()` 和 `save_messages()`。
- 用 `pathlib` 管理 `data/` 目录，把 `messages` 列表写入 `data/conversations.json`。
- 修改 `main.py`：启动时先 `load_messages()`（读回上次），结束时 `save_messages()`（存下本次）。

## 它接在昨天哪里

Day 5 的 `main.py` 已经生成了 `messages` 列表，但只打印了一句「已就绪，下一步将保存」。今天把它**真正落盘**：程序一开始就读回上一次的对话，结束时把这一次的全部消息写进 JSON 文件。

## 概念解释

- **`pathlib.Path`**：像 JS 里的 `path` 模块，但用 `/` 运算符拼路径，自动跨平台。例如 `Path("data") / "conversations.json"`。
- **`with open(...) as f`**：上下文管理器，离开 `with` 块时自动关文件，相当于 JS 里 `try { ... } finally { stream.close() }`。
- **`json.dumps` / `json.loads`**：字典 ↔ JSON 文本。`messages` 是 `list[dict]`，天然能被 JSON 序列化。

**类比的边界**：浏览器的 `localStorage` 是浏览器自动替你存、自动给你取。而这里是我们自己的 Python 代码**显式**读写磁盘文件。这一点很重要——后面接入 DeepSeek 后，模型服务是**无状态**的，它不会碰你的磁盘，更不会替你保存会话。持久化只能由你自己的程序做。

## 动手前的目录

```text
python-learning-agent/
├─ app/
│  ├─ __init__.py
│  └─ classifier.py
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. 在 `app/storage.py` 里用 `Path(__file__).resolve().parent.parent` 找到项目根，再拼出 `data/conversations.json`。
2. 实现 `save_messages(messages)`：确保 `data/` 存在，然后把列表写成格式化 JSON（`ensure_ascii=False` 保留中文）。
3. 实现 `load_messages()`：文件不存在就返回空列表 `[]`，否则读回并 `json.loads`。
4. 改写 `main.py`：开头 `messages = load_messages()`，结尾 `save_messages(messages)`。
5. 连跑两次，第二次能看到第一次存下的消息——这就是「程序负责持久化」的直观证据。

## 完整代码

**`python-learning-agent/app/storage.py`**

```python
from pathlib import Path
import json

# 项目根 / data / conversations.json
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
```

> 说明：这里用 `write_text` / `read_text` 配合 `with` 的语义一致，都是「自动开、自动关」。如果你更习惯经典写法，也可以写成 `with open(DATA_FILE, "w", encoding="utf-8") as f: json.dump(messages, f, ensure_ascii=False, indent=2)`，效果相同。

**`python-learning-agent/main.py`**

```python
from app.classifier import create_message, classify_message
from app.storage import load_messages, save_messages


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    # 先把上一次的对话读回来（没有就得到空列表）
    messages = load_messages()

    user_msg = create_message("user", f"{name} 想学习：{topic}")
    messages.append(user_msg)

    category = classify_message(user_msg["content"])
    print(f"分类结果：{category}")

    messages.append(create_message("system", "你是一个耐心的中文编程学习助手。"))

    # 保存到磁盘，下次启动还能读回来
    save_messages(messages)
    print(f"已保存 {len(messages)} 条消息到 data/conversations.json")


if __name__ == "__main__":
    main()
```

> 未改动的文件（`app/classifier.py`、`requirements.txt`、`.env.example`、`.gitignore`）沿用 Day 5，无需重写。

## 运行命令

```powershell
cd python-learning-agent
python main.py
```

> 若尚未激活虚拟环境，先 `.\.venv\Scripts\Activate.ps1`（PowerShell），再 `pip install -r requirements.txt`。这两步在 Day 5 已讲过。

## 预期输出

**第一次运行：**

```text
你的名字：小明
今天想学什么：怎么用字典保存消息
分类结果：查资料
已保存 2 条消息到 data/conversations.json
```

**第二次运行：**

```text
你的名字：小红
今天想学什么：装饰器是什么
分类结果：普通聊天
已保存 4 条消息到 data/conversations.json
```

注意第二次是 **4 条**：第一次的 2 条被 `load_messages()` 读回，又追加了本次的 2 条。这正是「保存是程序职责」的直接体现。如果你打开 `data/conversations.json`，会看到 4 个 `{ "role": ..., "content": ... }` 对象，中文正常显示。

## 常见错误

**问题 A**：JSON 里中文变成了 `\u4f60\u60f3...` 这种乱码。

**排查**：`json.dumps` 默认 `ensure_ascii=True`，会把非 ASCII 转义。写入时加 `ensure_ascii=False`，并且用 `write_text(..., encoding="utf-8")`；读回时对应 `read_text(encoding="utf-8")`，两者编码要配对。

**问题 B**：`FileNotFoundError: [Errno 2] No such file or directory: 'data/conversations.json'`。

**排查**：`load_messages()` 已经处理了「文件不存在返回 []」，所以报错通常出在别处。检查你是不是手动 `open(DATA_FILE)` 而不是先 `DATA_DIR.mkdir(parents=True, exist_ok=True)`。`save_messages` 里我们已经先建目录再写。

## 动手改一改

在 `storage.py` 里加一个 `append_message(msg)` 函数，只把一条消息追加到文件末尾（而不是每次重写整个列表）。思考两种策略的取舍：全量重写更简单、不怕顺序乱；追加写入更省 IO，但要自己处理「文件已存在但内容不完整」的情况。

## 验收清单

- [ ] `app/storage.py` 存在，提供 `load_messages()` 与 `save_messages()`。
- [ ] 连跑两次，第二次的消息总数 = 第一次的 2 倍（旧消息被读回又追加新消息）。
- [ ] `data/conversations.json` 是可读的 JSON，中文正常无 `\u` 转义。
- [ ] 全程没出现任何真实 API Key（Day 6 还不需要 Key）。

## 今日记录

```text
今天跑通：messages 落盘到 data/conversations.json，重启可续
现在能解释：保存是程序职责；模型服务无状态，不会替本地程序存会话
明天先做：Day 7 第一次调用 DeepSeek，把 messages 发给模型取回 assistant 消息
```

## 留给明天的接口

留下 `data/conversations.json` 以及 `storage.py` 的 `load_messages` / `save_messages`。Day 7 会新增 `app/deepseek_client.py`，把**同一个** `messages` 发给 DeepSeek，把返回的 `assistant` 消息 `append` 之后再 `save_messages`。届时你会发现：今天写的 `messages` 列表，明天就能原封不动地交给模型——这就是连续项目线的关键衔接点。

> 阶段提示：Day 1～6 都是「普通 Python 程序」——我们只做接收、分类、保存。从 Day 7 起进入「LLM 应用」阶段，程序才开始真正和外部模型对话。
