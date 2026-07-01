# wx-agent-bridge 项目总览

> Direction changed: `wx-agent-bridge` 的主线已从“微信 Agent Runtime / 工具执行桥”调整为“Personal Context Layer / 个人上下文层”。
>
> 新方向文档入口：
>
> - [Personal Context Layer](/personal-context-layer/)
> - [定位修正](/personal-context-layer/positioning-v2-personal-context-layer)
> - [实施路线图](/personal-context-layer/implementation-roadmap)
> - [Agent Handoff 协议](/personal-context-layer/handoff-protocol)
> - [MVP 范围](/personal-context-layer/mvp-scope)
> - [wx-agent-bridge 代码学习导览](/wx-agent-bridge/code-learning-map)

## 项目目标

`wx-agent-bridge` 不再定位为通用 Agent Runtime。

新的目标是：

```text
微信入口
  -> 会话上下文
  -> 个人 / 项目记忆
  -> 意图识别
  -> Agent Handoff
  -> 人话总结
  -> 微信回复
```

它负责理解用户、维护上下文、整理任务并转交给外部 Agent。Codex / Qwen Code / Claude Code 负责复杂执行。

## 架构图

```text
WeChat / iLink
  -> Message Adapter
  -> Conversation Pipeline
  -> Personal Context Layer
       -> Session Memory
       -> User Memory
       -> Project Memory
       -> Agent Runtime Summary
  -> Intent Router
       -> casual_chat
       -> memory_update
       -> project_discussion
       -> agent_handoff
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

## 模块边界

Bridge 负责：

```text
微信接入
消息归一化
会话上下文
长期记忆
项目记忆
意图识别
上下文披露策略
Agent Handoff
结果人话总结
```

外部 Agent 负责：

```text
读代码
改文件
跑命令
跑测试
Git 操作
长任务恢复
复杂工具权限
```

## 文档状态

保留并升优先级：

```text
Day 8 聊天记忆系统
Day 8.1 聊天记录和会话上下文
Day 9 管理后台配置中心
```

降级或归档：

```text
Day 8 Agent 工具权限设计
Day 10 Agent Runtime + 工具权限 MVP
Day 11 长期记忆接入工具权限策略
```

这些旧文档不删除，但不再作为近期实施主线。

## 当前推荐阅读顺序

```text
1. /personal-context-layer/
2. /personal-context-layer/positioning-v2-personal-context-layer
3. /personal-context-layer/mvp-scope
4. /personal-context-layer/handoff-protocol
5. /personal-context-layer/context-disclosure-policy
6. /personal-context-layer/legacy-docs-migration
```
