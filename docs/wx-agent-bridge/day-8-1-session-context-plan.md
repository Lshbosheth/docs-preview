# Day 8.1 聊天记录和会话上下文计划

## 目标

先让系统记住最近几轮对话。

当前 `wx-agent-bridge` 的聊天链路是无上下文的：

```text
当前消息
  -> ChatService
  -> 模型
```

Day 8.1 要改成：

```text
当前消息
  -> 保存用户消息
  -> 读取当前 chatId 最近 N 条消息
  -> ChatService 携带上下文调用模型
  -> 保存助手回复
```

这一步只做短期会话上下文，不做长期记忆、不做自动总结、不做向量检索。

## 为什么先做这个

长期记忆之前，必须先有原始聊天记录和会话上下文。

否则系统无法处理：

```text
刚才那个是什么？
你上面说的再展开一下
不是这个，是另一个
继续
```

第一版只要能接住最近上下文，就已经明显改善微信聊天体验。

## 范围

本阶段只做：

- 保存用户消息。
- 保存助手回复。
- 按 `chatId` 读取最近消息。
- ChatService 调模型时携带最近上下文。
- 提供最小查询 API。
- 管理后台可以看到最近会话。

本阶段不做：

- 长期用户记忆。
- 项目记忆。
- 记忆候选提取。
- embedding / vector search。
- 自动摘要。
- 跨用户权限系统。

## 数据结构

### ConversationMessage

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
```

### sessionId 规则

第一版直接用：

```text
weixin:{chatId}
```

注意：

- 私聊时 `chatId` 通常等于用户 id。
- 群聊后续再扩展，可以使用 `weixin:group:{chatId}`。

## 文件存储

第一版用 JSON 文件：

```text
data/memory/sessions/
  weixin-{safeChatId}.json
```

每个文件内容：

```json
{
  "sessionId": "weixin:o9cq808...",
  "chatId": "o9cq808...",
  "updatedAt": "2026-06-30T12:00:00.000Z",
  "messages": []
}
```

文件名要安全处理：

```text
把 @ / \ : 空格 等特殊字符替换成 -
```

## 模块设计

新增：

```text
src/memory/
  memory.module.ts
  memory.types.ts
  conversation-log.service.ts
  session-context.service.ts
  stores/
    json-conversation.store.ts
```

### ConversationLogService

职责：

```text
appendUserMessage(message: NormalizedMessage)
appendAssistantMessage(params)
listRecent(sessionId, limit)
listSessions()
```

### SessionContextService

职责：

```text
buildChatMessages(currentMessage)
```

返回给 LLM 的 messages：

```text
system prompt
recent user / assistant messages
current user message
```

注意：不要重复把当前用户消息放两次。

## Pipeline 接入点

当前主入口在：

```text
src/pipeline/pipeline.service.ts
```

建议改造：

```text
handleNormalizedMessage(message)
  -> conversationLog.appendUserMessage(message)
  -> command / task / chat
  -> conversationLog.appendAssistantMessage(...)
  -> return result
```

对 command、chat、planner、executor 的回复都要保存 assistant 消息。

如果某一步报错，也可以保存错误回复。

## ChatService 改造

当前：

```ts
reply(content: string): Promise<string>
```

建议改成：

```ts
reply(message: NormalizedMessage): Promise<string>
```

或者：

```ts
reply(input: {
  content: string;
  recentMessages?: ConversationMessage[];
}): Promise<string>
```

为了少改动，推荐第二种。

ChatService 内部把最近消息转成 LLM messages：

```ts
[
  { role: 'system', content: prompt },
  ...recentMessages.map(...),
  { role: 'user', content }
]
```

只保留最近 10-20 条，避免上下文太长。

## API

新增：

```text
GET /admin/conversations
GET /admin/conversations/:sessionId/messages?limit=50
```

返回时不要泄露 token / key。

第一版可以只做管理后台 API，不做微信命令。

## 管理后台

新增页面：

```text
/conversations
```

展示：

- 会话列表。
- chatId。
- 最近消息时间。
- 消息数量。
- 点击查看最近消息。

第一版只读即可。

## 验收标准

1. 后端 `npm run build` 通过。
2. 后端测试通过。
3. 前端 `npm run build` 通过。
4. 发送两轮 mock 消息后，第二轮模型能看到第一轮上下文。
5. 微信连续聊天时，模型能理解“刚才那个”“继续”。
6. `data/memory/sessions` 下生成会话 JSON 文件。
7. 后台能查看会话列表和消息。
8. 不保存 token、api_key、完整授权头。

## 测试建议

Mock 测试：

```text
第一条：我喜欢吃凉拌菜，记住这次聊天里。
第二条：那我中午吃啥？
```

预期：

```text
第二条回复能参考第一条里的凉拌菜。
```

注意：这只是会话上下文，不代表写入长期记忆。

