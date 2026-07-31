---
title: Day 5 把单文件变成小项目
---

# Day 5：把单文件变成小项目

> 今天把「一个 `main.py`」升级成「一个能 import 的小项目」。我们创建 `app/` 包，把分类器拆出去，并装好 `python-dotenv`（但**暂不接入真实 Key**——密钥要等到 Day 7 才用，且只从环境变量读取）。

## 今天完成什么

- 创建 `app/` 目录，把 `create_message` 和 `classify_message` 拆到 `app/classifier.py`。
- 创建虚拟环境，把 `python-dotenv` 写进 `requirements.txt` 并安装。
- 从 `main.py` 用 `from app.classifier import ...` 成功调用分类函数。

## 它接在昨天哪里

复用 Day 4 的两个函数，只是把它们从 `main.py` 搬到 `app/classifier.py`。`main.py` 变瘦，只保留「读输入 → 调用 → 打印」的组织逻辑。

## 概念解释

Python 的 `import` 相当于 JS 的 `import`：把另一个文件里的东西拿来用。一个带 `__init__.py` 的目录就是一个「包（package）」，可以 `from app.classifier import ...`。

虚拟环境（`venv`）相当于给这个项目单独准备的一套 `node_modules`：里面的包只属于这个项目，不会污染电脑上的其他 Python。

`requirements.txt` 相当于 `package.json` 的 `dependencies`：列出项目依赖和版本范围，别人用 `pip install -r requirements.txt` 一键装齐。

**类比的边界**：JS 的 `import` 默认「不写就不引入」；Python 的 `import` 是显式的，你写 `from app.classifier import create_message`，才真正把这个函数拉进来。另外 Python 没有「导出全部」的隐式行为，必须逐个具名导入或 `import app.classifier` 后用 `app.classifier.xxx`。

## 动手前的目录

```text
python-learning-agent/
└─ main.py   ← Day 4 状态，今天重构
```

## 分步实现

1. 新建 `app/` 目录，里面放一个空的 `__init__.py`，让它成为包。
2. 把两个函数移到 `app/classifier.py`。
3. 改写 `main.py`：删掉函数定义，改为 `from app.classifier import create_message, classify_message`。
4. 新建 `requirements.txt`，写入 `python-dotenv>=1.0.0`（Day 7 才会真正用到）。
5. 新建 `.env.example`（只放占位符）和 `.gitignore`（忽略 `.env`、`.venv/`、缓存）。
6. 建虚拟环境并安装依赖，运行验证。

## 完整代码

**`python-learning-agent/app/__init__.py`**

```python
# 让 app 成为一个可以被 import 的包。
```

**`python-learning-agent/app/classifier.py`**

```python
RESEARCH_KEYWORDS = ["查", "资料", "怎么", "如何", "什么是", "教程", "文档"]
TASK_KEYWORDS = ["记", "任务", "安排", "计划", "提醒", "todo"]


def create_message(role, content):
    """构造一条对话消息字典。"""
    return {"role": role, "content": content}


def classify_message(content):
    """把用户文本分类为 查资料 / 记录任务 / 普通聊天。"""
    text = content.lower()
    if any(keyword in text for keyword in RESEARCH_KEYWORDS):
        return "查资料"
    if any(keyword in text for keyword in TASK_KEYWORDS):
        return "记录任务"
    return "普通聊天"
```

**`python-learning-agent/main.py`**

```python
from app.classifier import create_message, classify_message


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    user_msg = create_message("user", f"{name} 想学习：{topic}")
    messages = [user_msg]

    category = classify_message(user_msg["content"])
    print(f"分类结果：{category}")

    messages.append(create_message("system", "你是一个耐心的中文编程学习助手。"))
    print(f"共 {len(messages)} 条消息已就绪，下一步将保存并调用模型。")


if __name__ == "__main__":
    main()
```

**`python-learning-agent/requirements.txt`**

```text
python-dotenv>=1.0.0
```

> 说明：`python-dotenv` 今天先装上但不使用。Day 7 我们会用 `from dotenv import load_dotenv` 读取 `.env` 里的 `DEEPSEEK_API_KEY`，密钥绝不写进代码。

**`python-learning-agent/.env.example`**

```text
DEEPSEEK_API_KEY=your_api_key_here
```

**`python-learning-agent/.gitignore`**

```text
.venv/
__pycache__/
.env
```

## 运行命令

```powershell
cd python-learning-agent
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

## 预期输出

```text
你的名字：小明
今天想学什么：怎么用字典保存消息
分类结果：查资料
共 2 条消息已就绪，下一步将保存并调用模型。
```

## 常见错误

**问题 A**：运行 `python main.py` 报 `ModuleNotFoundError: No module named 'app'`。

**排查**：必须在 `python-learning-agent/` 目录下运行，且不要把 `main.py` 移到 `app/` 里面。Python 会把「运行脚本所在目录」加入搜索路径，`from app.classifier import ...` 才能找到。若你用了 `python -m main` 方式，也要在项目根目录执行。

**问题 B**：PowerShell 激活虚拟环境时报「无法加载文件，因为在此系统上禁止运行脚本」。

**排查**：这是 Windows 执行策略限制。一次性运行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`，再重新执行 `.\.venv\Scripts\Activate.ps1` 即可。（仅当前用户生效，不影响系统安全。）

## 动手改一改

在 `app/` 里再建一个 `greeting.py`，定义一个 `say_hi(name)` 返回 `"你好，{name}！"`。在 `main.py` 里导入并在开头打印一句问候。感受「多文件项目」如何被组织成一棵导入树。

## 验收清单

- [ ] 项目根目录有 `app/__init__.py` 和 `app/classifier.py`。
- [ ] `main.py` 通过 `from app.classifier import ...` 调用成功，运行无 `ModuleNotFoundError`。
- [ ] `requirements.txt` 含 `python-dotenv`，且虚拟环境能装上。
- [ ] `.env.example` 只有占位符，没有任何真实 Key；`.gitignore` 忽略了 `.env`。

## 今日记录

```text
今天跑通：把单文件重构成 app/ 包，main.py 成功 import 分类器
现在能解释：包=带 __init__.py 的目录；venv 类似项目级 node_modules
明天先做：新增 storage.py，把 messages 存成 JSON 并能读回来（Day 6）
```

## 留给明天的接口

留下一个**稳定的项目结构**：根目录 `main.py` + `app/`（含 `classifier.py`）。Day 6 会在 `app/` 里新增 `storage.py`，提供 `load_messages()` 和 `save_messages()`，把 `messages` 持久化到 `data/conversations.json`。

<ProgressButton courseId="python-agent-course" dayId="day-05-project-setup" />
