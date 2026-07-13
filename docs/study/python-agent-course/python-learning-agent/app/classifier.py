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
