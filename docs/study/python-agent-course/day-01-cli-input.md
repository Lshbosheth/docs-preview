---
title: Day 1 终端输入与学习记录
---

# Day 1：终端输入与学习记录

> 本篇是连续项目线的第 1 天。今天从零开始，最终留下变量 `user_text`，供 Day 2 包装成消息字典。目前我们处于「普通 Python 程序」阶段——还没有模型，也没有 Agent。

## 今天完成什么

- 用 `input()` 从终端读取「名字」和「今天想学什么」。
- 用变量和 f-string 拼出一条格式化的学习记录。
- 用 `print()` 把记录输出到终端。

## 它接在昨天哪里

这是第 1 天，没有昨天。今天建立项目的第一步，最终留下 `user_text`（以及构成它的 `name`、`topic`），Day 2 会把这段文本放进一个 `{"role": "user", "content": ...}` 字典里。

## 概念解释

把终端输入想象成网页里的 `<input>` 表单：用户在框里打字、按回车，浏览器把字符串交给 JS 函数；Python 里 `input("提示")` 做同样的事，按回车后把字符串交给你的变量。

**类比的边界**：网页输入通常通过事件回调触发（你敲字时程序可能正在做别的事）；而 `input()` 是「阻塞式」的——程序会停在这一行，什么都不做，直到你敲完回车才继续。没有事件循环，就是一条直线。

## 动手前的目录

今天只有一个文件，放在新建的 `python-learning-agent/` 目录下：

```text
python-learning-agent/
└─ main.py   ← 今天新建
```

## 分步实现

1. 用 `input("你的名字：")` 读取名字，存进变量 `name`。
2. 再用 `input("今天想学什么：")` 读取主题，存进 `topic`。
3. 用 f-string `f"{name} 正在学习：{topic}"` 拼成 `user_text`。
4. 用 `print()` 把这条记录输出到终端。

## 完整代码

**`python-learning-agent/main.py`**

```python
name = input("你的名字：")
topic = input("今天想学什么：")

user_text = f"{name} 正在学习：{topic}"

print("学习记录已生成：")
print(user_text)
```

## 运行命令

```powershell
cd python-learning-agent
python main.py
```

> 如果提示找不到 `python`，改用 `py main.py`；或者先运行 `python --version` / `py --version` 确认已安装 Python 3.11+。

## 预期输出

```text
你的名字：小明
今天想学什么：Python 的字典和列表
学习记录已生成：
小明 正在学习：Python 的字典和列表
```

（具体内容取决于你输入了什么；只要格式一致就说明跑通了。）

## 常见错误

**问题**：运行后窗口一闪而过，或提示 `'python' 不是内部或外部命令`。

**排查**：Windows 可能装了多个 Python，或安装时没勾选「Add Python to PATH」。先运行 `python --version`；若不行换 `py --version`，并把命令改成 `py main.py`。若 `py` 也不行，重新安装 Python 并勾选 PATH 选项。

## 动手改一改

把输出改成两行：第一行只写名字，第二行写 `今日主题：<topic>`。再在末尾加一行 `开始时间：<你手填的日期>`。不引入任何新语法，只用字符串拼接。

## 验收清单

- [ ] 能运行 `python main.py` 并看到两行提示。
- [ ] 输入内容后，`user_text` 正确包含了名字和主题。
- [ ] 能向别人解释：`input()` 和网页表单输入哪里相似、哪里不同。

## 今日记录

```text
今天跑通：从终端读入名字和主题，拼成一条学习记录
现在能解释：input() 是阻塞式读取，类似表单输入但要等回车
明天先做：把 user_text 包装成一条 user 消息字典
```

## 留给明天的接口

留下变量 `user_text`（以及 `name`、`topic`）。Day 2 会把这段文本包进一个 `{"role": "user", "content": ...}` 字典，并放进一个 `messages` 列表。
