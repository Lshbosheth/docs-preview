# Personal Context Layer

`wx-agent-bridge` 的新定位不是“微信 Agent Runtime / 工具执行桥”，而是：

```text
Personal Context Layer
个人上下文层
```

它的核心价值不是在微信里重造一个 Codex，而是让微信成为一个有记忆、懂上下文、会说人话、能把任务交给专业 Agent 的个人入口。

## 项目目标

新的目标是：

```text
微信消息
  -> 消息归一化
  -> 会话上下文
  -> 个人 / 项目记忆
  -> 意图识别
  -> 自然回复 或 Agent Handoff
  -> 人话总结
  -> 微信回复
```

Bridge 负责理解、记忆、整理和转交。Codex / Qwen Code / Claude Code 负责读代码、改代码、跑命令、验证结果和处理复杂执行。

## 新架构图

```text
WeChat / iLink
  -> Message Adapter
  -> Conversation Pipeline
  -> Intent Router
       -> casual_chat
       -> memory_update
       -> project_discussion
       -> agent_handoff
       -> reminder_task
  -> Personal Context Layer
       -> Session Memory
       -> User Memory
       -> Project Memory
       -> Agent Runtime Summary
  -> Handoff Layer
       -> Context Package
       -> Context Disclosure Policy
       -> Handoff Request
       -> Handoff Audit
  -> External Agents
       -> Codex
       -> Qwen Code
       -> Claude Code
  -> Humanized Response
  -> WeChat Reply
```

## 不再作为主线

这些能力不再作为 `wx-agent-bridge` 的主线：

```text
完整 Agent Runtime
完整 Tool Router / Tool Executor
通用 Shell 执行平台
文件写入和 patch 应用
git commit / git push
复杂权限沙箱
微信版 IDE
通用 MCP 平台
```

已有只读工具和审计能力可以暂时保留为内部诊断资产，但不继续扩张为完整执行系统。

## 优先级

```text
P0: 会话上下文、长期记忆、项目记忆
P1: 说人话、上下文承接、结果总结
P2: Agent Handoff 协议和审计
P3: 后台可视化：Conversations、Memory、Handoff、Config、Audit
P4: 轻量只读诊断工具
```

## 文档入口

- [定位修正](./positioning-v2-personal-context-layer)
- [实施路线图](./implementation-roadmap)
- [MVP 范围](./mvp-scope)
- [Agent Handoff 协议](./handoff-protocol)
- [上下文披露策略](./context-disclosure-policy)
- [Handoff 权限边界](./handoff-permission-policy)
- [旧文档迁移说明](./legacy-docs-migration)

## 成功标准

```text
用户不用反复解释自己的偏好和项目边界。
系统能区分短期上下文、长期记忆和项目决策。
普通聊天自然、短、像人话。
代码/文档任务能整理成清晰 handoff 包交给外部 Agent。
外部 Agent 结果能被翻译成微信里看得懂的总结。
敏感记忆不会被随意交给外部 Agent。
```
