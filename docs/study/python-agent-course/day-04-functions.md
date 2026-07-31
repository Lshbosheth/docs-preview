---
title: Day 4 把分类逻辑封装成函数
---

# Day 4：把分类逻辑封装成函数

> 今天仍然没有模型。我们要把 Day 3 堆在主流程里的细节，收进两个函数里，让主流程只负责「组织调用」。这一步是后面能被 `import` 复用的关键。

## 今天完成什么

- 实现 `create_message(role, content)`：构造一条消息字典。
- 实现 `classify_message(content)`：把文本分类。
- 主流程只调用这两个函数，不再堆分类细节。
- 用 `if __name__ == "__main__":` 包裹入口，让文件既能被运行、也能被导入。

## 它接在昨天哪里

复用 Day 3 的两个关键词列表和判定顺序，但把它们从主流程搬到函数体里。昨天 `main.py` 一打开就是分类细节；今天打开只看到「读输入 → 造消息 → 分类 → 打印」四步。

## 概念解释

`def` 定义函数，相当于 JS 的 `function`。`return` 把结果交回去，调用方用变量接住。函数可以有默认值参数（如 `def f(x, y=0)`），但我们今天用不到复杂默认值。

**作用域的边界**：Python 没有 JS 那种「块级作用域」——`if`、`for` 里定义的变量，在外面也能访问。但函数内部赋值的变量是**局部**的，函数外访问不到（除非用 `global`，我们不推荐新手用）。所以把逻辑收进函数，反而更干净、更易测。

`if __name__ == "__main__":` 是 Python 的惯例：`main.py` 被直接运行时，`__name__` 等于 `"__main__"`，里面的代码会执行；当它被别的文件 `import` 时，这部分不会自动跑——这正是 Day 5 要利用的特性。

## 动手前的目录

```text
python-learning-agent/
└─ main.py   ← 今天重构
```

## 分步实现

1. 在文件顶部定义两个关键词列表（模块级常量）。
2. 定义 `create_message(role, content)`，返回 `{"role": role, "content": content}`。
3. 定义 `classify_message(content)`，把 Day 3 的分类代码搬进来并返回类别字符串。
4. 定义 `main()`，组织：读输入 → 造 `user` 消息 → 分类 → 打印 → 追加 `system` 消息。
5. 用 `if __name__ == "__main__": main()` 作为入口。

## 完整代码

**`python-learning-agent/main.py`**

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


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    user_msg = create_message("user", f"{name} 想学习：{topic}")
    messages = [user_msg]

    category = classify_message(user_msg["content"])
    print(f"分类结果：{category}")

    messages.append(create_message("system", "你是一个耐心的中文编程学习助手。"))
    print(f"共 {len(messages)} 条消息。")


if __name__ == "__main__":
    main()
```

## 运行命令

```powershell
cd python-learning-agent
python main.py
```

## 预期输出

```text
你的名字：小明
今天想学什么：怎么用字典保存消息
分类结果：查资料
共 2 条消息。
```

## 常见错误

**问题**：把函数返回值没接住，例如写成 `classify_message(user_msg["content"])` 却没赋值给 `category`，下一行打印 `category` 时报 `NameError`。

**排查**：函数有 `return` 不代表结果会自动出现在外面的变量里，必须 `category = classify_message(...)` 显式接住。另一个坑：写成 `classify_message` 忘了加 `()`，那只是「函数对象」本身，不会执行。

## 动手改一改

给 `create_message` 加第三个可选参数 `created_at=None`，当传入时间字符串时，把 `"created_at": created_at` 也写进字典。主流程里传一个手填的时间。体会「可选参数」如何在不破坏旧调用的前提下扩展函数。

## 验收清单

- [ ] 运行后分类结果正确，主流程读起来只有四步。
- [ ] 能解释：`return` 的结果必须被变量接住，函数外才能用。
- [ ] 知道 `if __name__ == "__main__":` 让文件「能跑也能被导入」。

## 今日记录

```text
今天跑通：把造消息和分类收进 create_message / classify_message 两个函数
现在能解释：return 要被接住；__name__ 守卫让文件可导入
明天先做：把这两个函数拆到独立的 app/classifier.py，做成可导入的模块
```

## 留给明天的接口

留下两个**可导入的函数** `create_message` 和 `classify_message`。Day 5 会把它们搬进 `app/classifier.py`，由 `main.py` 通过 `from app.classifier import ...` 调用。

<ProgressButton courseId="python-agent-course" dayId="day-04-functions" />
