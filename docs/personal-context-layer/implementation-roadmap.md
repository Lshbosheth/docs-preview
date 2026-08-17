# Personal Context Layer 实施路线图

## 总原则

路线从 Runtime-first 改为 Context-first。

```text
先让系统懂用户、懂项目、会转交。
再考虑是否需要少量 Bridge 自有工具。
```

## Phase 0: 定位和文档修正

目标：

```text
项目入口文档改口径
旧 Runtime 文档降级
新 handoff / context 文档成体系
MVP 范围收紧
```

验收：

```text
README 不再称自己为完整 Agent Runtime。
Day 10 / Day 11 标记为 deprecated。
Personal Context Layer 文档目录有独立路线图。
```

## Phase 1: Conversation Context

目标：

```text
保存微信会话消息
按 chatId 读取最近上下文
ChatService 注入最近对话
后台可查看 conversations
```

保留 Day 8.1 的实现方向。

不做：

```text
长期记忆自动写入
向量检索
复杂权限
外部 Agent 调度
```

## Phase 2: Memory MVP

目标：

```text
MemoryEntry 类型
User Memory
Project Memory
Session Summary
Agent Runtime Summary
Memory Candidate Extractor
Memory Retrieval
Memory Audit
```

第一版存储：

```text
data/memory/users/
data/memory/projects/
data/memory/sessions/
data/memory/handoff/
```

不做：

```text
知识图谱
全量语义搜索
多用户 RBAC
云端同步
```

## Phase 3: Humanized Conversation

目标：

```text
回复不像接口日志
能承接上下文
能区分闲聊和任务
能把外部 Agent 结果转成人话
能按用户偏好控制长短和语气
```

新增策略：

```text
tone profile
reply length policy
result summary policy
clarification policy
```

## Phase 3.5: Proactive Loop

目标：

```text
从明确提醒、近期会话和有效 OpenLoop 生成主动行动候选
持久化调度提醒、跟进和受约束的主动互动
到点读取最新上下文，决定发送、延期或跳过
根据用户回应更新任务和 OpenLoop 状态
支持静默时段、冷却、每日预算、分类开关和完整审计
```

`OpenLoop` 只表示尚未闭环的事项，不能直接等同于可发送任务。模型负责提出候选和生成文案，确定性策略负责调度、权限、幂等和反打扰。

第一版按 shadow、明确提醒、上下文跟进、主动互动逐级放量；任何外部副作用仍进入确认或 Handoff。

详细设计见 [Phase 3.5：Proactive Loop](/wx-agent-bridge/delivery-roadmap/phase-3-5-proactive-loop)。

## Phase 4: Agent Handoff

目标：

```text
定义 HandoffRequest
定义 ContextPackage
定义 HandoffEvent
支持 Codex / Qwen Code / Claude Code 目标枚举
生成 handoff preview
记录 handoff audit
```

第一版可以只生成 handoff JSON 或后台任务卡，不强制打通所有外部 Agent API。

## Phase 5: Context Disclosure Policy

目标：

```text
判断哪些记忆可以交给外部 Agent
过滤敏感字段
记录披露范围
支持用户确认高敏上下文
```

这一步替代旧的“记忆影响工具权限”路线。

## Phase 6: Admin Web 重排

后台优先级改为：

```text
1. Conversations
2. Memory
3. Handoff
4. Config
5. Audit
```

降级：

```text
Agent Tools
Tool Audit
Permission Rules
```

这些页面可以保留为开发诊断入口，但不放在主导航核心位置。

## Phase 7: External Agent Adapter

目标：

```text
Codex Adapter
Qwen Code Adapter
Claude Code Adapter
Handoff status callback
Result parser
Humanized result builder
```

先做协议稳定，再做具体 adapter。

## 延后事项

```text
Bridge 自己写文件
Bridge 自己执行 shell
Bridge 自己 git commit / push
完整 MCP 平台
复杂工作流编排
向量数据库
多租户 SaaS 权限
```
