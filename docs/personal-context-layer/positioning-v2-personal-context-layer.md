# Positioning V2: Personal Context Layer

## 方向判断

`wx-agent-bridge` 应该从“微信 Agent Runtime / 工具执行桥”修正为“Personal Context Layer / 个人上下文层”。

原因很简单：完整工具执行、命令行 Runtime、文件修改、测试验证、Git 操作这些能力已经是 Codex / Qwen Code / Claude Code 的主战场。Bridge 自己重做一套，会变大、变慢、变散，也很难比专业代码 Agent 更好。

Bridge 真正独特的价值是：

```text
微信入口
个人记忆
会话上下文
项目上下文
说人话
任务转交
结果翻译
```

## 新定位

```text
wx-agent-bridge
  = Personal Context Layer
  + WeChat Conversation Gateway
  + Agent Handoff Layer
```

它不是执行所有任务的手，而是理解用户、整理上下文、分发任务和解释结果的大脑边缘层。

## 产品边界

Bridge 应该做：

```text
记住用户偏好
维护会话上下文
维护项目记忆
识别自然语言意图
生成 handoff 请求
管理上下文披露范围
记录 handoff 审计
把外部 Agent 结果说成人话
```

Bridge 不应该继续主线推进：

```text
自研完整 shell runtime
自研文件写入工具
自研 patch / commit / push 流程
复杂工具权限系统
多步 tool loop
微信版 IDE
```

## 与外部 Agent 的关系

```text
Bridge:
  负责上下文、记忆、意图、交接和沟通。

Codex / Qwen Code / Claude Code:
  负责代码理解、文件修改、命令执行、测试验证、提交和长任务恢复。
```

Bridge 不替代外部 Agent，而是让外部 Agent 更懂用户和项目。

## 文档处理结论

```text
Day 8 Memory:
  保留并升为主线。

Day 8.1 Session Context:
  保留并升为 P0。

Day 9 Config Center:
  保留，但服务于 memory / handoff / prompt / audit。

Day 8 Tool Permission:
  降级，改写为 Handoff Permission / Context Disclosure。

Day 10 Agent Runtime:
  Deprecated，保留为历史参考。

Day 11 Memory Permission:
  Deprecated，转化为 Context Disclosure Policy。
```

## MVP 一句话

第一版不做“微信里跑完整 Agent”，只做：

```text
微信里自然对话
能记住上下文
能维护项目记忆
能把任务打包交给 Codex/Qwen/Claude
能把执行结果翻译成人话
```
