# Qwen Day 2 微信入口实施提示词

下面这段可以直接发给 Qwen，让它基于 Day 1 代码继续实现 Day 2。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` Day 1 项目继续开发 Day 2。

## 当前已有能力

项目已经有：

```text
NestJS 服务
config.yaml 配置读取
POST /mock/message
GET /health
MessageNormalizerService
CommandRouterService
PipelineService
/help、/status、/model、/mode、/dir
普通文本固定回复
```

Day 1 的 mock 接口必须继续可用，不要破坏。

## Day 2 目标

实现真实微信入口闭环：

```text
微信消息进入系统
微信消息转成 NormalizedMessage
进入已有 Pipeline
拿到 replyText
发回微信
重复 message_id 不重复处理
```

## 非目标

不要实现：

```text
大模型
Planner
TaskSchema
Guard
Executor
数据库
Redis
队列
多进程
Web 管理后台
图片、语音、文件消息
```

只实现微信文本入口。

## 新增文件

请新增：

```text
src/platform/
  platform.module.ts

src/platform/weixin/
  weixin.module.ts
  weixin.client.ts
  weixin.adapter.ts
  weixin.sender.ts
  weixin-message.mapper.ts
  types.ts
```

并在 `AppModule` 中导入 `PlatformModule` 或 `WeixinModule`。

## 类型定义

`src/platform/weixin/types.ts`：

```ts
export type WeixinRawMessage = {
  message_id: string;
  from_user: string;
  chat_id?: string;
  chat_type?: "private" | "group";
  content_type?: "text";
  content: string;
  created_at?: string;
  raw?: unknown;
};

export type WeixinSendTextPayload = {
  to_user: string;
  chat_id?: string;
  content: string;
};
```

## WeixinMessageMapper 要求

创建 `WeixinMessageMapper`，提供：

```ts
toNormalizedMessage(raw: WeixinRawMessage): NormalizedMessage
```

映射规则：

```text
message_id -> messageId
platform -> "weixin"
from_user -> fromUser
chat_id || from_user -> chatId
chat_type || "private" -> chatType
content_type || "text" -> contentType
content -> content
created_at || new Date().toISOString() -> createdAt
raw -> raw
```

如果缺少 `message_id`、`from_user`、`content`，抛出清晰错误。

## PipelineService 调整

如果当前只有：

```ts
handle(rawMessage: unknown): Promise<PipelineResult>
```

请新增：

```ts
handleNormalizedMessage(message: NormalizedMessage): Promise<PipelineResult>
```

要求：

```text
1. command 判断和普通文本固定回复逻辑放到 handleNormalizedMessage
2. handle(rawMessage) 只负责 normalize mock 消息，然后调用 handleNormalizedMessage
3. mock 入口行为不变
```

这样微信入口可以直接复用 `handleNormalizedMessage`。

## WeixinClient 要求

`WeixinClient` 从 config.yaml 读取：

```text
platform.base_url
platform.token
```

提供两个方法：

```ts
getUpdates(): Promise<WeixinRawMessage[]>
sendText(payload: WeixinSendTextPayload): Promise<void>
```

Day 2 先按通用 HTTP 接口实现：

```text
GET {base_url}/updates
Authorization: Bearer {token}
```

返回期望：

```json
{
  "messages": [
    {
      "message_id": "msg_001",
      "from_user": "wx_user_001",
      "content": "/status"
    }
  ]
}
```

发送：

```text
POST {base_url}/send
Authorization: Bearer {token}
Content-Type: application/json
```

请求体：

```json
{
  "to_user": "wx_user_001",
  "chat_id": "wx_user_001",
  "content": "回复内容"
}
```

如果当前项目没有 HTTP 客户端，可以使用 Node 18+ 自带 `fetch`。

## WeixinSender 要求

封装：

```ts
sendText(toUser: string, chatId: string | undefined, content: string): Promise<void>
```

内部调用 `WeixinClient.sendText()`。

## WeixinAdapter 要求

提供：

```ts
pollOnce(): Promise<void>
```

流程：

```text
1. 调用 WeixinClient.getUpdates()
2. 遍历消息
3. 如果 message_id 已处理，跳过并打印 duplicate 日志
4. 未处理则加入 processedMessageIds
5. 使用 WeixinMessageMapper 转 NormalizedMessage
6. 调用 PipelineService.handleNormalizedMessage(message)
7. 调用 WeixinSender.sendText(message.fromUser, message.chatId, result.replyText)
8. 打印处理日志
```

去重先用内存：

```ts
private readonly processedMessageIds = new Set<string>();
```

## 测试入口

为了不依赖真实轮询，请新增一个手动触发接口：

```text
POST /weixin/poll-once
```

调用 `WeixinAdapter.pollOnce()`，返回：

```json
{
  "ok": true
}
```

这个接口只用于 Day 2 本地测试。

## AppModule 要求

导入：

```text
PlatformModule 或 WeixinModule
```

确保 Day 1 的：

```text
GET /health
POST /mock/message
```

仍然可用。

## 验收命令

启动：

```bash
npm run start:dev
```

确认 Day 1 未损坏：

```bash
curl http://localhost:3000/health
```

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_001\",\"from_user\":\"wx_user_001\",\"content\":\"/status\"}"
```

触发微信轮询：

```bash
curl -X POST http://localhost:3000/weixin/poll-once
```

## 验收标准

必须满足：

```text
1. GET /health 仍然正常。
2. POST /mock/message 仍然正常。
3. POST /weixin/poll-once 能调用 WeixinAdapter.pollOnce。
4. WeixinClient.getUpdates 返回消息后，可以进入 Pipeline。
5. /help、/status 微信消息能得到对应 replyText。
6. 普通微信文本能得到固定回复。
7. 同一 message_id 重复出现时只处理一次。
8. 日志里能看到 message_id、from_user、duplicate、reply sent。
```

## 输出要求

请直接修改代码。

完成后运行测试命令。

不要扩展 Day 2 范围。

不要实现真实大模型、Planner、Guard、Executor、数据库、Redis、队列、多进程。

只完成微信文本入口闭环。
