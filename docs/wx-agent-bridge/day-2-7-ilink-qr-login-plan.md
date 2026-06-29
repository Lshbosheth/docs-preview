# Day 2.7 iLink 扫码登录计划

## 背景

Day 2.6 解决的是：

```text
已有 account_id/token 时，如何通过 iLink 长轮询收发微信消息。
```

但如果从零启动，还需要：

```text
生成二维码
微信扫码
轮询登录状态
拿到 account_id/token
保存凭证
后续长轮询复用凭证
```

cc-connect 当前能跑，是因为配置里已经有：

```text
account_id = xxx@im.bot
token = xxx@im.bot:xxxxx
```

并且历史目录里有 `weixin-qr.png`，说明它曾经做过扫码绑定。

## 目标

Day 2.7 实现 iLink 登录/绑定能力：

```text
请求 iLink 创建登录会话
保存二维码图片
提供二维码查看接口
轮询扫码状态
登录成功后保存 account_id/token
让 Day 2.6 长轮询读取保存后的凭证
```

## 不做事项

```text
不做图片消息
不做语音
不做文件
不做多账号
不做 token 自动刷新
不做 Web 管理后台
不做数据库
```

## 新增模块

```text
src/platform/weixin/ilink/auth/
  ilink-auth.module.ts
  ilink-auth.service.ts
  ilink-auth.controller.ts
  ilink-auth.types.ts

src/storage/
  credential-store.service.ts
```

如果暂时不想新增 StorageModule，可以先把凭证保存逻辑放在 `ILinkAuthService` 内，但建议独立出来。

## 数据保存位置

开发阶段先保存到本地 JSON：

```text
data/ilink/credential.json
data/ilink/login-session.json
data/ilink/qr.png
```

`credential.json` 示例：

```json
{
  "account_id": "xxx@im.bot",
  "token": "xxx@im.bot:xxxxx",
  "created_at": "2026-06-29T12:00:00.000Z",
  "updated_at": "2026-06-29T12:00:00.000Z"
}
```

## 配置调整

`config.yaml` 支持两种模式：

### 1. 手动配置凭证

```yaml
ilink:
  base_url: https://ilinkai.weixin.qq.com
  cdn_base_url: https://novac2c.cdn.weixin.qq.com/c2c
  account_id: ${ILINK_ACCOUNT_ID}
  token: ${ILINK_TOKEN}
```

### 2. 本地凭证文件

```yaml
ilink:
  base_url: https://ilinkai.weixin.qq.com
  cdn_base_url: https://novac2c.cdn.weixin.qq.com/c2c
  credential_file: ./data/ilink/credential.json
```

优先级：

```text
环境变量 / config.yaml 明确配置 > credential_file
```

## 登录流程

具体 iLink 登录接口可能需要根据真实 API 调整。先把逻辑集中在 `ILinkAuthService`，方便后面修 endpoint。

推荐流程：

```text
POST /ilink/auth/start
  -> ILinkAuthService.startLogin()
  -> 调 iLink 创建登录二维码
  -> 保存 qr.png 和 login-session.json
  -> 返回二维码路径/URL

GET /ilink/auth/qr
  -> 返回二维码图片

POST /ilink/auth/poll
  -> ILinkAuthService.pollLogin()
  -> 查询扫码状态
  -> 成功则保存 account_id/token

GET /ilink/auth/status
  -> 查看当前是否已有可用凭证
```

## API 设计

### POST /ilink/auth/start

返回：

```json
{
  "ok": true,
  "qrUrl": "/ilink/auth/qr",
  "qrPath": "data/ilink/qr.png",
  "loginId": "xxx"
}
```

### GET /ilink/auth/qr

返回二维码图片。

### POST /ilink/auth/poll

返回：

```json
{
  "status": "pending | scanned | confirmed | expired",
  "account_id": "xxx@im.bot"
}
```

登录成功时保存：

```text
credential.json
```

### GET /ilink/auth/status

返回：

```json
{
  "loggedIn": true,
  "account_id": "xxx@im.bot"
}
```

不要返回完整 token。

## 和 Day 2.6 的关系

`ILinkClient` 获取凭证时：

```text
1. 先读 config.yaml 里的 account_id/token
2. 如果为空，再读 credential_file
3. 如果仍然没有，提示需要扫码登录
```

## 验收标准

```text
1. POST /ilink/auth/start 能创建登录会话。
2. GET /ilink/auth/qr 能返回二维码图片。
3. POST /ilink/auth/poll 能查询登录状态。
4. 登录成功后 credential.json 保存 account_id/token。
5. GET /ilink/auth/status 不泄露完整 token。
6. Day 2.6 的 ILinkClient 能读取 credential_file。
7. /mock/message 不受影响。
```

## 注意

iLink 登录接口的真实 endpoint 需要通过现有 cc-connect 行为、接口文档或抓包确认。

Day 2.7 的重点是把登录流程和凭证存储架构搭好，具体 endpoint 可以集中在 `ILinkAuthService` 中微调。
