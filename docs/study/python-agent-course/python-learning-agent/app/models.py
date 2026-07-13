from typing import Literal, TypedDict
from pydantic import BaseModel, Field


class ChatMessage(TypedDict):
    """一条对话消息的结构提示：role + content。它仍是普通 dict。"""
    role: str
    content: str


# 优先级的合法取值
Priority = Literal["高", "中", "低"]


class LearningTask(BaseModel):
    """从学习意图中整理出的结构化任务。"""
    title: str = Field(..., description="学习任务标题")
    priority: Priority = Field("中", description="优先级：高 / 中 / 低")
    done: bool = Field(False, description="是否已完成")
