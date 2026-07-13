---
title: Python × DeepSeek Agent 实战课程设计
---

# Python × DeepSeek Agent 实战课程设计

> 本文不是正式教程，而是交给内容生成模型或编码 Agent 的课程施工说明。
> 正式教程应按本文拆成独立章节，放进 `docs/study/python-agent-course/`。

## 1. 为什么重新设计

原 15 天计划的方向没有问题，但部分练习只写了“当天产出”，没有解释输入从哪里来、产出会被谁使用。例如 Day 2 的“保存一条 Agent 消息”容易让初学者误以为消息已经由 Agent 生成。

实际上，那时只是在手工构造一条消息字典，用它练习 Python 的 `dict`。真正由模型生成的 `assistant` 消息，要等到接入 DeepSeek API 后才会出现；而“能生成一段回复”也还不等于 Agent，加入工具、状态和流程控制后，才逐渐形成 Agent。

新课程采用一条连续项目线：每天都修改同一个“命令行学习助手”，前一天的产出必须成为后一天的输入。

```text
终端输入
  → user 消息字典
  → messages 对话列表
  → JSON 本地记录
  → DeepSeek 生成 assistant 消息
  → LangChain 封装模型和 Prompt
  → 模型选择并调用工具
  → LangGraph 管理状态、分支和持久化
```

## 2. 学习者画像与边界

学习者已有前端开发经验，能理解变量、函数、数组、对象、异步请求和组件化，但 Python 经验较少。

- 总周期：15 个学习日，约 3 周
- 每天用时：45～60 分钟
- 主语言：Python 3.11 或更高版本
- 模型服务：DeepSeek API
- 最终形态：命令行学习助手，不做网页 UI
- 学习策略：只补完成 Agent 项目所需的 Python，不扩展成完整 Python 基础课

暂不展开爬虫、数据分析、机器学习算法、复杂 Web 框架、GUI、元类和刷题型算法。

## 3. 最终项目

项目名建议为 `python-learning-agent`，最终支持：

1. 在终端接收学习问题或任务。
2. 保存 `user` 与 `assistant` 消息。
3. 使用 DeepSeek 生成回复。
4. 把自然语言需求整理成结构化学习任务。
5. 根据问题选择直接回答、查看日期或读取本地学习记录。
6. 使用 LangGraph 管理节点、条件分支和会话状态。
7. 使用同一个 `thread_id` 延续对话。
8. API 调用失败时给出可理解的错误，不泄露 API Key。

建议最终目录如下：

```text
python-learning-agent/
├─ .env.example
├─ .gitignore
├─ README.md
├─ requirements.txt
├─ data/
│  └─ conversations.json
├─ app/
│  ├─ __init__.py
│  ├─ main.py
│  ├─ models.py
│  ├─ classifier.py
│  ├─ storage.py
│  ├─ deepseek_client.py
│  ├─ tools.py
│  └─ graph.py
└─ tests/
   ├─ test_classifier.py
   └─ test_storage.py
```

前几天不应一次性创建全部文件。目录要随着课程逐步演化，每次新增文件时解释“为什么现在需要拆分”。

## 4. 三个概念必须讲清楚

### 4.1 消息从哪里来

课程中统一使用接近 Chat Completions 的消息结构：

```python
{
    "role": "user",
    "content": "帮我安排今天的 Python 学习任务",
}
```

- `user` 消息来自终端的 `input()`。
- `assistant` 消息来自 DeepSeek API 的返回值。
- `system` 消息由程序作者编写，用于规定模型的角色和行为。
- 保存消息的是 Python 程序，不是模型自动保存。

### 4.2 模型调用不等于 Agent

课程应持续区分三个阶段：

| 阶段 | 能力 | 本课程出现位置 |
| --- | --- | --- |
| 普通 Python 程序 | 接收、分类、保存数据 | Day 1～6 |
| LLM 应用 | 把消息发给模型并取得回复 | Day 7～12 |
| 初级 Agent | 模型能选择工具，程序维护状态和执行流程 | Day 13～15 |

### 4.3 DeepSeek API 是无状态的

