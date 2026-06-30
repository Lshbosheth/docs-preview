# Day 2.9 SDK 二维码绑定测试清单

## 当前状态

`@wechatbot/wechatbot` SDK 已接入，并且：

```text
POST /ilink/auth/start
```

已经可以返回真实微信二维码 URL：

```text
https://liteapp.weixin.qq.com/q/...
```

这说明现在可以开始扫码绑定测试。

## 测试流程

### 1. 启动服务

```powershell
$env:PORT="3100"
$env:QWEN_API_KEY="你的百炼 API Key"
npm run start:prod
```

### 2. 查看登录状态

```bash
curl http://localhost:3100/ilink/auth/status
```

未登录时：

```json
{
  "loggedIn": false
}
```

### 3. 获取二维码 URL

```bash
curl -X POST http://localhost:3100/ilink/auth/start
```

期望：

```json
{
  "ok": true,
  "qrUrl": "https://liteapp.weixin.qq.com/q/...",
  "loginId": "sdk-qr"
}
```

打开 `qrUrl`，用微信扫码。

### 4. 轮询登录状态

扫码后执行：

```bash
curl -X POST http://localhost:3100/ilink/auth/poll
```

或：

```bash
curl http://localhost:3100/ilink/auth/status
```

成功时：

```json
{
  "loggedIn": true,
  "account_id": "xxx"
}
```

### 5. 发送测试

登录成功后，先找一个 `to_user`。

如果还没有收到过消息，可以先用旧 cc-connect 配置里的 `allow_from` 测。

```bash
curl -X POST http://localhost:3100/ilink/send-test ^
  -H "Content-Type: application/json" ^
  -d "{\"to_user\":\"你的微信 user id\",\"chat_id\":\"你的微信 user id\",\"content\":\"wx-agent-bridge SDK send test\"}"
```

### 6. 收消息测试

给机器人发：

```text
/status
```

然后触发：

```bash
curl -X POST http://localhost:3100/ilink/poll-once
```

期望：

```text
服务收到消息
Pipeline 处理 /status
微信收到状态回复
```

## 注意事项

```text
1. qrUrl 有有效期，过期就重新调用 /ilink/auth/start。
2. SDK 登录态保存在 data/ilink/sdk-storage。
3. 不要把 data/ilink/sdk-storage 提交到 git。
4. 如果 /auth/status 仍是 false，查看服务日志里的 Login confirmed。
5. 如果 send-test 失败，先确认 SDK 已 loggedIn=true。
6. 如果 poll-once 收不到消息，先确认已给绑定机器人发过新消息。
```

## 当前实测记录

本地已验证：

```text
GET /health -> ok
GET /ilink/auth/status -> loggedIn=false
POST /ilink/auth/start -> ok=true，并返回 liteapp.weixin.qq.com 二维码 URL
npm run build -> 通过
npm test -> 2 个测试套件通过，11 个测试通过
```
