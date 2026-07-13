---
title: Day 7 第一次调用 DeepSeek
---

# Day 7：第一次调用 DeepSeek

> 今天进入「LLM 应用」阶段。我们第一次把 `messages` 真正发给 DeepSeek，并取回一条 `assistant` 消息。**从今天起，你的程序不再是「自己玩数据」，而是开始和外部模型对话。** 安全是今天的第一原则：API Key 只能从环境变量读，绝不进代码、不进日志。

## 今天完成什么

- 安装 `openai` SDK，新增 `app/deepseek_client.py`，实现 `call_deepseek(messages)`。
- 用 `python-dotenv` 从 `.env` 读取 `DEEPSEEK_API_KEY`，缺失时给出明确提示而不是崩溃。
- 修改 `main.py`：调用模型得到 `assistant` 回复，打印并 `save_messages`。
- 跑通「终端输入 → user 消息 → DeepSeek → assistant 消息 → 保存 JSON」的完整链路。

## 它接在昨天哪里

Day 6 已经把 `messages` 落盘到 `data/conversations.json`，并且这个 `messages` 是标准 Chat Completions 结构（`role` + `content`）。Day 7 直接把**同一个** `messages` 喂给 DeepSeek——昨天为「持久化」做的准备，今天正好变成「发给模型的请求体」。

## 概念解释

- **环境变量**：相当于给程序运行时注入的配置，不在代码仓库里。Key 放 `.env`，`.env` 被 `.gitignore` 忽略，永远不会提交到 Git。
- **第三方 SDK（OpenAI 官方库）**：DeepSeek 提供 OpenAI 兼容接口，所以我们直接用 `openai` 这个库，只把 `base_url` 指向 DeepSeek 即可。
- **HTTP 请求**：`client.chat.completions.create(...)` 底层就是一次 HTTPS POST。你现在不需要懂 HTTP 细节，只要知道「我们发了一段 JSON 出去，拿回一段 JSON」。

**类比的边界**：前端 `fetch('/api/chat')` 是把请求发给「自己的后端」；这里 `client.chat.completions.create` 是把请求发给「DeepSeek 的服务器」。区别是：这一次，请求里**必须带 Key**（在 SDK 初始化时通过 `api_key` 传入，由 SDK 自动放到 `Authorization` 头），而 Key 来自环境变量，不是写死在代码里。

> ⚠️ **模型名与思考模式提醒**：本教程使用 `deepseek-v4-flash`，并在请求中显式关闭思考模式，让初学阶段的响应结构保持简单。历史名称 `deepseek-chat` 和 `deepseek-reasoner` 将于 **2026-07-24 15:59 UTC** 弃用，它们目前分别兼容映射到 `deepseek-v4-flash` 的非思考与思考模式。`deepseek-v4-pro` 是另一个模型，不是“思考模式”的别名。

## 动手前的目录

```text
python-learning-agent/
├─ app/
│  ├─ __init__.py
│  ├─ classifier.py
│  └─ storage.py
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. 在 `requirements.txt` 增加 `openai>=2.45,<3`，并 `pip install -r requirements.txt`。
2. 新建 `app/deepseek_client.py`：用 `load_dotenv()` 加载 `.env`，用 `os.getenv("DEEPSEEK_API_KEY")` 读 Key；Key 为空就抛出一个带说明的 `RuntimeError`。
3. 用 `OpenAI(api_key=..., base_url="https://api.deepseek.com")` 创建客户端，调用 `chat.completions.create(model="deepseek-v4-flash", messages=messages, timeout=30)`。
4. 改写 `main.py`：在存 `system` 消息之后调用 `call_deepseek(messages)`，把返回的字符串包成 `assistant` 消息 `append` 并保存。
5. 准备 `.env`（复制 `.env.example` 为 `.env` 并填入真实 Key），运行验证。

> 今天刻意把「创建 client、检查 key、发请求」都塞进一个 `call_deepseek` 函数里——职责还比较混合。这正是设计文档说的「能运行但职责较混合」，Day 8 我们会把它重构成清晰的类。

## 完整代码

**`python-learning-agent/requirements.txt`**

```text
python-dotenv>=1.0,<2
openai>=2.45,<3
```

**`python-learning-agent/.env.example`**（沿用 Day 5，仅补充说明）

```text
# DeepSeek API Key（必填）。去 https://platform.deepseek.com/api_keys 申请。
# 把本文件复制为 .env 后填入你的真实 Key，.env 已被 .gitignore 忽略，不会提交。
DEEPSEEK_API_KEY=your_api_key_here
```

**`python-learning-agent/app/deepseek_client.py`**

```python
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

MODEL = "deepseek-v4-flash"


