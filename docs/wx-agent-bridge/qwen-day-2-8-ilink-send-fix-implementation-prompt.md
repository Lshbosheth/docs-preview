# Qwen Day 2.8 iLink 发送接口修正实施提示词

下面这段可以直接发给 Qwen，让它专门修 iLink 文本发送接口。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 2.8：iLink 发送接口修正。

## 当前状态

已验证：

```text
ILinkClient.getUpdates()
POST https://ilinkai.weixin.qq.com/ilink/bot/getupdates
可以成功请求，返回 0 条消息时不报错。
```

但发送失败：

```text
POST https://ilinkai.weixin.qq.com/ilink/bot/send
返回 404 Not Found
```

说明当前发送 endpoint 不对。

## 目标

只修正文本发送：

```text
ILinkSender.sendText()
ILinkClient.sendText()
```

最终要让：

```text
POST /ilink/send-test
```

能真实给微信用户发送一条文本消息。

## 非目标

不要实现：

```text
扫码登录
图片
语音
文件
数据库
Redis
管理后台
模型链路
多进程
```

不要改 Planner / Guard / Executor。

## 配置改造

扩展 `config.yaml`：

```yaml
ilink:
  base_url: https://ilinkai.weixin.qq.com
  cdn_base_url: https://novac2c.cdn.weixin.qq.com/c2c
  account_id: ${ILINK_ACCOUNT_ID}
  token: ${ILINK_TOKEN}
  credential_file: ./data/ilink/credential.json
  mode: polling
  long_poll_timeout_ms: 35000
  poll_interval_ms: 1000
  send_text_endpoint: /ilink/bot/sendtext
```

同步更新：

```text
src/config/config.schema.ts
src/config/types.ts
```

新增：

```ts
send_text_endpoint?: string;
```

## ILinkClient 改造

所有 iLink HTTP 发送细节必须集中在：

```text
src/platform/weixin/ilink/ilink.client.ts
```

不要散落到 Adapter、Sender、Controller。

### sendText 目标

实现：

```ts
sendText(payload: ILinkSendTextPayload): Promise<void>
```

要求：

```text
1. 使用 resolveCredentials() 获取 accountId/token。
2. 优先使用 config.ilink.send_text_endpoint。
3. 如果未配置，使用有限候选 endpoint。
4. 每次失败记录 status 和 response body。
5. 成功就返回。
6. 全部失败后抛出汇总错误。
```

### 候选 endpoints

按顺序尝试：

```text
/ilink/bot/sendtext
/ilink/bot/sendmessage
/ilink/bot/send_msg
/ilink/bot/message/send
/ilink/bot/send
```

如果配置了 `send_text_endpoint`，只试配置项。

### 候选 body

集中实现 3 种 body：

候选 A：

```json
{
  "account_id": "xxx@im.bot",
  "to_user": "xxx@im.wechat",
  "chat_id": "xxx@im.wechat",
  "content": "hello"
}
```

候选 B：

```json
{
  "account_id": "xxx@im.bot",
  "receiver": "xxx@im.wechat",
  "content": "hello",
  "msg_type": "text"
}
```

候选 C：

```json
{
  "account_id": "xxx@im.bot",
  "to": "xxx@im.wechat",
  "text": "hello"
}
```

总尝试次数最多：

```text
endpoints.length * 3
```

不要无限重试。

### 日志要求

可以打印：

```text
endpoint
status
response body 前 300 字
to_user
```

不能打印：

```text
完整 token
完整 Authorization header
```

## 新增测试接口

在 `ILinkController` 新增：

```text
POST /ilink/send-test
```

请求体：

```json
{
  "to_user": "xxx@im.wechat",
  "chat_id": "xxx@im.wechat",
  "content": "wx-agent-bridge send test"
}
```

实现：

```ts
await this.sender.sendText(body.to_user, body.chat_id, body.content)
return { ok: true }
```

失败：

```ts
return { ok: false, error: message }
```

如果 `ILinkController` 当前只注入 Adapter，需要改成同时注入 `ILinkSender`。

## 验收

构建：

```bash
npm run build
```

启动时注入现有 cc-connect 凭证：

```powershell
$env:ILINK_ACCOUNT_ID="xxx@im.bot"
$env:ILINK_TOKEN="xxx@im.bot:xxxxx"
$env:PORT="3100"
npm run start:prod
```

确认登录状态：

```bash
curl http://localhost:3100/ilink/auth/status
```

发送测试：

```bash
curl -X POST http://localhost:3100/ilink/send-test ^
  -H "Content-Type: application/json" ^
  -d "{\"to_user\":\"xxx@im.wechat\",\"chat_id\":\"xxx@im.wechat\",\"content\":\"wx-agent-bridge send test\"}"
```

模拟入站命令并自动回复：

```bash
curl -X POST http://localhost:3100/ilink/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"send_fix_001\",\"from_user\":\"xxx@im.wechat\",\"chat_id\":\"xxx@im.wechat\",\"content\":\"/status\"}"
```

## 验收标准

```text
1. npm run build 通过。
2. /ilink/auth/status 显示 loggedIn=true。
3. /ilink/send-test 至少能找到正确发送 endpoint 或输出清晰失败汇总。
4. 如果发送成功，微信能收到文本。
5. /ilink/webhook 入站 /status 能自动发回微信。
6. token 不出现在日志里。
```

## 重要提醒

如果所有候选 endpoint 都 404，不要继续乱猜。

请把每个 endpoint 的 status/body 汇总返回，方便下一步对照 cc-connect 抓包或文档继续修。
