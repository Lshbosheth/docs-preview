---
title: Day 8 用类封装模型客户端
---

# Day 8：用类封装模型客户端

> 昨天我们把「建 client、检查 Key、发请求」都挤在一个 `call_deepseek` 函数里。今天用 `class` 把它重构成 `DeepSeekClient`，对外只暴露一个干净的 `chat(messages)`。主流程从此不必再看见 `base_url`、`timeout` 这些细节。

## 今天完成什么

- 在 `app/deepseek_client.py` 中定义 `DeepSeekClient` 类，含 `__init__` 与 `chat(messages)` 方法。
- 把「读 Key、建 client、发请求」收敛进类内部，Key 缺失检查放在 `__init__`。
- 改写 `main.py`：用 `client = DeepSeekClient()` 然后 `client.chat(messages)`，主流程更瘦。

## 它接在昨天哪里

Day 7 留下的是一个职责混合的 `call_deepseek(messages)`。今天把它升级为 `DeepSeekClient` 类——功能不变，但结构更清晰，也更符合「小项目」该有的组织方式。替换后，`main.py` 里那行 `call_deepseek(messages)` 变成 `client.chat(messages)`。

## 概念解释

- **`class DeepSeekClient`**：类相当于「工厂模板」。JS 里你也写 `class Foo { constructor() {} method() {} }`，几乎一一对应。
- **`__init__(self, ...)`**：构造函数，创建实例时自动执行。`self` 相当于 JS 的 `this`，指向「当前这个实例」。
- **实例属性 / 实例方法**：`self.model`、`self._client` 是「这个实例自己的数据」；`chat(self, messages)` 是「这个实例能做的事」。

**前端类比**：这就像把「baseURL、超时、拦截器」封装成一个 axios 实例 / 一个 `apiClient` service 模块。页面里只写 `apiClient.get('/user')`，不用关心底层 `fetch` 怎么拼 URL、怎么带 token。我们的 `DeepSeekClient` 同理——`main.py` 只关心「发 messages、拿回复」。

**类比的边界**：JS class 的方法默认挂在原型上、靠 `this` 动态绑定；Python 的方法第一个参数必须是 `self`，且**显式**写出来。忘了写 `self` 会直接报 `TypeError: chat() takes 1 positional argument but 2 were given`。

## 动手前的目录

```text
python-learning-agent/
├─ app/
│  ├─ __init__.py
│  ├─ classifier.py
│  ├─ storage.py
│  └─ deepseek_client.py   ← Day 7 的 call_deepseek 版本，今天重写
├─ main.py
├─ requirements.txt
├─ .env.example
└─ .gitignore
```

## 分步实现

1. 把 `deepseek_client.py` 从「函数」改写成「类」：`__init__` 里读 Key、建 `OpenAI` 客户端并保存为 `self._client`；`chat` 方法负责发请求。
2. 把 `MODEL`、`BASE_URL` 提成类级别的常量（或 `__init__` 默认值），让构造时可覆盖。
3. 改写 `main.py`：仅在顶部创建一次 `client = DeepSeekClient()`，调用处改成 `client.chat(messages)`。
4. 运行验证：行为和 Day 7 完全一致，但代码结构更清楚。

## 完整代码

**`python-learning-agent/app/deepseek_client.py`**

```python
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

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
        """把 messages 发给 DeepSeek，返回 assistant 的文本回复。"""
        response = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            timeout=self.timeout,
            extra_body={"thinking": {"type": "disabled"}},
        )
        return response.choices[0].message.content
```

**`python-learning-agent/main.py`**

```python
from app.classifier import create_message, classify_message
from app.storage import load_messages, save_messages
from app.deepseek_client import DeepSeekClient


def main():
    name = input("你的名字：")
    topic = input("今天想学什么：")

    messages = load_messages()
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

> `app/classifier.py`、`app/storage.py`、`requirements.txt`、`.env.example`、`.gitignore` 均沿用，无需改动。

## 运行命令

```powershell
cd python-learning-agent
.\.venv\Scripts\Activate.ps1
python main.py
```

> 没有新增依赖，所以不需要再 `pip install`。`.env` 沿用 Day 7 的配置即可。

## 预期输出

```text
你的名字：小明
今天想学什么：Python 的 list 和 tuple 有什么区别
分类结果：普通聊天
助手：list 是可变的有序序列，用 [...] 定义；tuple 是不可变的，用 (...) 定义……
已保存 4 条消息到 data/conversations.json
```

> 回复内容因模型而异，重点看结构：主流程里已经看不到 `base_url`、`OpenAI(...)` 这些字眼，只调用了 `client.chat(messages)`。

## 常见错误

**问题 A**：`TypeError: chat() takes 1 positional argument but 2 were given`。

**排查**：在 `chat` 方法定义里忘了写 `self` 参数。Python 调用 `client.chat(messages)` 时，会自动把 `client` 作为第一个参数传进去，所以定义必须是 `def chat(self, messages):`。

**问题 B**：`AttributeError: 'DeepSeekClient' object has no attribute '_client'`。

**排查**：你在 `chat` 里用了 `self._client`，但 `__init__` 里没赋值，或者拼写不一致（比如写成了 `self.client`）。实例属性必须先 `__init__` 里 `self.xxx = ...` 才能用。

**问题 C**：把客户端当成函数调用：`client(messages)`。

**排查**：`client` 是实例，不是函数。要调用方法：`client.chat(messages)`。

## 动手改一改

给 `DeepSeekClient.__init__` 加一个 `temperature` 参数（默认 `0.7`），并把它传到 `chat` 的 `create(temperature=self.temperature)`。思考：`temperature` 越低回复越稳定，越高越有随机性——这个参数放在哪一层最合适？（提示：它属于「调用配置」，和 `model`、`timeout` 同类。）

## 验收清单

- [ ] `app/deepseek_client.py` 定义了 `DeepSeekClient` 类，含 `__init__` 与 `chat`。
- [ ] Key 缺失检查在 `__init__` 中完成，主流程只 catch `RuntimeError`。
- [ ] `main.py` 用 `client.chat(messages)`，不再出现 `OpenAI(...)`、`base_url` 等字眼。
- [ ] 运行行为与 Day 7 一致，能拿到并保存 `assistant` 消息。

## 今日记录

```text
今天跑通：把散落的 API 调用重构成 DeepSeekClient 类，chat(messages) 对外清晰
现在能解释：class/__init__/self 对应 JS 的 class/constructor/this
明天先做：Day 9 加类型标注与结构化任务，定义 ChatMessage 与 LearningTask
```

## 留给明天的接口

留下清晰稳定的 `DeepSeekClient.chat(messages)` 接口。Day 9 会新增 `app/models.py`，用 `TypedDict` 描述消息结构、用 `Pydantic` 定义结构化的 `LearningTask`——但模型调用方式不变，仍然是 `client.chat(messages)`。

## 官方参考链接

- DeepSeek 首次 API 调用：<https://api-docs.deepseek.com/>
- DeepSeek 多轮对话：<https://api-docs.deepseek.com/guides/multi_round_chat>

> 阶段提示：仍在「LLM 应用」阶段。我们已经有了一个干净的模型客户端，接下来几天的重点是「让输入输出更结构化、更可靠」。