def call_deepseek(messages):
    """把 messages 发给 DeepSeek，返回 assistant 的文本回复。"""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）")

    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        timeout=30,
        extra_body={"thinking": {"type": "disabled"}},
    )
    return response.choices[0].message.content
```

**`python-learning-agent/main.py`**

```python
from app.classifier import create_message, classify_message
from app.storage import load_messages, save_messages
from app.deepseek_client import call_deepseek


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    messages = load_messages()
    user_msg = create_message("user", f"{name} 想学习：{topic}")
    messages.append(user_msg)

    category = classify_message(user_msg["content"])
    print(f"分类结果：{category}")

    messages.append(create_message("system", "你是一个耐心的中文编程学习助手。"))

    # 第一次真正调用模型
    try:
        reply = call_deepseek(messages)
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

> `app/classifier.py`、`app/storage.py`、`.gitignore` 沿用 Day 5 / Day 6，无需改动。

## 运行命令

```powershell
cd python-learning-agent
# 复制环境变量模板并填入你的 Key（只需做一次）
Copy-Item .env.example .env
# 用记事本打开 .env，把 your_api_key_here 改成真实 Key 后保存
notepad .env

# 激活虚拟环境并安装新依赖
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 运行
python main.py
```

## 预期输出

**已配置 Key 时：**

```text
你的名字：小明
今天想学什么：怎么用字典保存消息
分类结果：查资料
助手：在 Python 里，字典（dict）用花括号 {...} 保存「键: 值」对……
已保存 4 条消息到 data/conversations.json
```

**未配置 Key（或 `.env` 里还是占位符）时：**

```text
你的名字：小明
今天想学什么：怎么用字典保存消息
分类结果：查资料
调用失败：缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）
```

> 注意：模型回复内容**具有不确定性**，每次运行可能不同，上面只是示意。重点看结构——你拿到了一条 `assistant` 消息，并把它存进了 JSON。

## 常见错误

**问题 A**：`ModuleNotFoundError: No module named 'openai'`。

**排查**：Day 7 新装了 `openai`，记得在虚拟环境里 `pip install -r requirements.txt`。如果用了多个终端窗口，确认当前窗口已激活 `.venv`。

**问题 B**：`openai.AuthenticationError: 401 ... Incorrect API key`。

**排查**：三种可能——(1) `.env` 里还是 `your_api_key_here` 没替换；(2) 忘了 `load_dotenv()`（已在 `deepseek_client.py` 顶部调用）；(3) Key 本身复制错了。Key 只来自环境变量，不要写进代码。

**问题 C**：把 Key 直接写进了 `deepseek_client.py`，例如 `api_key="sk-xxxx"`。

**排查**：立即停止这种做法。真实 Key 一旦提交到 Git 或贴到群里就泄露了。永远用 `os.getenv("DEEPSEEK_API_KEY")`，Key 只存在本地 `.env`（已被忽略）。

## 动手改一改

把请求里的 `thinking.type` 从 `"disabled"` 改成 `"enabled"` 再跑一次，观察响应耗时和结果变化。思考模式会额外返回 `reasoning_content`；本教程后续为了简化消息与工具调用流程，仍显式关闭它。

## 验收清单

- [ ] `requirements.txt` 含 `openai`，且 `pip install` 成功。
- [ ] `app/deepseek_client.py` 中 Key **只**来自 `os.getenv`，没有任何硬编码字符串 Key。
- [ ] 配置了 Key 时能拿到 `assistant` 回复并打印、保存。
- [ ] 没配置 Key 时给出友好提示而非崩溃或泄露 Key。
- [ ] `data/conversations.json` 里出现了 `role: "assistant"` 的消息。

## 今日记录

```text
今天跑通：把 messages 发给 DeepSeek，拿回 assistant 消息并存盘
现在能解释：API Key 只从环境变量读；模型返回的是 assistant 消息，不是程序自己编的
明天先做：Day 8 把散落的 API 调用重构成 DeepSeekClient 类，主流程不再关心 base_url
```

## 留给明天的接口

留下 `app/deepseek_client.py` 的 `call_deepseek(messages)`。它现在职责混合（建 client、检查 Key、发请求挤在一起），Day 8 会把它升级成 `DeepSeekClient` 类，提供清晰的 `chat(messages)` 方法——主流程从此只需 `client.chat(messages)`，不必再看见 `base_url`、`timeout` 这些细节。

## 官方参考链接

- DeepSeek 首次 API 调用：<https://api-docs.deepseek.com/>
- DeepSeek 多轮对话：<https://api-docs.deepseek.com/guides/multi_round_chat>

> 阶段提示：Day 7～12 是「LLM 应用」阶段——程序能调用模型并取得回复，但还没有「让模型自己决定下一步」的能力。
