# Qwen Day 2.5 iLink 微信接入实施提示词

下面这段可以直接发给 Qwen，让它基于 Day 2 代码继续实现 iLink 接入。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` Day 2 项目继续开发 Day 2.5：iLink 微信接入。

## 当前已有能力

项目已经有：

```text
NestJS 服务
config.yaml 配置读取
GET /health
POST /mock/message
MessageNormalizerService
CommandRouterService
PipelineService
PipelineService.handleNormalizedMessage(message)
微信平台抽象 WeixinClient / WeixinAdapter / WeixinSender
```

Day 1 的 `/mock/message` 必须继续可用。

Day 2 的微信抽象不要破坏。

## Day 2.5 目标

实现 iLink 作为微信平台驱动：

```text
iLink 消息进入系统
iLink 原始消息转成 NormalizedMessage
进入已有 Pipeline
拿到 replyText
通过 iLink 发回微信
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
图片、语音、文件
```

只实现 iLink 文本消息收发。

## 新增文件

请新增：

```text
src/platform/weixin/ilink/
  ilink.module.ts
  ilink.client.ts
  ilink.adapter.ts
  ilink.sender.ts
  ilink-message.mapper.ts
  ilink.controller.ts
  types.ts
```

并把 `ILinkModule` 导入到现有 `WeixinModule` 或 `PlatformModule`。

## 配置要求

扩展 `config.yaml` 的 platform 配置：

```yaml
platform:
  type: weixin
  driver: ilink
  ilink:
    base_url: ${ILINK_BASE_URL}
    token: ${ILINK_TOKEN}
    bot_id: ${ILINK_BOT_ID}
    mode: webhook
    webhook_path: /ilink/webhook
    poll_interval_ms: 3000
```

如果当前配置结构是放在 project 内，也可以放在：

```yaml
projects:
  - name: default
    platform:
      type: weixin
      driver: ilink
      ilink:
        base_url: ${ILINK_BASE_URL}
        token: ${ILINK_TOKEN}
        bot_id: ${ILINK_BOT_ID}
        mode: webhook
        webhook_path: /ilink/webhook
        poll_interval_ms: 3000
```

请同步更新 zod 配置 schema。

Day 2.5 不需要真实环境变量存在，但配置结构必须能通过校验。

## 类型定义

`src/platform/weixin/ilink/types.ts`：

```ts
export type ILinkRawMessage = {
  message_id?: string;
  msg_id?: string;
  id?: string;
  from_user?: string;
  from?: string;
  user_id?: string;
  chat_id?: string;
  room_id?: string;
  chat_type?: "private" | "group";
  type?: string;
  content_type?: string;
  content?: string;
  text?: string;
  created_at?: string;
  timestamp?: number;
  raw?: unknown;
};

export type ILinkSendTextPayload = {
  to_user: string;
  chat_id?: string;
  content: string;
};
```

字段兼容多个命名，是为了适配 iLink 实际字段可能不同的情况。

## ILinkMessageMapper 要求

创建 `ILinkMessageMapper`，提供：

```ts
toNormalizedMessage(raw: ILinkRawMessage): NormalizedMessage
```

映射规则：

```text
message_id || msg_id || id -> messageId
from_user || from || user_id -> fromUser
chat_id || room_id || fromUser -> chatId
chat_type || room_id ? "group" : "private" -> chatType
content_type || type || "text" -> contentType
content || text -> content
created_at || timestamp || now -> createdAt
platform -> "weixin"
raw -> raw
```

如果缺少：

```text
messageId
fromUser
content
```

抛出清晰错误。

Day 2.5 只处理文本：

```text
contentType 必须是 text
非文本消息先忽略或返回“不支持该消息类型”
```

## ILinkClient 要求

从 config 读取：

```text
base_url
token
bot_id
```

提供：

```ts
sendText(payload: ILinkSendTextPayload): Promise<void>
```

如果 iLink 支持轮询，再提供：

```ts
getUpdates(): Promise<ILinkRawMessage[]>
```

HTTP 实现先按通用方式写，后续可按真实 iLink 文档调整：

发送文本：

```text
POST {base_url}/send
Authorization: Bearer {token}
Content-Type: application/json
```

请求体：

```json
{
  "bot_id": "xxx",
  "to_user": "wx_user_001",
  "chat_id": "wx_user_001",
  "content": "回复内容"
}
```

## ILinkSender 要求

封装：

```ts
sendText(toUser: string, chatId: string | undefined, content: string): Promise<void>
```

内部调用 `ILinkClient.sendText()`。

## ILinkAdapter 要求

提供：

```ts
handleRawMessage(raw: ILinkRawMessage): Promise<void>
```

流程：

```text
1. ILinkMessageMapper.toNormalizedMessage(raw)
2. messageId 去重
3. PipelineService.handleNormalizedMessage(message)
4. ILinkSender.sendText(message.fromUser, message.chatId, result.replyText)
5. 打印日志
```

去重先用内存：

```ts
private readonly processedMessageIds = new Set<string>();
```

如果项目已有 Day 2 的去重服务，可以复用；否则先在 ILinkAdapter 内实现。

## ILinkController 要求

提供 Webhook 接口：

```text
POST /ilink/webhook
```

请求体就是 iLink 原始消息。

调用：

```ts
ILinkAdapter.handleRawMessage(req.body)
```

返回：

```json
{
  "ok": true
}
```

如果处理失败，返回合理错误，并在日志打印原因。

## 可选 Polling 接口

如果 Day 2 已经有 poll-once 风格，可以新增：

```text
POST /ilink/poll-once
```

调用 `ILinkClient.getUpdates()` 并逐条处理。

如果 iLink 当前只走 Webhook，可以先不做 poll-once。

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

测试 iLink Webhook：

```bash
curl -X POST http://localhost:3000/ilink/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"ilink_msg_001\",\"from_user\":\"wx_user_001\",\"chat_id\":\"wx_user_001\",\"content\":\"/status\"}"
```

普通消息：

```bash
curl -X POST http://localhost:3000/ilink/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"ilink_msg_002\",\"from_user\":\"wx_user_001\",\"chat_id\":\"wx_user_001\",\"content\":\"你好\"}"
```

## 验收标准

必须满足：

```text
1. GET /health 正常。
2. POST /mock/message 正常。
3. POST /ilink/webhook 可用。
4. iLink /status 消息能进入 Pipeline。
5. iLink 普通文本能进入 Pipeline。
6. iLinkSender 会尝试调用 ILinkClient.sendText。
7. 重复 message_id 只处理一次。
8. 日志里能看到 ilink messageId、fromUser、reply sent 或 duplicate。
```

## 输出要求

请直接修改代码。

完成后运行测试命令。

不要扩展 Day 2.5 范围。

不要实现大模型、Planner、Guard、Executor、数据库、Redis、队列、多进程。

只完成 iLink 文本消息接入。
