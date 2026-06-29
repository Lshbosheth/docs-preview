# Day 2.6 iLink 长轮询改造计划

## 背景

cc-connect 当前不是 webhook 模式，也不是连接本地 iLink 服务。

它直接请求微信 iLink 服务：

```text
POST https://ilinkai.weixin.qq.com/ilink/bot/getupdates
```

配置里使用：

```text
base_url = https://ilinkai.weixin.qq.com
cdn_base_url = https://novac2c.cdn.weixin.qq.com/c2c
account_id = xxx@im.bot
token = xxx@im.bot:xxxxx
long_poll_timeout_ms = 35000
```

所以我们的 `wx-agent-bridge` 也应该先采用长轮询，而不是 webhook。

## 目标

把 Day 2.5 的 iLink 接入改成 cc-connect 同款长轮询模式：

```text
wx-agent-bridge
  -> POST /ilink/bot/getupdates
  -> 收到微信消息
  -> 转 NormalizedMessage
  -> Pipeline
  -> 通过 iLink 发回微信
```

## 不做事项

```text
不做公网 webhook
不做内网穿透
不做图片、语音、文件
不做数据库
不做 Redis 队列
不做多进程
```

## 配置调整

`config.yaml` 中 iLink 配置改成：

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

保留 `poll_interval_ms` 是为了失败后退避和本地调试。

## 核心改造

### ILinkClient

需要实现：

```ts
getUpdates(): Promise<ILinkRawMessage[]>
sendText(payload): Promise<void>
```

`getUpdates()` 使用：

```text
POST {base_url}/ilink/bot/getupdates
```

请求参数按 cc-connect 配置推断至少需要：

```json
{
  "account_id": "xxx@im.bot",
  "timeout_ms": 35000
}
```

鉴权使用 token。

具体 header/body 字段如果和真实 iLink 返回不一致，优先按实际接口调整。

### ILinkAdapter

需要支持：

```ts
pollOnce(): Promise<void>
startPolling(): void
stopPolling(): void
```

第一阶段可以先只用 `pollOnce()` 测通。

后续再让服务启动后自动 `startPolling()`。

## 消息映射

iLink 原始消息字段需要兼容多种命名：

```text
message_id / msg_id / id
from_user / from / user_id
chat_id / room_id
content / text
created_at / timestamp
```

只处理文本消息。

非文本消息先忽略。

## 去重

继续使用内存 Set：

```ts
processedMessageIds
```

后续再迁移到 SQLite 或 Redis。

## 验收标准

```text
1. config.yaml 支持 account_id、cdn_base_url、long_poll_timeout_ms。
2. /ilink/poll-once 调用真实 getupdates endpoint。
3. getupdates 返回文本消息后，能进入 Pipeline。
4. /help、/status 这类消息能生成 replyText。
5. sendText 会调用真实 iLink 发送接口。
6. 重复 message_id 不重复处理。
7. /mock/message 仍然可用。
8. 不再把 ILINK_BASE_URL 理解成本地服务地址。
```

## 注意

这一步可能需要根据真实 iLink API 调整：

```text
getupdates 请求 body
sendText endpoint
sendText 请求 body
返回 JSON 字段
```

但架构方向不变：

```text
长轮询拉消息，不走 webhook。
```