多轮对话时，程序需要把必要的历史消息再次传给 API。不要写成“DeepSeek 会自动记住之前的聊天”。课程需要用 `messages` 列表和本地 JSON 亲手演示这一点。

DeepSeek 当前提供 OpenAI 兼容接口。生成教程时必须再次核对官方文档中的模型名称和参数，不要依赖记忆硬编码已经过期的模型名：

- [DeepSeek：首次 API 调用](https://api-docs.deepseek.com/)
- [DeepSeek：多轮对话](https://api-docs.deepseek.com/guides/multi_round_chat)
- [DeepSeek：Tool Calls](https://api-docs.deepseek.com/guides/tool_calls)

## 5. 15 天连续课程蓝图

### 第一阶段：让消息在 Python 程序里流动

#### Day 1：终端输入与学习记录

- Python 对照：变量、字符串、`input()`、`print()`、f-string
- 前端类比：浏览器表单输入与控制台输出
- 项目变化：创建 `main.py`，读取名字和学习主题
- 当天闭环：输入内容，输出一条格式化学习记录
- 为下一天留下：变量 `user_text`

#### Day 2：把用户输入变成消息字典

- Python 对照：`dict`、`list`、`tuple`、`set` 的不同用途
- 重点：不是“凭空保存 Agent 消息”，而是把 Day 1 的终端输入包装成 `user` 消息
- 项目变化：创建 `message` 字典，再放进 `messages` 列表
- 当天闭环：打印角色和内容，追加第二条手工消息
- 为下一天留下：`messages` 对话列表

#### Day 3：分类一条用户消息

- Python 对照：`if / elif / else`、`for`、成员判断
- 项目变化：根据关键词分类为“查资料”“记录任务”“普通聊天”
- 当天闭环：至少测试三种输入，并解释分类为什么可能不准确
- 为下一天留下：可复用的分类规则

#### Day 4：把分类逻辑封装成函数

- Python 对照：函数、参数、返回值、默认值、作用域
- 项目变化：实现 `classify_message(content)` 和 `create_message(role, content)`
- 当天闭环：主流程只负责组织调用，不再堆分类细节
- 为下一天留下：可导入的函数

#### Day 5：把单文件变成小项目

- Python 对照：模块、`import`、虚拟环境、`pip`、依赖文件
- 项目变化：创建 `app/`，把分类器拆到 `classifier.py`
- 安装：`python-dotenv`，但暂时不使用真实 Key
- 当天闭环：从 `main.py` 成功导入并调用分类函数
- 为下一天留下：稳定的项目结构

### 第二阶段：保存消息并取得真实模型回复

#### Day 6：把对话保存成 JSON

- Python 对照：`pathlib`、`with`、文件读写、`json`
- 项目变化：新增 `storage.py`，实现 `load_messages()` 和 `save_messages()`
- 当天闭环：运行两次程序，第二次能读取第一次保存的消息
- 必讲：程序负责持久化，模型服务不会替本地程序保存完整会话
- 为下一天留下：可以直接发送给模型的 `messages`

#### Day 7：第一次调用 DeepSeek

- Python 对照：环境变量、第三方 SDK、对象属性、HTTP 请求基本概念
- 项目变化：新增 `.env.example`、`.gitignore` 和 `deepseek_client.py`
- 调用链：终端输入 → `user` 消息 → DeepSeek → `assistant` 消息 → 保存 JSON
- 安全要求：只能从 `DEEPSEEK_API_KEY` 环境变量读取 Key；任何示例和日志都不能出现真实 Key
- 当天闭环：真正获得一条模型回复，并打印、保存 `assistant` 消息
- 为下一天留下：一段能运行但职责还较混合的 API 调用代码

#### Day 8：用类封装模型客户端

- Python 对照：`class`、`__init__`、实例属性、实例方法
- 项目变化：实现 `DeepSeekClient.chat(messages)`
- 前端类比：把请求配置和调用方法封装成 service/client
- 当天闭环：替换 Day 7 的散落调用，主流程不再关心 `base_url` 等细节
- 为下一天留下：清晰的客户端接口

#### Day 9：类型标注与结构化任务

- Python 对照：`list[str]`、`Literal`、`TypedDict`、Pydantic
- 项目变化：定义 `ChatMessage` 与 `LearningTask`
- 当天闭环：把标题、优先级、完成状态校验成固定结构
- 必讲：普通消息字典、Pydantic 数据模型与模型输出是三件不同的事
- 为下一天留下：可验证的输入输出边界

#### Day 10：让 API 调用可恢复

- Python 对照：`try / except / finally`、超时、日志；只解释必要的 `async / await`
- 项目变化：处理缺少 Key、网络失败、限流、返回空内容等情况
- 当天闭环：故意制造一次失败，用户能看到明确提示，日志中没有 Key
- 为下一天留下：可靠的模型调用层

### 第三阶段：从 LLM 应用走到小型 Agent

#### Day 11：用 LangChain 表达模型与消息

- 内容：Chat Model、System/Human/AI 消息、同步与流式输出
- 项目变化：在保留原生 DeepSeek 调用的前提下，新增 LangChain 版本用于对比
- 当天闭环：同一个输入分别看懂“原生 SDK 写法”和“LangChain 写法”
- 必讲：LangChain 是封装层，不是另一个模型

#### Day 12：Prompt 与结构化输出

- 内容：Prompt Template、输入变量、Pydantic 约束、解析失败
- 项目变化：把自然语言需求整理成 `LearningTask`
- 当天闭环：输入“明天下班后学半小时字典”，得到固定任务结构
- 为下一天留下：模型可以产出程序能继续处理的数据

#### Day 13：让模型选择工具

- 内容：工具定义、参数 Schema、Tool Call 与真正执行的区别
- 项目变化：实现 `get_current_date` 和 `read_learning_notes` 两个安全的本地工具
- 当天闭环：模型决定是否调用工具，Python 负责执行，再把结果交回模型
- 必讲：模型提出调用意图，程序才拥有实际执行权

#### Day 14：用 LangGraph 串起流程

- 内容：State、Node、Edge、START、END
- 项目变化：实现“接收问题 → 分类 → 直接回答或调用模型 → 输出”的图
- 当天闭环：打印每个节点的进入顺序以及状态变化
- 为下一天留下：显式、可观察的执行图

#### Day 15：条件路由与会话状态

- 内容：Conditional Edge、工具分支、Checkpoint、`thread_id`
- 项目变化：完成“直接回答 / 模型回答 / 工具调用”路由并延续同一线程
- 当天闭环：连续问两个有关联的问题；再换一个 `thread_id`，观察状态隔离
- 最终验收：完成第 3 节列出的最小项目能力

## 6. 每章必须采用的写作结构

正式教程的每个 Day 都必须独立成文，并严格包含：

1. **今天完成什么**：只列 2～3 个可验证目标。
2. **它接在昨天哪里**：展示昨天留下的变量、文件或函数。
3. **概念解释**：用前端类比帮助理解，但同时说明类比的边界。
4. **动手前的目录**：展示本章开始时的相关文件。
5. **分步实现**：每次只增加一个概念，代码片段必须能组合成最终文件。
6. **完整代码**：给出本章结束时所有新增或修改文件的完整内容。
7. **运行命令**：Windows PowerShell 优先，必要时补充通用命令。
8. **预期输出**：示例输出不能伪装成真实运行结果。
9. **常见错误**：至少包含一个初学者高概率遇到的问题及排查方法。
10. **动手改一改**：一个 10～15 分钟的小练习，不引入下一天的新知识。
11. **验收清单**：使用 Markdown checkbox，必须可实际验证。
12. **今日记录**：保留“今天跑通 / 现在能解释 / 明天先做”三行模板。
13. **留给明天的接口**：明确指出下一章会复用什么，不能突然换项目。

每章正文建议 1,500～2,500 个中文字。避免为了达到字数重复解释。

## 7. 代码与安全规范

- 所有 Python 代码优先采用容易读懂的直接写法，不提前炫技。
- 每个代码块注明文件路径；完整文件不得用 `...` 省略关键代码。
- Windows 命令使用 PowerShell，不混用 Bash 的 `export`。
- 使用 `.env` 时必须同时提供 `.env.example` 和 `.gitignore`。
- `.env.example` 只能包含 `DEEPSEEK_API_KEY=your_api_key_here` 一类占位符。
- 不在代码、URL、报错、截图或日志中展示真实 API Key。
- 网络调用设置合理超时；异常信息面向学习者，不直接吞掉异常。
- 依赖版本需要在生成教程时核对，不凭空编造不存在的 API。
- 模型输出具有不确定性，预期输出应注明“内容可能不同”。
- 工具只允许读取课程项目内的示例文件，不设计删除、执行任意命令等高风险工具。

## 8. 文档站落地结构

HY2 应创建以下文件，而不是把全部课程继续堆进本设计文档：

```text
docs/study/python-agent-course/
├─ index.md
├─ day-01-cli-input.md
├─ day-02-message-dict.md
├─ day-03-message-classifier.md
├─ day-04-functions.md
├─ day-05-project-setup.md
├─ day-06-json-storage.md
├─ day-07-deepseek-api.md
├─ day-08-client-class.md
├─ day-09-types-pydantic.md
├─ day-10-errors-logging.md
├─ day-11-langchain-chat.md
├─ day-12-structured-output.md
├─ day-13-tool-calling.md
├─ day-14-langgraph-basics.md
└─ day-15-state-checkpoint.md
```

`index.md` 应包含课程说明、环境要求、进度表、最终目录和各章节链接。生成完课程后，还要把课程首页和 15 章加入 VitePress 侧边栏。

建议分批生成和验收：

1. 先生成 `index.md`、Day 1～5，执行文档构建。
2. 再生成 Day 6～10，重点检查 DeepSeek 示例和密钥安全。
3. 最后生成 Day 11～15，重点检查 LangChain/LangGraph API 是否与当前版本一致。
4. 全部完成后运行 `npm run docs:build`，修复死链和 Markdown 构建错误。

## 9. 交给腾讯 HY2 的执行指令

把下面整段连同本仓库交给 HY2：

```text
你正在维护一个 VitePress 文档站。请完整阅读：
docs/study/python-agent-course-design.md

你的任务是按照设计文档生成“Python × DeepSeek Agent 15 天实战课”，并直接写入当前仓库。

执行要求：
1. 严格按照设计中的连续项目线，不把每天写成互不相关的示例。
2. 先检查 package.json、docs/.vitepress/config.ts 和现有 Markdown 风格。
3. 按“文档站落地结构”创建课程首页与 15 篇独立教程。
4. 每章必须包含设计文档第 6 节规定的全部栏目，并给出本章结束时的完整代码。
5. Day 2 必须明确消息来自 input()，不是 Agent 凭空生成。
6. Day 7 才首次产生 DeepSeek 返回的 assistant 消息；必须用环境变量保护 API Key。
7. Day 13 之前持续区分普通 Python 程序、LLM 应用和 Agent。
8. 涉及 DeepSeek、OpenAI SDK、LangChain、LangGraph 时，先查其当前官方文档，只采用当前有效 API；在相关文章末尾列出官方参考链接。
9. 主要面向 Windows PowerShell 环境，命令必须能够复制执行。
10. 更新 docs/.vitepress/config.ts，将课程首页和 15 章加入“学习”侧边栏。
11. 不覆盖用户已有的无关改动，不写入或展示任何真实 API Key。
12. 完成后运行 npm run docs:build，修复由本次修改造成的错误。

先完成 index.md 和 Day 1～5，构建通过后汇报本批新增文件、验证结果和下一批计划。不要在第一批提前生成 Day 6～15。
```

## 10. 内容验收标准

每批生成后，应从学习者视角检查：

- 能否解释本章输入从哪里来、输出交给谁。
- 只复制本章完整代码，能否得到描述的结果。
- 是否使用了尚未讲解的语法；如不可避免，是否先做了最小解释。
- 相比上一章，是否只增加了有限的新复杂度。
- 是否明确区分手工消息、模型消息、保存行为和 Agent 行为。
- 是否能在 45～60 分钟内完成正文学习与练习。
- 所有页面是否能从课程首页或侧边栏访问。
- 文档站能否通过 `npm run docs:build`。

课程不是以“讲完 15 个标题”为完成，而是以学习者能够独立运行、解释和小幅修改最终项目为完成。
