import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

load_dotenv()

MODEL = "deepseek-v4-flash"
# LangChain 会把 base_url 直接传给底层 OpenAI 客户端；DeepSeek 的端点正好是
# https://api.deepseek.com/chat/completions。若个别版本报 404，可改成
# "https://api.deepseek.com/v1" 试试（DeepSeek 同样兼容该路径）。
BASE_URL = "https://api.deepseek.com"


def to_langchain_messages(messages):
    """把 [{role, content}] 转换成 LangChain 消息对象列表。"""
    mapping = {
        "system": SystemMessage,
        "user": HumanMessage,
        "assistant": AIMessage,
    }
    result = []
    for m in messages:
        cls = mapping.get(m["role"])
        if cls is None:
            continue
        result.append(cls(content=m["content"]))
    return result


def langchain_chat(messages, stream=False):
    """用 LangChain 调用同一个 DeepSeek 模型。"""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）")

    llm = ChatOpenAI(
        model=MODEL,
        api_key=api_key,
        base_url=BASE_URL,
        temperature=0.7,
        extra_body={"thinking": {"type": "disabled"}},
        timeout=30,
    )
    lc_messages = to_langchain_messages(messages)

    if stream:
        chunks = []
        for chunk in llm.stream(lc_messages):
            text = chunk.content or ""
            print(text, end="", flush=True)
            chunks.append(text)
        print()
        return "".join(chunks)

    response = llm.invoke(lc_messages)
    return response.content
