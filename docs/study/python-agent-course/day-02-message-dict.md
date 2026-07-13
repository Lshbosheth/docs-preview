---
title: Day 2 把用户输入变成消息字典
---

# Day 2：把用户输入变成消息字典

> 关键提醒：今天所有消息都来自 `input()` 或你自己手写在代码里。本项目**要到 Day 7 才第一次出现由 DeepSeek 生成的 `assistant` 消息**。现在不存在「Agent 凭空生成消息」这回事。

## 今天完成什么

- 把 Day 1 的终端输入，手工包装成一条 `user` 消息字典。
- 把这条消息放进 `messages` 对话列表。
- 追加一条手工写的 `system` 消息，并打印每条消息的角色和内容。

## 它接在昨天哪里

复用 Day 1 的 `name` 和 `topic`（以及拼出的文本）。昨天它们只是被 `print` 出来；今天把它们结构化成字典，为后面「发给模型」做准备。

## 概念解释

Python 的 `dict`（字典）相当于 JavaScript 的普通对象 `{}`：都是「键 → 值」的映射，用 `数据["键"]` 取值。

**类比的边界**：JS 对象可以用点号 `obj.key` 取值，也可以加方法；Python 字典是纯数据容器，要用方括号 `msg["role"]`，而且（在 3.7+ 中）会保持你插入的顺序——这一点和「字典无序」的老说法不同，记住现在是有序的。

`messages` 列表相当于 JS 的数组 `[]`，用 `append()` 在末尾加元素，用 `len()` 看长度。

## 动手前的目录

```text
python-learning-agent/
└─ main.py   ← Day 1 已建，今天修改
```

## 分步实现

1. 沿用 `input()` 读入 `name`、`topic`。
2. 用 `{"role": "user", "content": ...}` 把文本包成一条 `user` 消息字典。
3. 把它放进 `messages = [user_message]`。
4. 打印 `messages[0]` 的角色和内容，确认结构正确。
5. 再手工写一条 `system` 消息（这是你写死在代码里的提示，不是模型生成），`append` 进列表。
6. 遍历列表，打印全部消息。

## 完整代码

**`python-learning-agent/main.py`**

```python
name = input("你的名字：")
topic = input("今天想学什么：")

# 把 Day 1 的终端输入，手工包装成一条 user 消息字典
user_message = {
    "role": "user",
    "content": f"{name} 想学习：{topic}",
}

# messages 是对话列表，目前只放一条
messages = [user_message]

print("当前对话里的消息：")
print(f"  角色 = {messages[0]['role']}")
print(f"  内容 = {messages[0]['content']}")

# 追加一条「系统消息」。注意：这是你自己写死在代码里的提示，
# 不是模型生成的，也不是 Agent 凭空产生的。
system_message = {
    "role": "system",
    "content": "你是一个耐心的中文编程学习助手。",
}
messages.append(system_message)

print(f"\n现在列表里共有 {len(messages)} 条消息：")
for msg in messages:
    print(f"  [{msg['role']}] {msg['content']}")
```

> 再次强调：上面没有任何一条消息来自模型。`user` 来自 `input()`，`system` 是你写的。真正的 `assistant` 消息要等 Day 7 接入 DeepSeek 之后才会出现。

## 运行命令

```powershell
cd python-learning-agent
python main.py
```

## 预期输出

```text
你的名字：小明
今天想学什么：Python 的字典和列表
当前对话里的消息：
  角色 = user
  内容 = 小明 想学习：Python 的字典和列表

现在列表里共有 2 条消息：
  [user] 小明 想学习：Python 的字典和列表
  [system] 你是一个耐心的中文编程学习助手。
```

## 常见错误

**问题**：写成 `messages[0].role` 或 `user_message.role`，运行时报 `AttributeError: 'dict' object has no attribute 'role'`。

**排查**：字典用方括号取值，不是点号。改成 `messages[0]["role"]` 和 `user_message["content"]`。这是从 JS 转过来最容易踩的坑。

## 动手改一改

在追加 `system` 消息之前，再加一条手工写的 `user` 消息，内容写「请问字典和列表有什么区别？」，然后打印列表长度，确认变成 3 条。体会一下：这些都是你手动造的消息，不是对话产生的。

## 验收清单

- [ ] 运行后能看到一条 `user` 和一条 `system` 消息。
- [ ] 能解释：现在的 `user` 消息来自 `input()`，而 `system` 消息是你手写在代码里的，两者都不是模型生成。
- [ ] 知道用 `msg["role"]` 而不是 `msg.role` 取字典的值。

## 今日记录

```text
今天跑通：把终端输入包成 user 消息字典，并放进 messages 列表
现在能解释：字典用方括号取值；现在还没有 assistant 消息
明天先做：根据消息内容，把它分成「查资料 / 记录任务 / 普通聊天」
```

## 留给明天的接口

留下 `messages` 对话列表（里面至少有一条 `user` 消息）。Day 3 会读取 `messages[0]["content"]` 的文本，按关键词给它分类。
