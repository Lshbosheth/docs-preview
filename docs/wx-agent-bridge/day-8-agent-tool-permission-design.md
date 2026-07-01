# Day 8 Handoff 权限边界设计

> Deprecated: 这份文档原本用于设计 `wx-agent-bridge` 自研 Agent Runtime 和工具权限系统。  
> 在 Personal Context Layer 新定位下，它已改写为 Handoff 权限边界文档。新的主线文档见：
>
> - `docs/personal-context-layer/handoff-permission-policy.md`
> - `docs/personal-context-layer/context-disclosure-policy.md`
> - `docs/personal-context-layer/handoff-protocol.md`

## 定位修正

旧问题是：

```text
Bridge 能不能让模型调用工具？
Bridge 能不能读写文件？
Bridge 能不能执行 shell？
Bridge 能不能 git commit / git push？
```

新问题是：

```text
Bridge 能不能把任务交给外部 Agent？
Bridge 能不能把这些上下文交给外部 Agent？
Bridge 应该如何记录这次 handoff？
哪些敏感记忆必须脱敏或确认？
```

## 新边界

```text
Bridge:
  负责微信入口、上下文、记忆、任务打包、披露策略、handoff 审计和人话总结。

Codex / Qwen Code / Claude Code:
  负责代码理解、文件修改、命令执行、测试验证、提交和复杂工具权限。
```

Bridge 不再把完整 Tool Runtime 作为近期主线。

## Handoff 权限模型

Handoff 权限不是工具权限，而是上下文披露权限。

需要判断：

```text
1. 这次任务是否应该交给外部 Agent。
2. 应该交给哪个 Agent。
3. 需要携带哪些用户记忆、项目记忆和会话摘要。
4. 哪些内容必须脱敏。
5. 哪些内容需要用户确认。
6. 这次披露如何审计。
```

## 风险等级

### Low

```text
非敏感项目决策
文档目录约定
代码风格偏好
最近任务摘要
```

默认可进入 handoff。

### Medium

```text
完整项目上下文
较长会话摘要
用户偏好
外部 Agent 执行状态
```

可进入 handoff，但必须记录审计。

### High

```text
身份信息
健康、财务、账号等敏感记忆
未经确认的语音转写推断
包含 token / secret / credential 的内容
```

默认不披露，必要时脱敏或请求确认。

## 近期不做

```text
Bridge 自己执行 shell
Bridge 自己写文件
Bridge 自己 apply_patch
Bridge 自己 git commit / git push
微信高风险工具确认流
长期记忆影响工具权限
```

如果以后必须恢复 Bridge 内部工具，也应作为 P4 之后的补充能力，而不是主产品路线。
