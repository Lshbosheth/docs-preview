# 旧文档迁移说明

## 保留并升优先级

```text
docs/wx-agent-bridge/day-8-chat-memory-system-design.md
docs/wx-agent-bridge/day-8-1-session-context-plan.md
docs/wx-agent-bridge/day-9-admin-config-center-plan.md
```

原因：

```text
它们服务于会话上下文、长期记忆、项目记忆、配置和审计。
这些正是 Personal Context Layer 的主线。
```

## 降级并改写

```text
docs/wx-agent-bridge/day-8-agent-tool-permission-design.md
```

新方向：

```text
从 Tool Permission
改为 Handoff Permission / Context Disclosure Policy
```

对应新文档：

```text
docs/personal-context-layer/handoff-permission-policy.md
docs/personal-context-layer/context-disclosure-policy.md
```

## 标记 Deprecated

```text
docs/wx-agent-bridge/qwen-day-10-agent-runtime-tool-permission-mvp-prompt.md
docs/wx-agent-bridge/qwen-day-11-memory-permission-integration-prompt.md
```

原因：

```text
Day 10 推进 Bridge 自研 Agent Runtime。
Day 11 推进记忆影响工具权限。
这两条线都应该从近期主线移出。
```

它们可以保留为历史参考，但不再作为下一阶段实施提示词。

## README 口径

README 应从：

```text
微信 AI Agent Bridge，提供任务规划与安全执行能力。
```

改为：

```text
Personal Context Layer + WeChat Gateway + Agent Handoff Layer。
```

重点表达：

```text
Bridge 负责上下文和交接。
外部 Agent 负责复杂执行。
```
