---
title: Day 10 让 API 调用可恢复
---

# Day 10：让 API 调用可恢复

> 真实世界里模型调用会失败：Key 错了、网络抖了、被限流了、模型返回空。今天给 `DeepSeekClient.chat` 加上 `try / except`、超时与日志，把「底层异常」翻译成「学习者看得懂的提示」，并保证日志里**绝不出现 Key**。

## 今天完成什么

- 在 `app/deepseek_client.py` 的 `chat` 中捕获 `AuthenticationError` / `RateLimitError` / `APITimeoutError` / `APIConnectionError`，各给一句中文提示。
- 处理「模型返回空内容」的情况（空字符串也视为失败）。
- 接入 `logging`，记录调用过程；确认日志里不含 API Key。
- 故意制造一次失败，验证用户能看到明确提示而非一堆堆栈。

## 它接在昨天哪里

Day 9 留下干净的 `DeepSeekClient.chat(messages)`。今天不新增文件，只在 `chat` 内部加「错误处理 + 日志」这一层——对外接口不变，`main.py` 依旧只 `client.chat(messages)` 并 `except RuntimeError`。

## 概念解释

- **`try / except / finally`**：把「可能出错的代码」放在 `try`，出错时跳到 `except` 处理；`finally` 里的代码无论成败都会执行（适合「关资源」）。这对应 JS 的 `try { } catch { } finally { }`，几乎一致。
- **超时（timeout）**：给网络请求设一个最长时间，超过就放弃，避免程序卡死。
- **日志（logging）**：比 `print` 更规范地记录运行状态，可分级（INFO / WARNING / ERROR）。注意：日志可能被人看到，**绝不能把 Key 写进日志**。
- **`async / await`（仅了解）**：`openai` 库还提供 `AsyncOpenAI`，对应 `await client.chat.completions.create(...)`，适合并发或异步框架（如 FastAPI）。本命令行程序用同步 `OpenAI` 已足够，先不引入 `async/await`，免得把「模型调用」和「并发语法」两件事混在一起。

## 动手前的目录

```text
python-learning-agent/
├─ app/
│  ├─ __init__.py
│  ├─ classifier.py
│  ├─ storage.py
│  └─ deepseek_client.py   ← 今天改造 chat 内部
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. 在 `deepseek_client.py` 顶部导入 `logging` 以及 `openai` 的几个异常类。
2. 配置一个模块级 `logger`，`basicConfig` 设成 `INFO` 级别、带时间格式。
3. 在 `chat` 里用 `try` 包住 `create(...)`，按异常类型分别 `raise RuntimeError("中文提示")`。
4. 取回 `content` 后判断「为空」也算失败。
5. 故意制造失败（清空 `.env` 的 Key / 断网 / 把 `timeout` 设极小）验证提示友好、日志无 Key。

## 完整代码

**`python-learning-agent/app/deepseek_client.py`**

```python
import os
import logging
from openai import OpenAI
from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    RateLimitError,
)
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("deepseek")

MODEL = "deepseek-v4-flash"
BASE_URL = "https://api.deepseek.com"


class DeepSeekClient:
    """对 DeepSeek 调用的薄封装，对外只暴露 chat(messages)。"""

    def __init__(self, model=MODEL, timeout=30):
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise RuntimeError(
                "缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）"
            )
        self.model = model
        self.timeout = timeout
        self._client = OpenAI(api_key=api_key, base_url=BASE_URL)

    def chat(self, messages):
        logger.info("正在调用 DeepSeek，消息条数=%d", len(messages))
        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                timeout=self.timeout,
                extra_body={"thinking": {"type": "disabled"}},
            )
        except AuthenticationError:
            raise RuntimeError("API Key 无效（401）。请检查 .env 中的 DEEPSEEK_API_KEY。")
        except RateLimitError:
            raise RuntimeError("请求过于频繁，被限流（429）。请稍等几秒再试。")
        except APITimeoutError:
            raise RuntimeError("请求超时，模型未在限定时间内回应。请检查网络或调大 timeout。")
        except APIConnectionError as e:
            raise RuntimeError(f"网络连接失败：{e}")
        except Exception:
            logger.exception("DeepSeek 调用出现未预期错误")
            raise RuntimeError("调用 DeepSeek 时发生未知错误，请查看日志。")

        content = response.choices[0].message.content
        if not content or not content.strip():
            raise RuntimeError("模型返回了空内容，请重试一次。")
        logger.info("DeepSeek 调用成功，回复长度=%d", len(content))
        return content
