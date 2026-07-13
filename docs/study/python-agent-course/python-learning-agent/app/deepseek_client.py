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
from app.tools import TOOLS, run_tool

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("deepseek")

MODEL = "deepseek-v4-flash"
BASE_URL = "https://api.deepseek.com"


class DeepSeekClient:
    """对 DeepSeek 调用的薄封装，对外暴露 chat / chat_with_tools。"""

    def __init__(self, model=MODEL, timeout=30):
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise RuntimeError(
                "缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）"
            )
        self.model = model
        self.timeout = timeout
        self._client = OpenAI(api_key=api_key, base_url=BASE_URL)

    @staticmethod
    def _translate_error(e):
        if isinstance(e, AuthenticationError):
            return "API Key 无效（401）。请检查 .env 中的 DEEPSEEK_API_KEY。"
        if isinstance(e, RateLimitError):
            return "请求过于频繁，被限流（429）。请稍等几秒再试。"
        if isinstance(e, APITimeoutError):
            return "请求超时，模型未在限定时间内回应。请检查网络或调大 timeout。"
        if isinstance(e, APIConnectionError):
            return f"网络连接失败：{e}"
        logger.exception("DeepSeek 调用出现未预期错误")
        return f"调用 DeepSeek 时发生未知错误：{e}"

    def chat(self, messages):
        logger.info("调用 DeepSeek，消息条数=%d", len(messages))
        try:
            response = self._client.chat.completions.create(
                model=self.model, messages=messages, timeout=self.timeout,
                extra_body={"thinking": {"type": "disabled"}},
            )
        except Exception as e:
            raise RuntimeError(self._translate_error(e))
        content = response.choices[0].message.content
        if not content or not content.strip():
            raise RuntimeError("模型返回了空内容，请重试一次。")
        logger.info("DeepSeek 调用成功，回复长度=%d", len(content))
        return content

    def chat_with_tools(self, messages):
        work = list(messages)  # 用副本，不污染原始对话历史
        logger.info("调用 DeepSeek（带工具），消息条数=%d", len(work))
        try:
            response = self._client.chat.completions.create(
                model=self.model, messages=work, tools=TOOLS, timeout=self.timeout,
                extra_body={"thinking": {"type": "disabled"}},
            )
        except Exception as e:
            raise RuntimeError(self._translate_error(e))

        message = response.choices[0].message
        if not message.tool_calls:
            content = message.content or ""
            if not content.strip():
                raise RuntimeError("模型返回了空内容，请重试一次。")
            return content

        # 模型决定调用工具：把它的 tool_calls 记为 assistant 消息
        work.append({
            "role": "assistant",
            "content": message.content or "",
            "tool_calls": [tc.model_dump() for tc in message.tool_calls],
        })
        # Python 真正执行工具，把结果作为 tool 消息追加
        for tc in message.tool_calls:
            result = run_tool(tc.function.name, tc.function.arguments)
            work.append({"role": "tool", "tool_call_id": tc.id, "content": result})

        # 把工具结果交回模型，请它基于结果作答
        try:
            final = self._client.chat.completions.create(
                model=self.model, messages=work, timeout=self.timeout,
                extra_body={"thinking": {"type": "disabled"}},
            )
        except Exception as e:
            raise RuntimeError(self._translate_error(e))
        content = final.choices[0].message.content or ""
        if not content.strip():
            raise RuntimeError("模型返回了空内容，请重试一次。")
        return content
