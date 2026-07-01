# wx-agent-bridge 实施路线图

> Direction changed: 原路线图里的 Runtime / Tool Router phase 已经被 Handoff phase 替代。  
> 新主线详见 [Personal Context Layer 路线图](/personal-context-layer/implementation-roadmap)。

## 总原则

```text
Context first, Runtime later if necessary.
```

先做上下文、记忆、意图识别和 Agent Handoff。不要继续把 Bridge 扩展成完整命令行 Runtime。

## Phase 0: 文档和定位修正

目标：

```text
README 改口径
旧 Runtime 文档降级
Personal Context Layer 文档成体系
MVP 范围收紧
```

## Phase 1: 微信入口和会话上下文

目标：

```text
微信 / iLink 接入稳定
消息归一化
保存用户消息和助手回复
按 chatId 注入最近上下文
后台查看 conversations
```

## Phase 2: Memory MVP

目标：

```text
User Memory
Session Memory
Project Memory
Agent Runtime Summary
Memory Candidate Extractor
Memory Retrieval
Memory Audit
```

## Phase 3: 说人话

目标：

```text
回复不再像工具日志
能承接上下文
能解释外部 Agent 结果
能按用户偏好控制长短和语气
```

## Phase 4: Agent Handoff

目标：

```text
ContextPackage
HandoffRequest
HandoffEvent
Handoff Audit
Codex / Qwen Code / Claude Code 目标适配
```

第一版可以只生成 handoff JSON 或后台任务卡。

## Phase 5: Context Disclosure Policy

目标：

```text
判断哪些记忆能交给外部 Agent
敏感信息脱敏
高敏上下文确认
记录上下文披露审计
```

## Phase 6: Admin Web 重排

主导航优先级：

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

## 不再作为近期主线

```text
完整 Tool Router
完整 Agent Runtime
write_file
apply_patch
run_command
git_commit
git_push
微信高风险工具确认流
```

这些能力可以保留为历史参考或未来 P4 之后的补充能力。
