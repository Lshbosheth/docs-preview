---
title: Python × DeepSeek Agent 实战课
---

# Python × DeepSeek Agent 实战课

这是一套 **15 天、约 3 周** 的连续实操课。它不把每天写成互不相关的例子，而是让你每天修改**同一个命令行学习助手**：前一天的产出，就是后一天的输入。
n<CourseProgressBar courseId="python-agent-course" :totalDays="15" />

> 配套的施工说明见：[Python × DeepSeek Agent 实战课程设计](/study/python-agent-course-design)。本课程的拆分方式、连续项目线和验收标准都来自那份设计。

## 课程说明

- **面向对象**：有前端开发经验、但 Python 较少的同学。
- **目标**：用最短路径补齐「阅读、运行、修改 LangChain / LangGraph 示例」所需的 Python，并最终做出一个带工具和状态的命令行小 Agent。
- **主线项目**：一个命令行「学习助手」，最终能接收问题、分类意图、调用 DeepSeek、读取本地记录、用 LangGraph 管理状态。
- **不做**：网页 UI、爬虫、数据分析、机器学习算法、复杂 Web 框架。

## 三个必须反复记住的概念

1. **消息从哪里来**：`user` 消息来自终端 `input()`；`assistant` 消息来自 DeepSeek 返回值；`system` 消息由你写死在代码里。保存消息的是 Python 程序，不是模型自动保存。
2. **模型调用 ≠ Agent**：能发消息给模型只是「LLM 应用」；让模型选择工具、程序维护状态和执行流程，才是「Agent」。Day 13 之前我们都在打普通 Python 程序的基础。
3. **DeepSeek 是无状态的**：多轮对话时，程序要把历史消息再次传给 API，模型不会自动记住之前聊过什么。

## 环境要求

- Python 3.11 或更高版本（Windows 下用 `python --version` 或 `py --version` 确认）。
- 一个终端（推荐 Windows PowerShell）。
- 一个代码编辑器（VS Code 即可）。
- 后续会用到 DeepSeek API Key（Day 7 才首次使用，且只从环境变量读取，绝不写进代码）。

## 最终项目目录（逐步演化，不要一次建完）

```text
python-learning-agent/
├─ .env.example
├─ .gitignore
├─ README.md
├─ requirements.txt
├─ main.py
├─ data/
│  └─ notes.json
├─ app/
│  ├─ __init__.py
│  ├─ models.py
│  ├─ classifier.py
│  ├─ storage.py
│  ├─ deepseek_client.py
│  ├─ langchain_client.py
│  ├─ task_parser.py
│  ├─ tools.py
│  └─ graph.py
└─ tests/
   ├─ test_classifier.py
   └─ test_storage.py
```

全部 15 天已完成，项目已演化到上方目录所示的完整形态（含 `app/` 下 8 个模块、`tests/` 与示例数据）。每个文件都是在前几天的基础上逐步新增的，文中每次拆分都会解释「为什么现在需要它」。

## 全部章节

**第一阶段：让消息在 Python 程序里流动**

- [Day 1 终端输入与学习记录](/study/python-agent-course/day-01-cli-input)
- [Day 2 把用户输入变成消息字典](/study/python-agent-course/day-02-message-dict)
- [Day 3 分类一条用户消息](/study/python-agent-course/day-03-message-classifier)
- [Day 4 把分类逻辑封装成函数](/study/python-agent-course/day-04-functions)
- [Day 5 把单文件变成小项目](/study/python-agent-course/day-05-project-setup)

**第二阶段：保存消息并取得真实模型回复**

- [Day 6 把对话保存成 JSON](/study/python-agent-course/day-06-json-storage)
- [Day 7 第一次调用 DeepSeek](/study/python-agent-course/day-07-deepseek-api)
- [Day 8 用类封装模型客户端](/study/python-agent-course/day-08-client-class)
- [Day 9 类型标注与结构化任务](/study/python-agent-course/day-09-types-pydantic)
- [Day 10 让 API 调用可恢复](/study/python-agent-course/day-10-errors-logging)

**第三阶段：从 LLM 应用走到小型 Agent**

- [Day 11 用 LangChain 表达模型与消息](/study/python-agent-course/day-11-langchain-chat)
- [Day 12 Prompt 与结构化输出](/study/python-agent-course/day-12-structured-output)
- [Day 13 让模型选择工具](/study/python-agent-course/day-13-tool-calling)
- [Day 14 用 LangGraph 串起流程](/study/python-agent-course/day-14-langgraph-basics)
- [Day 15 条件路由与会话状态](/study/python-agent-course/day-15-state-checkpoint)

每章都遵循统一结构：今天完成什么 → 它接在昨天哪里 → 概念解释 → 分步实现 → 完整代码 → 运行命令 → 预期输出 → 常见错误 → 动手改一改 → 验收清单 → 今日记录 → 留给明天的接口。
