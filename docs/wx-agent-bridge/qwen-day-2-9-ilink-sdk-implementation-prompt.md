# Qwen Day 2.9 iLink SDK 接入实施提示词

下面这段可以直接发给 Qwen，让它把微信接入从“猜 iLink HTTP 接口”修正为“SDK-first 接入”。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 2.9：iLink SDK 接入修正。

## 必读文档

请先阅读：

```text
docs/wx-agent-bridge/day-2-9-ilink-sdk-plan.md
docs/wx-agent-bridge/day-2-6-ilink-long-poll-plan.md
docs/wx-agent-bridge/day-2-7-ilink-qr-login-plan.md
docs/wx-agent-bridge/day-2-8-ilink-send-fix-plan.md
```

以 Day 2.9 为准。

Day 2.7 和 Day 2.8 里的手写 endpoint 猜测只作为历史排查记录，不再继续沿用。

## 当前问题

当前代码尝试直接访问 iLink HTTP endpoint：

```text
/ilink/bot/getupdates
/ilink/bot/send
/ilink/bot/sendtext
```

这会导致扫码登录、发送 body、token 刷新、媒体能力都靠猜。

请把 iLink 微信接入改为 SDK-first：

```text
NestJS Bridge
  -> ILink SDK Facade
  -> 具体 iLink npm SDK / OpenClaw Weixin plugin
```

## 目标

本次只完成：

```text
1. 做 iLink npm SDK 选型 spike。
2. 新增 SDK facade 目录和类型。
3. 让登录、轮询、发文本都通过 SDK facade。
4. 保持 Pipeline、Command Router、Planner、Guard、Executor 不变。
```

## SDK 候选

请评估：

```text
wechat-ilink-client
@wechatbot/wechatbot
@tencent-weixin/openclaw-weixin
```

优先选择可以在普通 TypeScript / Node.js 项目中独立使用的 SDK。

如果只能使用 OpenClaw 插件，请只封装它的微信能力，不要把整个 Bridge 主流程改造成 OpenClaw 应用。

## 目录结构

按这个结构调整：

```text
src/platform/weixin/
  weixin.module.ts
  weixin.controller.ts
  weixin.adapter.ts
  weixin.types.ts
  ilink/
    ilink.module.ts
    ilink.controller.ts
    ilink.adapter.ts
    ilink.sender.ts
    ilink.message-mapper.ts
    sdk/
      ilink-sdk.types.ts
      ilink-sdk.factory.ts
      ilink-sdk.client.ts
    auth/
      ilink-auth.service.ts
    polling/
      ilink-polling.service.ts
    media/
      ilink-media.service.ts
src/storage/
  credential-store.service.ts
```

如果现有文件名略有不同，可以保持项目现状，但必须保证 SDK 细节只出现在 `ilink/sdk/` 这一层。

## Step 1：SDK spike

先新增临时 spike：

```text
scripts/spike-ilink-sdk.ts
```

目标：

```text
1. 能 import 候选 SDK。
2. 能创建 client。
3. 能尝试生成登录二维码或恢复已有 session。
4. 能查询登录状态。
5. 能拉取一次消息。
6. 能尝试发送一条文本。
```

如果 SDK API 不明确，不要编造调用。

请把 spike 结论写入：

```text
docs/wx-agent-bridge/day-2-9-ilink-sdk-plan.md
```

可以新增一个“SDK spike 结果”小节。

## Step 2：新增 SDK facade

新增：

```text
src/platform/weixin/ilink/sdk/ilink-sdk.types.ts
src/platform/weixin/ilink/sdk/ilink-sdk.factory.ts
src/platform/weixin/ilink/sdk/ilink-sdk.client.ts
```

建议接口：

```ts
export interface ILinkSdkLoginStatus {
  loggedIn: boolean;
  accountId?: string;
  nickname?: string;
}

export interface ILinkSdkTextMessage {
  messageId: string;
  fromUser: string;
  chatId: string;
  content: string;
  timestamp?: number;
}

export interface ILinkSdkClient {
  restoreSession(): Promise<ILinkSdkLoginStatus>;
  startQrLogin(): Promise<{ qrcode: string; sessionId?: string }>;
  getLoginStatus(): Promise<ILinkSdkLoginStatus>;
  pollMessages(): Promise<ILinkSdkTextMessage[]>;
  sendText(input: { toUser: string; chatId?: string; content: string }): Promise<void>;
}
```

可以根据真实 SDK 调整字段，但不要让业务层直接依赖 SDK 原始类型。

## Step 3：登录改造

把 `ILinkAuthService` 改为调用 `ILinkSdkClient`：

```text
POST /ilink/auth/qrcode
GET /ilink/auth/status
POST /ilink/auth/logout
```

要求：

```text
1. 登录成功后保存凭证或 session。
2. /ilink/auth/status 不打印 token。
3. SDK 不支持的能力要返回明确错误，不要假装成功。
```

## Step 4：收发消息改造

把轮询改为：

```text
ILinkPollingService
  -> ILinkSdkClient.pollMessages()
  -> ILinkMessageMapper
  -> WeixinAdapter
  -> Pipeline
```

把发送改为：

```text
ILinkSender
  -> ILinkSdkClient.sendText()
```

删除或废弃旧的 endpoint 候选列表，不要继续暴力试接口。

## Step 5：保留测试入口

保留：

```text
POST /mock/message
POST /ilink/send-test
GET /ilink/auth/status
```

`/mock/message` 必须不依赖真实微信，方便继续测 Pipeline。

`/ilink/send-test` 可以调用 SDK 发送文本。

## 日志要求

可以记录：

```text
SDK 名称
登录状态
消息数量
发送目标 toUser
错误 status/message
```

不能记录：

```text
完整 token
完整 Authorization header
完整 session secret
```

## 验收命令

```bash
npm run build
npm run test
```

本地启动后验证：

```bash
curl http://localhost:3100/ilink/auth/status
```

测试 mock 链路：

```bash
curl -X POST http://localhost:3100/mock/message \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"test-user\",\"content\":\"/status\"}"
```

测试真实发送：

```bash
curl -X POST http://localhost:3100/ilink/send-test \
  -H "Content-Type: application/json" \
  -d "{\"to_user\":\"xxx@im.wechat\",\"chat_id\":\"xxx@im.wechat\",\"content\":\"wx-agent-bridge sdk send test\"}"
```

## 验收标准

```text
1. npm run build 通过。
2. npm run test 通过。
3. mock message 链路仍然可用。
4. SDK facade 可以被单元测试 mock。
5. /ilink/auth/status 不泄露 token。
6. /ilink/auth/qrcode 能真实调用 SDK，或返回明确的 SDK 不支持原因。
7. /ilink/send-test 通过 SDK 发送文本，或返回明确的 SDK 限制。
```

## 重要提醒

如果候选 SDK 都不能独立完成二维码登录和发送文本，请停下来写清楚结论。

不要为了“看起来完成”继续编造 iLink endpoint。
