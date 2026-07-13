import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from app.models import LearningTask

load_dotenv()

MODEL = "deepseek-v4-flash"
BASE_URL = "https://api.deepseek.com"

PROMPT_TEXT = """你是一个学习日程助手。请把用户的需求整理成一个结构化任务。
只输出符合下面格式的内容，不要多余解释。

{format_instructions}

用户需求：{query}

请返回结构化任务："""


def parse_task(query):
    """把自然语言需求整理成 LearningTask 对象。"""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise RuntimeError("缺少 DEEPSEEK_API_KEY，请在 .env 中配置（参考 .env.example）")

    parser = PydanticOutputParser(pydantic_object=LearningTask)
    prompt = PromptTemplate(
        template=PROMPT_TEXT,
        input_variables=["query"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    llm = ChatOpenAI(
        model=MODEL,
        api_key=api_key,
        base_url=BASE_URL,
        temperature=0,  # 结构化输出要稳定，temperature 设 0
        extra_body={"thinking": {"type": "disabled"}},
    )
    chain = prompt | llm | parser
    try:
        return chain.invoke({"query": query})
    except Exception as e:
        raise RuntimeError(f"无法把需求解析成任务：{e}")
