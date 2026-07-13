from app.classifier import create_message
from app.storage import load_messages, save_messages
from app.graph import run_one


def main():
    thread_id = input("会话 ID（thread_id，留空用 default）：").strip() or "default"
    print(f"已进入会话 [{thread_id}]，输入 exit 退出。")
    while True:
        topic = input("你：")
        if topic.strip().lower() in ("exit", "quit", "退出"):
            break
        result = run_one(topic, thread_id=thread_id)
        reply = result["reply"]
        print(f"助手：{reply}")

        # 跨进程持久（MemorySaver 仅同进程内存，重启即清空）
        history = load_messages()
        history.append(create_message("user", topic))
        history.append(create_message("assistant", reply))
        save_messages(history)


if __name__ == "__main__":
    main()
