# Qwen Day 2.6 iLink 长轮询改造实施提示词

下面这段可以直接发给 Qwen，让它把 iLink 接入改成 cc-connect 同款长轮询。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 2.6：iLink 长轮询改造。

## 背景

cc-connect 当前微信接入不是 webhook，也不是本地 iLink 服务。

它直接请求：

```text
POST https://ilinkai.weixin.qq.com/ilink/bot/getupdates
```

配置里有：

```text
base_url = https://ilinkai.weixin.qq.com
cdn_base_url = https://novac2c.cdn.weixin.qq.com/c2c
account_id = xxx@im.bot
token = xxx@im.bot:xxxxx
long_poll_timeout_ms = 35000
```

所以本项目也要改成长轮询。

## 当前已有能力

项目已有：

```text
ILinkModule
ILinkClient
ILinkAdapter
ILinkSender
ILinkMessageMapper
ILinkController
POST /ilink/webhook
POST /ilink/poll-once
PipelineService.handleNormalizedMessage()
```

现在要重点改造 `ILinkClient` 和配置结构。

## 目标

实现：

```text
ILinkClient.getUpdates() 调用 /ilink/bot/getupdates
ILinkAdapter.pollOnce() 使用真实长轮询
返回消息进入 Pipeline
PipelineResult.replyText 通过 ILinkSender 发回
```

## 非目标

不要实现：

```text
公网 webhook
内网穿透
图片
语音
文件
数据库
Redis
队列
多进程
```

## 配置修改

修改 `config.yaml`：

```yaml
platform:
  type: weixin
  driver: ilink
  ilink:
    base_url: https://ilinkai.weixin.qq.com
    cdn_base_url: https://novac2c.cdn.weixin.qq.com/c2c
    account_id: ${ILINK_ACCOUNT_ID}
    token: ${ILINK_TOKEN}
    mode: polling
    long_poll_timeout_ms: 35000
    poll_interval_ms: 1000
```

如果当前 platform 在 project 内，就改 project 内的 platform。

同步更新：

```text
src/config/config.schema.ts
src/config/types.ts
```

新增字段：

```ts
cdn_base_url?: string;
account_id: string;
long_poll_timeout_ms?: number;
```

可以移除或不再依赖：

```text
bot_id
webhook_path
mode: webhook
```

## ILinkClient 改造

`ILinkClient` 从配置读取：

```text
base_url
cdn_base_url
account_id
token
long_poll_timeout_ms
```

实现：

```ts
getUpdates(): Promise<ILinkRawMessage[]>
sendText(payload: ILinkSendTextPayload): Promise<void>
```

`getUpdates()`：

```text
POST {base_url}/ilink/bot/getupdates
Authorization: Bearer {token}
Content-Type: application/json
```

body 先按这个实现：

```json
{
  "account_id": "xxx@im.bot",
  "timeout_ms": 35000
}
```

兼容返回：

```json
{
  "messages": []
}
```

以及：

```json
{
  "updates": []
}
```

以及直接数组：

```json
[]
```

如果接口返回错误，抛出包含 status 和 response body 的清晰错误。

## sendText 改造

由于发送接口字段可能需要按真实 iLink API 调整，先保留现有 sendText，但将 endpoint 改为 iLink 风格：

```text
POST {base_url}/ilink/bot/send
```

header：

```text
Authorization: Bearer {token}
Content-Type: application/json
```

body：

```json
{
  "account_id": "xxx@im.bot",
  "to_user": "xxx@im.wechat",
  "chat_id": "xxx@im.wechat",
  "content": "回复内容"
}
```

如果真实 iLink 发送接口不一致，请在代码里集中封装，方便后续调整。

## ILinkAdapter

确保 `pollOnce()` 流程是：

```text
1. ILinkClient.getUpdates()
2. 遍历 raw messages
3. ILinkMessageMapper.toNormalizedMessage(raw)
4. message_id 去重
5. PipelineService.handleNormalizedMessage(message)
6. ILinkSender.sendText(message.fromUser, message.chatId, result.replyText)
```

去重仍然先用内存 Set。

## ILinkController

保留：

```text
POST /ilink/poll-once
```

用于手动触发一次长轮询。

`/ilink/webhook` 可以保留，但标记为兼容入口，不作为主路径。

## 验收

启动：

```bash
npm run build
npm run start:prod
```

确认 mock 不受影响：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_2601\",\"from_user\":\"wx_user_001\",\"content\":\"/status\"}"
```

触发 iLink 长轮询：

```bash
curl -X POST http://localhost:3000/ilink/poll-once
```

## 验收标准

```text
1. npm run build 通过。
2. config.yaml 可以配置 cc-connect 同款 iLink 字段。
3. /ilink/poll-once 会调用 POST /ilink/bot/getupdates。
4. getupdates 返回空数组时不报错。
5. getupdates 返回消息时进入 Pipeline。
6. replyText 通过 ILinkSender 发回。
7. 重复 message_id 不重复处理。
8. /mock/message 仍然可用。
```

## 重要说明

如果真实 iLink API 的 body 或 send endpoint 和上面不同，不要把逻辑散落在 Adapter 里。

所有 iLink HTTP 细节必须集中在：

```text
ILinkClient
```

这样后面只改一个文件。
