---
title: Day 3 分类一条用户消息
---

# Day 3：分类一条用户消息

> 我们仍在「普通 Python 程序」阶段。今天的分类完全靠关键词规则，和模型无关——先把「读懂用户输入意图」这件事用纯 Python 做出来。

## 今天完成什么

- 根据关键词，把一条 `user` 消息分成「查资料 / 记录任务 / 普通聊天」三类。
- 至少测试三种不同输入，观察分类结果。
- 能解释：为什么这种基于关键词的分类可能不准确。

## 它接在昨天哪里

复用 Day 2 的 `messages` 列表，读取其中 `user` 消息的 `content` 文本来分类。昨天我们只是把消息存起来；今天开始「理解」它。

## 概念解释

`if / elif / else` 相当于 JS 的 `if / else if / else`：从上往下判断，命中第一个就结束。

`for` 循环用来遍历关键词列表，配合 `any(...)` 判断「列表里有没有某个关键词出现在文本中」。`any()` 是 Python 内置函数：只要可迭代对象里有一个为真，就返回 `True`。

**类比的边界**：Python 没有 JS 那种 `switch / case`（3.10+ 才有 `match`，本课前段不依赖它），多分支一律用 `if / elif / else`。另外 Python 用**缩进**决定代码块属于谁，不像 JS 用花括号 `{}`——缩进错了，程序逻辑就错了。

## 动手前的目录

```text
python-learning-agent/
└─ main.py   ← 今天修改
```

## 分步实现

1. 读取 `name`、`topic`，构造 `user` 消息和 `messages`（沿用 Day 2）。
2. 定义两个关键词列表：`RESEARCH_KEYWORDS`（查资料）、`TASK_KEYWORDS`（记录任务）。
3. 取 `user` 消息内容，转小写，避免大小写影响匹配。
4. 用 `any(...)` 依次判断：命中查资料关键词 → 「查资料」；否则命中任务关键词 → 「记录任务」；否则 → 「普通聊天」。
5. 打印分类结果，并追加 `system` 消息。

## 完整代码

**`python-learning-agent/main.py`**

```python
name = input("你的名字：")
topic = input("今天想学什么：")

user_message = {
    "role": "user",
    "content": f"{name} 想学习：{topic}",
}
messages = [user_message]

# 分类规则：关键词 → 类别
RESEARCH_KEYWORDS = ["查", "资料", "怎么", "如何", "什么是", "教程", "文档"]
TASK_KEYWORDS = ["记", "任务", "安排", "计划", "提醒", "todo"]

text = user_message["content"].lower()

if any(keyword in text for keyword in RESEARCH_KEYWORDS):
    category = "查资料"
elif any(keyword in text for keyword in TASK_KEYWORDS):
    category = "记录任务"
else:
    category = "普通聊天"

print(f"这条消息被分类为：{category}")

messages.append({"role": "system", "content": "你是一个耐心的中文编程学习助手。"})
```

## 运行命令

同一个程序跑三次，分别输入不同主题：

```powershell
cd python-learning-agent
python main.py
```

## 预期输出

第一次（偏查资料）：

```text
你的名字：小明
今天想学什么：怎么用字典保存消息
这条消息被分类为：查资料
```

第二次（偏记录任务）：

```text
你的名字：小明
今天想学什么：记一个任务：每天练半小时 Python
这条消息被分类为：记录任务
```

第三次（普通聊天）：

```text
你的名字：小明
今天想学什么：你好
这条消息被分类为：普通聊天
```

## 常见错误

**问题**：缩进报错 `IndentationError: unexpected indent`，或逻辑全跑到 `else` 里。

**排查**：Windows 上容易混用「空格」和「Tab」。在编辑器里把 Python 文件统一设为「用 4 个空格缩进、展开 Tab」。另一个坑：条件里写成 `=` 而不是 `==`（赋值 vs 比较），不过本例用的是 `in` 成员判断，不会踩这个，但以后写 `if x == 1` 时要留心。

## 动手改一改

现在的规则有个已知缺陷：输入「记一下怎么配置环境」同时含「记」和「怎么」，会被判成「查资料」（因为查资料先判断）。请在 10 分钟内想一个改进：比如同时命中两类时，优先「记录任务」，或者把「记一下怎么」这种组合单独处理。改完重跑三次验证。

## 验收清单

- [ ] 运行三次，分别得到「查资料 / 记录任务 / 普通聊天」三种结果。
- [ ] 能解释：分类基于关键词，可能不准确（例如同时含两类关键词时看判断顺序）。
- [ ] 知道 `any(...)` 表示「列表里至少有一个满足条件」。

## 今日记录

```text
今天跑通：用关键词把 user 消息分成三类，并测了三种输入
现在能解释：if/elif/else 用缩进分组；any() 表示至少一个命中
明天先做：把分类逻辑和造消息的逻辑，封装成可复用的函数
```

## 留给明天的接口

留下一套「可复用的分类规则」：两个关键词列表 + 先查资料、后任务、再兜底的判定顺序。Day 4 会把它搬进 `classify_message()` 函数，并新增 `create_message()` 函数。
