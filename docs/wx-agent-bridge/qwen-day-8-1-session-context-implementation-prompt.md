# Qwen 实施提示词：Day 8.1 聊天记录和会话上下文

请基于已有 `wx-agent-bridge` 项目继续开发 Day 8.1：聊天记录和会话上下文。

## 先读文档

请先阅读：

```text
docs/wx-agent-bridge/day-8-1-session-context-plan.md
docs/wx-agent-bridge/day-8-chat-memory-system-design.md
docs/wx-agent-bridge/day-9-admin-config-center-plan.md
```

当前系统已经具备：

```text
NestJS 后端
React + Ant Design 管理后台
iLink 微信消息收发
Chat / Planner / Executor 模型分流
提示词配置中心
```

现在要做的是短期会话上下文：让模型能看到当前微信会话最近几轮消息。

## 重要边界

这一步只做：

```text
原始聊天记录
最近上下文读取
聊天时携带最近消息
后台只读查看会话
```

不要做：

```text
长期记忆
自动记忆候选
embedding
向量检索
总结压缩
复杂权限
数据库迁移
```

## 后端任务

### 1. 新增 MemoryModule

新增：

```text
src/memory/memory.module.ts
src/memory/memory.types.ts
src/memory/conversation-log.service.ts
src/memory/session-context.service.ts
src/memory/stores/json-conversation.store.ts
src/memory/memory-admin.controller.ts
```

并在 `AppModule` 注册。

### 2. 定义类型

在 `memory.types.ts` 中定义：

```ts
export type ConversationRole = 'user' | 'assistant' | 'system';

export type ConversationMessage = {
  id: string;
  sessionId: string;
  chatId: string;
  fromUser?: string;
  role: ConversationRole;
  content: string;
  sourceMessageId?: string;
  handledBy?: string;
  createdAt: string;
};

export type ConversationSession = {
  sessionId: string;
  chatId: string;
  updatedAt: string;
  messages: ConversationMessage[];
};
```

### 3. 实现 JSONConversationStore

文件目录：

```text
data/memory/sessions
```

方法：

```ts
append(message: ConversationMessage): Promise<void>
listRecent(sessionId: string, limit: number): Promise<ConversationMessage[]>
listSessions(): Promise<Array<{ sessionId: string; chatId: string; updatedAt: string; messageCount: number }>>
```

要求：

- 自动创建目录。
- 文件名要安全化，不能直接用 `@`、`/`、`\`。
- 每个 session 最多保存最近 200 条消息，超过就裁剪旧消息。
- 所有文件 UTF-8。

### 4. 实现 ConversationLogService

方法：

```ts
getSessionId(chatId: string): string
appendUserMessage(message: NormalizedMessage): Promise<void>
appendAssistantMessage(params: {
  chatId: string;
  content: string;
  sourceMessageId?: string;
  handledBy?: string;
}): Promise<void>
listRecentByChatId(chatId: string, limit: number): Promise<ConversationMessage[]>
listSessions()
```

`sessionId` 格式：

```text
weixin:{chatId}
```

### 5. 实现 SessionContextService

方法：

```ts
getRecentContext(chatId: string, limit = 12): Promise<ConversationMessage[]>
```

返回最近消息，但要注意：

- 如果当前用户消息已经刚保存了，ChatService 组装时不要重复追加。
- 可以在 Pipeline 里先读取上下文，再保存当前消息；也可以保存后过滤当前 messageId。

推荐做法：

```text
Pipeline:
  recent = getRecentContext(chatId)
  appendUserMessage(current)
  chatService.reply({ content, recentMessages: recent })
```

这样最简单，不会重复当前消息。

### 6. 改造 PipelineService

当前 `handleNormalizedMessage(message)` 里会判断 command / task / chat。

请改成：

```text
1. 读取 recent context
2. 保存用户消息
3. 执行业务流程
4. 保存 assistant 回复
5. 返回结果
```

注意：

- command 回复也保存。
- task 回复也保存。
- chat 回复也保存。
- 如果某个流程抛错并返回错误文本，也保存错误文本。

### 7. 改造 ChatService

把：

```ts
reply(content: string): Promise<string>
```

改成：

```ts
reply(input: {
  content: string;
  recentMessages?: ConversationMessage[];
}): Promise<string>
```

调用模型时组装：

```ts
[
  { role: 'system', content: prompt },
  ...recentMessages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  })),
  { role: 'user', content: input.content },
]
```

只注入最近 12 条即可。

### 8. 新增 Admin API

新增：

```text
GET /admin/conversations
GET /admin/conversations/:sessionId/messages?limit=50
```

返回：

```ts
{
  items: [...]
}
```

注意：

- `sessionId` 可能包含特殊字符，路由里要 decode。
- 不返回敏感配置。

## 前端任务

### 1. API client

新增：

```ts
getConversations()
getConversationMessages(sessionId: string, limit?: number)
```

### 2. 页面

新增：

```text
admin-web/src/pages/Conversations.tsx
```

路径：

```text
/conversations
```

展示：

- 会话列表。
- sessionId。
- chatId。
- updatedAt。
- messageCount。
- 点击查看最近消息。

可以用 Ant Design：

```text
Table
Drawer
List
Tag
Typography
```

### 3. 菜单

在后台菜单增加：

```text
聊天记录
```

## 验收测试

### 构建测试

```bash
npm run build
npm test -- --runInBand --passWithNoTests
cd admin-web
npm run build
```

### Mock 上下文测试

请求 1：

```json
{
  "message_id": "ctx_001",
  "from_user": "ctx_user",
  "content": "我这次聊天里喜欢吃凉拌菜。"
}
```

请求 2：

```json
{
  "message_id": "ctx_002",
  "from_user": "ctx_user",
  "content": "那我中午吃啥？"
}
```

预期：

第二次回复能参考“凉拌菜”。

### 文件检查

确认生成：

```text
data/memory/sessions/*.json
```

### 后台检查

打开：

```text
http://127.0.0.1:5173/conversations
```

能看到会话和消息。

## 注意事项

- 不要把会话上下文当长期记忆。
- 不要把用户临时偏好写入长期记忆。
- 不要保存 token / api_key。
- 不要引入数据库。
- 不要改坏现有 iLink 收发。
- 所有新增文件使用 UTF-8。

