from app.classifier import create_message, classify_message


def test_create_message():
    msg = create_message("user", "你好")
    assert msg == {"role": "user", "content": "你好"}


def test_classify_research():
    assert classify_message("怎么用字典") == "查资料"


def test_classify_task():
    assert classify_message("记一下学半小时字典") == "记录任务"


def test_classify_chat():
    assert classify_message("你好呀") == "普通聊天"
