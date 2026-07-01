# Handoff 权限边界

## 背景

旧的 Day 8 工具权限设计关注的是：

```text
模型能不能调用工具
Bridge 能不能读写文件
Bridge 能不能执行 shell
Bridge 能不能 git commit / push
```

在 Personal Context Layer 新定位下，这不再是主问题。

新的权限边界关注：

```text
能不能把任务交给外部 Agent
能不能把某类上下文带给外部 Agent
能不能让外部 Agent 执行高风险动作
执行结果能不能直接发回微信
```

## 分工

```text
Bridge:
  管理上下文、披露策略、handoff 审计、用户确认。

External Agent:
  管理自己的工具权限、文件修改、命令执行、提交和验证。
```

Bridge 不绕过外部 Agent 自己的权限系统。

## Handoff 风险等级

### Low

```text
生成任务说明
整理文档上下文
转交非敏感项目记忆
请求外部 Agent 做只读分析
```

默认允许。

### Medium

```text
转交较完整项目上下文
请求外部 Agent 修改文档或代码
携带部分用户偏好
携带最近会话摘要
```

默认允许，但需要审计。

### High

```text
携带高敏个人记忆
请求外部 Agent 执行发布、推送、删除、迁移等操作
把外部 Agent 结果自动转发给第三方
```

需要确认或降级为人工处理。

## MVP 策略

```text
Bridge 只生成 handoff request。
Bridge 不直接执行 shell。
Bridge 不直接写文件。
Bridge 不直接 git push。
Bridge 记录 handoff 上下文披露范围。
外部 Agent 的执行权限由外部 Agent 自己处理。
```

## 与旧工具权限文档的关系

旧工具权限文档可以保留为历史参考，但不再作为近期实现路线。

如果后续必须在 Bridge 内保留工具，也只保留：

```text
查记忆
写记忆
查 handoff 状态
发微信回复
读 docs-preview 索引
```

文件写入、shell、git commit、git push 不进入 Bridge MVP。