```

**`python-learning-agent/main.py`**（沿用 Day 9，仅提示信息更具体）

```python
from typing import List
from app.classifier import create_message, classify_message
from app.storage import load_messages, save_messages
from app.deepseek_client import DeepSeekClient
from app.models import ChatMessage, LearningTask


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    messages: List[ChatMessage] = load_messages()
    user_msg = create_message("user", f"{name} 想学习：{topic}")
    messages.append(user_msg)

    category = classify_message(user_msg["content"])
    print(f"分类结果：{category}")

    messages.append(create_message("system", "你是一个耐心的中文编程学习助手。"))

    client = DeepSeekClient()
    try:
        reply = client.chat(messages)
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

> `app/classifier.py`、`app/storage.py`、`app/models.py`、`.env.example`、`.gitignore`、`requirements.txt` 均沿用，无需改动。

## 运行命令

```powershell
cd python-learning-agent
.\.venv\Scripts\Activate.ps1
python main.py
```

## 预期输出

**正常时**（同 Day 9，略）。

**故意制造失败——把 `.env` 里的 Key 改成明显错误的值后运行：**

```text
你的名字：小明
今天想学什么：Python 的生成器是什么
分类结果：普通聊天
调用失败：API Key 无效（401）。请检查 .env 中的 DEEPSEEK_API_KEY。
```

> 注意：程序没有崩溃、没有抛出一大串英文堆栈，而是用一句中文说明问题。日志里只有「消息条数」「调用成功」这类信息，**没有任何 Key 的影子**。

## 常见错误

**问题 A**：`except` 顺序写反，具体异常被笼统的 `except Exception` 先接走，提示不够精确。

**排查**：Python 的 `except` 按顺序匹配。把 `AuthenticationError` / `RateLimitError` 等**具体**异常放在前面，通用的 `except Exception` 放最后。

**问题 B**：为了「调试」写了 `logger.info(f"api_key={api_key}")`。

**排查**：绝对禁止！Key 一旦进日志就可能泄露。本教程所有日志只记录「消息条数、调用结果」等无害信息。`api_key` 只在 `__init__` 局部使用，从不写入日志或打印。

**问题 C**：捕获异常后 `return None` 却忘了处理，下游 `messages.append(create_message("assistant", reply))` 报 `TypeError`。

**排查**：异常已经在 `chat` 内部被转成 `RuntimeError` 抛出，`main.py` 必须 `except RuntimeError` 并在失败分支 `return`，不要再往下走。Day 9 的结构已经这样做了。

## 动手改一改

把 `DeepSeekClient` 的 `__init__` 加上 `max_retries=2`（OpenAI 客户端自带重试参数：`OpenAI(..., max_retries=max_retries)`），观察限流时 SDK 是否会自动重试。思考：自动重试解决「偶发限流」，但解决不了「Key 错误」——所以异常分类仍然必要。

## 验收清单

- [ ] `chat` 能区分「Key 无效 / 限流 / 超时 / 网络失败 / 空内容」并给中文提示。
- [ ] 日志使用 `logging`，且其中**不包含**任何 API Key。
- [ ] 故意制造一次失败，程序给出明确提示而非崩溃堆栈。
- [ ] `main.py` 用 `except RuntimeError` 安全兜底，失败时不继续执行下游。

## 今日记录

```text
今天跑通：给模型调用加 try/except/超时/日志，失败可恢复
现在能解释：具体异常放前面、通用 Exception 放最后；日志绝不写 Key
明天先做：Day 11 用 LangChain 表达模型与消息，和原生 SDK 写法做对比
```

## 留给明天的接口

留下可靠的 `DeepSeekClient.chat(messages)` 调用层：它会区分失败类型、给中文提示、保证日志无 Key。Day 11 会在**保留这个原生客户端**的前提下，新增一个 LangChain 版本的调用，用来对比「原生 SDK 写法」和「LangChain 写法」——两者最终都是把 `messages` 发给同一个 DeepSeek。

## 官方参考链接

- DeepSeek 首次 API 调用：<https://api-docs.deepseek.com/>
- OpenAI Python 库错误处理：<https://platform.openai.com/docs/guides/error-codes>

> 阶段提示：仍在「LLM 应用」阶段。Day 10 收尾了「可靠调用」，下一站开始引入 LangChain / LangGraph 这一层封装。

<ProgressButton courseId="python-agent-course" dayId="day-10-errors-logging" />
