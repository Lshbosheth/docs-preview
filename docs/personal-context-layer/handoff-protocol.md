# Agent Handoff 协议

## 目标

Handoff 协议用于把微信里的自然语言请求，转换成外部 Agent 可以接手的任务包。

Bridge 不负责完整执行任务。Bridge 负责：

```text
理解用户意图
收集相关上下文
过滤敏感信息
声明约束
选择目标 Agent
记录交接事件
接收或整理执行结果
```

## 核心类型

```ts
export type HandoffTargetAgent =
  | 'codex'
  | 'qwen_code'
  | 'claude_code'
  | 'docs_agent'
  | 'manual';

export type HandoffStatus =
  | 'draft'
  | 'requested'
  | 'accepted'
  | 'running'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ContextPackage = {
  id: string;
  userId: string;
  projectId?: string;
  recentConversation: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
  }>;
  userMemories: Array<ContextMemoryRef>;
  projectMemories: Array<ContextMemoryRef>;
  sessionSummary?: string;
  agentRuntimeSummary?: string;
  redactions: Array<{
    field: string;
    reason: string;
  }>;
};

export type ContextMemoryRef = {
  id: string;
  scope: 'user' | 'project' | 'session' | 'agent_runtime';
  type: string;
  content: string;
  sensitivity: 'low' | 'medium' | 'high';
  source?: string;
};

export type HandoffRequest = {
  id: string;
  source: 'weixin' | 'admin' | 'system';
  targetAgent: HandoffTargetAgent;
  status: HandoffStatus;
  userIntent: string;
  taskType:
    | 'code_task'
    | 'docs_task'
    | 'research_task'
    | 'debug_task'
    | 'planning_task'
    | 'other';
  projectId?: string;
  priority: 'low' | 'normal' | 'high';
  context: ContextPackage;
  constraints: {
    language: 'zh-CN' | 'en';
    allowedActions: string[];
    forbiddenActions: string[];
    requireConfirmationFor: string[];
    expectedOutput?: string;
  };
  callback?: {
    statusUrl?: string;
    replyToChatId?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type HandoffEvent = {
  id: string;
  handoffId: string;
  type:
    | 'created'
    | 'context_packaged'
    | 'disclosure_filtered'
    | 'sent'
    | 'accepted'
    | 'status_changed'
    | 'result_received'
    | 'reply_sent'
    | 'failed';
  status?: HandoffStatus;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
```

## 基本流程

```text
1. 微信收到用户请求。
2. Intent Router 判断需要外部 Agent。
3. Memory Retrieval 检索相关上下文。
4. Context Disclosure Policy 过滤上下文。
5. 生成 ContextPackage。
6. 生成 HandoffRequest。
7. 写入 HandoffEvent: created。
8. 交给目标 Agent 或生成任务卡。
9. 接收状态或结果。
10. Humanized Response 转成微信回复。
```

## 第一版目标

MVP 不强制真实启动外部 Agent。

可以先支持：

```text
生成 handoff JSON
后台查看 handoff 详情
复制 handoff prompt
记录状态
手动粘贴外部 Agent 结果
生成微信总结
```

等协议稳定后，再接 Codex / Qwen Code / Claude Code 的真实调用方式。
