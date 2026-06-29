# Qwen Day 3 模型 Provider 和 Chat Layer 实施提示词

下面这段可以直接发给 Qwen，让它基于 Day 2.5 代码继续实现 Day 3。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 3：模型 Provider 和 Chat Layer。

## 当前已有能力

```text
NestJS 服务
config.yaml
GET /health
POST /mock/message
微信 / iLink 入口
PipelineService.handleNormalizedMessage(message)
CommandRouterService
普通文本固定回复
```

已有入口必须继续可用。

## Day 3 目标

实现：

```text
LLMProvider 统一接口
OpenAI Compatible Provider
ProviderFactory
ChatService
普通文本调用 chatModel 返回回复
命令仍然不调用模型
```

## 非目标

不要实现：

```text
Planner
TaskSchema
Guard
Executor
数据库
Redis
队列
工具调用
文件读写
Shell
```

## 新增文件

```text
src/llm/
  llm.module.ts
  types.ts
  openai-compatible.provider.ts
  provider-factory.service.ts

src/chat/
  chat.module.ts
  chat.service.ts
```

并更新 `AppModule` / `PipelineModule` 依赖。

## LLM 类型

`src/llm/types.ts`：

```ts
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export interface LLMProvider {
  chat(messages: ChatMessage[], options: ChatOptions): Promise<string>;
}
```

## OpenAI Compatible Provider

实现 `OpenAICompatibleProvider`：

```ts
constructor(config: { apiKey: string; baseUrl: string })
chat(messages, options): Promise<string>
```

请求：

```text
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json
```

body：

```json
{
  "model": "qwen-plus",
  "messages": [],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

解析：

```text
choices[0].message.content
```

如果 API key 缺失或请求失败，抛出清晰错误。

## ProviderFactory

实现：

```ts
create(providerName: string): LLMProvider
```

从 `config.yaml` 的 `providers` 中读取 provider 配置。

Day 3 只需要支持：

```text
openai_compatible
```

如果 provider type 不支持，抛出清晰错误。

## ChatService

实现：

```ts
reply(content: string): Promise<string>
```

流程：

```text
1. 读取 default project 的 models.chat
2. ProviderFactory 创建 provider
3. 拼 messages
4. 调 provider.chat()
5. 返回模型回复
```

system prompt：

```text
你是微信 AI Agent Bridge 的聊天层。
你只负责普通聊天、简单问答、命令说明和状态说明。
你不能执行任务。
你不能调用工具。
你不能访问文件。
你不能访问网络。
如果用户请求明显是开发任务、代码生成、SQL 生成、复杂计划，请提示该请求应交给后续任务流程处理。
```

## Pipeline 调整

调整 `PipelineService.handleNormalizedMessage()`：

```text
1. 如果是命令，继续走 CommandRouter
2. 如果不是命令，调用 ChatService.reply(message.content)
3. 返回 { replyText, handledBy: "chat" }
```

如果当前 `PipelineResult.handledBy` 类型没有 `"chat"`，请补上。

## 验收

启动：

```bash
npm run start:dev
```

命令仍然可用：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_301\",\"from_user\":\"wx_user_001\",\"content\":\"/status\"}"
```

普通聊天：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_302\",\"from_user\":\"wx_user_001\",\"content\":\"你好，介绍一下你能做什么\"}"
```

## 验收标准

```text
1. /status 不调用模型。
2. 普通文本调用 chatModel。
3. 模型失败时返回清晰错误。
4. mock、weixin、ilink 入口不被破坏。
5. 不实现 Planner、Guard、Executor。
```
