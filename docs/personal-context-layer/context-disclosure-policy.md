# Context Disclosure Policy

## 目标

Context Disclosure Policy 决定哪些上下文可以交给外部 Agent。

它替代旧路线里的“长期记忆影响工具权限”。新的问题不是“Bridge 能不能执行工具”，而是：

```text
这次 handoff 能不能带上这条记忆？
这条记忆是否需要脱敏？
这条记忆是否需要用户确认？
外部 Agent 是否真的需要知道？
```

## 基本原则

```text
最小披露
按任务相关性披露
敏感信息默认不披露
高敏上下文需要确认
所有披露都要审计
用户最新明确指令优先
```

## 记忆分级

```ts
export type ContextSensitivity = 'low' | 'medium' | 'high' | 'secret';

export type ContextDisclosureDecision =
  | 'include'
  | 'include_redacted'
  | 'require_confirmation'
  | 'exclude';

export type ContextDisclosureRule = {
  id: string;
  scope: 'user' | 'project' | 'session' | 'agent_runtime';
  type?: string;
  sensitivity: ContextSensitivity;
  targetAgent?: string;
  decision: ContextDisclosureDecision;
  reason: string;
};

export type ContextDisclosureResult = {
  memoryId: string;
  decision: ContextDisclosureDecision;
  reason: string;
  redactedContent?: string;
  matchedRuleId?: string;
};
```

## 默认策略

可以自动披露：

```text
项目方向
代码风格偏好
文档位置约定
非敏感技术决策
当前任务相关的最近对话摘要
外部 Agent 上次执行摘要
```

可以脱敏后披露：

```text
路径中包含用户名
日志中包含局部 token
错误信息里包含内部 URL
会话摘要里包含不相关个人信息
```

需要确认：

```text
身份信息
健康相关长期结论
财务偏好
账号信息
私人关系信息
可能来自语音误识别的重要事实
```

禁止披露：

```text
完整 token
完整 Authorization header
API key
密码
SSH key
浏览器 cookie
未脱敏凭证文件内容
与当前任务无关的私人聊天原文
```

## 审计事件

每次 handoff 都要记录：

```ts
export type ContextDisclosureAuditEvent = {
  id: string;
  handoffId: string;
  targetAgent: string;
  includedMemoryIds: string[];
  redactedMemoryIds: string[];
  excludedMemoryIds: string[];
  confirmationRequiredMemoryIds: string[];
  reason: string;
  createdAt: string;
};
```

## MVP 范围

第一版只做规则和关键词过滤：

```text
scope filter
sensitivity filter
keyword redaction
top_k 限制
handoff audit
```

暂不做：

```text
向量级隐私分类
复杂组织权限
多用户共享记忆
自动跨设备同步
```
