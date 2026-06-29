# Qwen Day 2.7 iLink 扫码登录实施提示词

下面这段可以直接发给 Qwen，让它补 iLink 二维码登录和凭证保存。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 2.7：iLink 扫码登录。

## 背景

Day 2.6 已经把 iLink 改成长轮询模式：

```text
POST https://ilinkai.weixin.qq.com/ilink/bot/getupdates
```

但长轮询需要：

```text
account_id
token
```

如果没有这些凭证，就需要先扫码登录/绑定。

cc-connect 当前能跑，是因为它已经有：

```text
account_id = xxx@im.bot
token = xxx@im.bot:xxxxx
```

现在本项目要补：

```text
生成二维码
轮询扫码状态
保存 account_id/token
让 ILinkClient 读取保存后的凭证
```

## 当前已有能力

项目已有：

```text
ILinkClient
ILinkAdapter
ILinkSender
ILinkMessageMapper
ILinkController
POST /ilink/poll-once
PipelineService
```

不要破坏已有接口。

## 目标

实现：

```text
POST /ilink/auth/start
GET /ilink/auth/qr
POST /ilink/auth/poll
GET /ilink/auth/status
本地保存 credential.json
ILinkClient 优先读取 config，其次读取 credential_file
```

## 非目标

不要实现：

```text
多账号
Web 管理后台
数据库
Redis
图片消息
语音
文件
token 自动刷新
```

## 新增文件

```text
src/platform/weixin/ilink/auth/
  ilink-auth.module.ts
  ilink-auth.controller.ts
  ilink-auth.service.ts
  ilink-auth.types.ts

src/storage/
  storage.module.ts
  credential-store.service.ts
```

如果已有 storage 目录，请复用。

## 配置修改

扩展 iLink 配置：

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
```

同步更新：

```text
src/config/config.schema.ts
src/config/types.ts
```

新增：

```ts
credential_file?: string;
```

## CredentialStoreService

实现：

```ts
readCredential(filePath: string): ILinkCredential | null
writeCredential(filePath: string, credential: ILinkCredential): void
maskToken(token: string): string
```

类型：

```ts
export type ILinkCredential = {
  account_id: string;
  token: string;
  created_at: string;
  updated_at: string;
};
```

要求：

```text
1. 自动创建 data/ilink 目录。
2. 写入 JSON 使用 UTF-8。
3. status 接口不得返回完整 token。
```

## ILinkClient 凭证读取改造

现在 `ILinkClient` 不能只依赖 config 里的 account_id/token。

改成：

```text
1. 如果 config.ilink.account_id 和 token 非空，使用 config。
2. 否则读取 config.ilink.credential_file。
3. 如果仍然没有，抛出：iLink credential missing, please scan login QR first.
```

## ILinkAuthService

实现：

```ts
startLogin(): Promise<StartLoginResult>
pollLogin(): Promise<PollLoginResult>
getStatus(): Promise<AuthStatus>
getQrPath(): string
```

类型：

```ts
export type StartLoginResult = {
  ok: boolean;
  qrUrl: string;
  qrPath: string;
  loginId: string;
};

export type PollLoginResult = {
  status: "pending" | "scanned" | "confirmed" | "expired";
  account_id?: string;
};

export type AuthStatus = {
  loggedIn: boolean;
  account_id?: string;
  token_masked?: string;
};
```

## 登录接口说明

iLink 真实登录 endpoint 可能需要根据接口文档或实际测试调整。

请先把所有 HTTP 细节集中写在 `ILinkAuthService`，不要散落到 Controller。

先按占位 endpoint 实现，并写清晰 TODO：

```text
POST {base_url}/ilink/bot/login/qrcode
POST {base_url}/ilink/bot/login/status
```

`startLogin()` 期望兼容返回：

```json
{
  "login_id": "xxx",
  "qr_code": "base64...",
  "qr_url": "https://..."
}
```

如果返回 `qr_code` 是 base64，则保存成：

```text
data/ilink/qr.png
```

如果返回 `qr_url`，可以下载图片保存，或者先保存 URL 到 login-session.json。

`pollLogin()` 登录成功时兼容返回：

```json
{
  "status": "confirmed",
  "account_id": "xxx@im.bot",
  "token": "xxx@im.bot:xxxxx"
}
```

然后写入 `credential_file`。

## Controller

新增：

```text
POST /ilink/auth/start
GET /ilink/auth/qr
POST /ilink/auth/poll
GET /ilink/auth/status
```

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

返回二维码图片文件。

如果文件不存在，返回 404。

### POST /ilink/auth/poll

返回登录状态。

登录成功后保存 credential。

### GET /ilink/auth/status

返回：

```json
{
  "loggedIn": true,
  "account_id": "xxx@im.bot",
  "token_masked": "xxx...xxxx"
}
```

不能返回完整 token。

## 模块接入

把 `ILinkAuthModule` 导入：

```text
ILinkModule
```

或：

```text
PlatformModule
```

确保路由可用。

## 验收

构建：

```bash
npm run build
```

启动：

```bash
npm run start:prod
```

查看状态：

```bash
curl http://localhost:3000/ilink/auth/status
```

开始登录：

```bash
curl -X POST http://localhost:3000/ilink/auth/start
```

查看二维码：

```bash
curl http://localhost:3000/ilink/auth/qr --output qr.png
```

轮询：

```bash
curl -X POST http://localhost:3000/ilink/auth/poll
```

## 验收标准

```text
1. npm run build 通过。
2. /ilink/auth/status 可用，且不泄露完整 token。
3. /ilink/auth/start 可用。
4. /ilink/auth/qr 可返回二维码文件或明确 404。
5. /ilink/auth/poll 可用。
6. 登录成功后能写入 credential.json。
7. ILinkClient 可从 credential_file 读取凭证。
8. /mock/message 不受影响。
```

## 重要要求

由于 iLink 登录接口可能不确定：

```text
允许 startLogin/pollLogin 内部留 TODO 和兼容解析。
但 Controller、存储、凭证读取链路必须完整。
```

不要把完整 token 打到日志里。
