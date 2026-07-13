# python-learning-agent

「Python × DeepSeek Agent 实战课程」的最终项目：一个命令行 Python 学习助手。
它沿着 15 天连续项目线逐步长成，从「只会收数据的普通 Python 程序」走到「能选工具、有记忆的初级 Agent」。

## 它能做什么

1. 在终端接收学习问题或任务
2. 保存 `user` 与 `assistant` 消息到本地 JSON
3. 使用 DeepSeek 生成回复
4. 把自然语言需求整理成结构化学习任务（`LearningTask`）
5. 根据问题选择：直接回答 / 查日期 / 读本地学习记录
6. 用 LangGraph 管理节点、条件分支和会话状态
7. 用同一个 `thread_id` 延续对话，不同会话彼此隔离
8. API 调用失败时给出可理解的错误，且日志/输出不泄露 Key

## 三个阶段

| 阶段 | 能力 | 对应天数 |
| --- | --- | --- |
| 普通 Python 程序 | 接收、分类、保存数据 | Day 1～6 |
| LLM 应用 | 把消息发给模型并取得回复 | Day 7～12 |
| 初级 Agent | 模型能选择工具，程序维护状态和执行流程 | Day 13～15 |

## 安装与运行

```powershell
cd python-learning-agent
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

Copy-Item .env.example .env   # 然后编辑 .env 填入真实 DEEPSEEK_API_KEY
python main.py
```

运行本地测试：

```powershell
python -m pytest tests -q
```

## 目录结构

```text
python-learning-agent/
├─ .env.example
├─ .gitignore
├─ README.md
├─ requirements.txt
├─ main.py                  # 命令行程序入口
├─ data/
│  └─ notes.json            # 示例学习记录（工具只读）
├─ app/
│  ├─ __init__.py
│  ├─ models.py             # ChatMessage(TypedDict) / LearningTask(Pydantic)
│  ├─ classifier.py         # create_message / classify_message
│  ├─ storage.py            # load_messages / save_messages
│  ├─ deepseek_client.py    # DeepSeekClient.chat / chat_with_tools
│  ├─ tools.py              # get_current_date / read_learning_notes / TOOLS
│  ├─ langchain_client.py   # LangChain 写法对比
│  ├─ task_parser.py        # 自然语言 -> LearningTask
│  └─ graph.py              # LangGraph 图 + MemorySaver + thread_id
└─ tests/
   ├─ test_classifier.py
   └─ test_storage.py
```

## 安全约定

- API Key 只从 `.env` 的 `DEEPSEEK_API_KEY` 读取，绝不写进代码或日志。
- 工具只允许读取项目内示例文件（`data/notes.json`），不删除、不修改、不执行任意命令。
- 默认模型 `deepseek-v4-flash`，课程请求显式关闭思考模式；历史名称 `deepseek-chat` 和 `deepseek-reasoner` 将于 2026-07-24 15:59 UTC 弃用。
