# Day 2.9 iLink SDK 接入修正计划

## 背景

Day 2.6 到 Day 2.8 的方向是直接请求 iLink HTTP 接口：

```text
/ilink/bot/getupdates
/ilink/bot/send
/ilink/bot/sendtext
```

这个方向可以验证现有 token 是否能收消息，但不适合继续扩展。

原因很简单：扫码登录、token 刷新、收发消息 body、媒体上传下载这些细节，本来就应该交给 iLink SDK 或官方插件处理。Bridge 项目不应该靠猜 endpoint 往下写。

## 修正结论

微信接入层改成 SDK-first：

```text
NestJS Bridge
  -> Weixin Adapter
  -> ILink SDK Facade
  -> iLink npm SDK / OpenClaw Weixin plugin
  -> WeChat iLink
```

Bridge 内部仍然保留自己的边界：

```text
Adapter
Message Mapper
Pipeline
Response Builder
Sender
Credential Store
```

但真实 iLink 登录、轮询、发送、媒体能力优先委托给 SDK，不再手写未确认的 iLink HTTP endpoint。

## 目标

Day 2.9 只做这几件事：

```text
1. 做 iLink npm SDK 选型 spike。
2. 确认 SDK 是否支持扫码登录、token 持久化、收消息、发文本。
3. 新增 ILinkSdkClient，作为 Bridge 内部统一封装。
4. 把原来的 ILinkClient/ILinkSender 改成调用 SDK facade。
5. 保持 Pipeline、Command Router、Response Builder 不变。
```

## 不做事项

```text
不重写整个项目
不把 Bridge 绑死到 OpenClaw 运行时
不做 Web 管理台
不做多微信账号
不做复杂权限
不做完整媒体链路
不在日志里打印 token
```

## 候选 SDK

优先评估：

```text
wechat-ilink-client
@wechatbot/wechatbot
@tencent-weixin/openclaw-weixin
```

选型顺序：

```text
1. 能否独立在 TypeScript / Node.js 项目中使用。
2. 是否支持二维码登录。
3. 是否支持保存和恢复登录态。
4. 是否支持拉取消息或事件回调。
5. 是否支持发送文本。
6. 是否有清晰类型定义。
7. 是否必须依赖 OpenClaw runtime。
```

如果独立 SDK 可用，优先接独立 SDK。

如果只有 OpenClaw 插件可用，可以只包一层适配，不要把 Agent Bridge 的主流程迁移成 OpenClaw 应用。

## 目标目录结构

在现有微信模块下面增加 SDK facade，不要把 SDK 细节扩散到 Pipeline。

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

各层职责：

```text
ilink-sdk.client.ts
  只包 SDK 原生能力：login、poll、sendText、restoreSession。

ilink-sdk.factory.ts
  只负责创建 SDK 实例，隔离具体 npm 包。

ilink-auth.service.ts
  只负责登录态、二维码、凭证保存和恢复。

ilink-polling.service.ts
  只负责从 SDK 拉消息，再交给 Adapter。

ilink.sender.ts
  只负责把 ResponseBuilder 的文本结果发出去。

ilink.message-mapper.ts
  只负责 SDK 原始消息到 NormalizedMessage 的映射。
```

## 正确流程

### 扫码登录

```text
POST /ilink/auth/qrcode
  -> ILinkAuthService.startQrLogin()
  -> ILinkSdkClient.startQrLogin()
  -> 返回二维码内容或二维码图片路径
```

```text
GET /ilink/auth/status
  -> ILinkAuthService.getStatus()
  -> SDK 查询登录态
  -> 登录成功后保存 account_id/token/session
```

### 收消息

```text
ILinkPollingService
  -> ILinkSdkClient.pollMessages()
  -> ILinkMessageMapper.toNormalizedMessage()
  -> WeixinAdapter.handleMessage()
  -> Pipeline
```

### 发文本

```text
Pipeline
  -> Response Builder
  -> ILinkSender.sendText()
  -> ILinkSdkClient.sendText()
  -> SDK 真实发送
```

## 实施步骤

### Step 1：SDK spike

先写一个临时 spike，不接入主流程：

```text
scripts/spike-ilink-sdk.ts
```

目标：

```text
1. 能 import SDK。
2. 能生成二维码或恢复已有 session。
3. 能打印登录状态。
4. 能拉取一次消息。
5. 能给 allow_from 发一条测试文本。
```

如果 SDK API 和文档不匹配，先记录结果，不要硬编假接口。

### Step 2：抽象 SDK facade

新增：

```text
src/platform/weixin/ilink/sdk/ilink-sdk.types.ts
src/platform/weixin/ilink/sdk/ilink-sdk.factory.ts
src/platform/weixin/ilink/sdk/ilink-sdk.client.ts
```

Bridge 其他代码只能依赖 `ILinkSdkClient`，不要直接 import 具体 npm 包。

### Step 3：替换登录和凭证逻辑

把原来的手写扫码登录 endpoint 方案替换成 SDK 调用。

保留：

```text
GET /ilink/auth/status
```

新增或修正：

```text
POST /ilink/auth/qrcode
POST /ilink/auth/logout
```

### Step 4：替换轮询和发送

`ILinkPollingService` 和 `ILinkSender` 改为调用 SDK facade。

不要再维护 endpoint 候选列表。

### Step 5：补测试和验收

至少覆盖：

```text
1. SDK facade 可以被 mock。
2. ILinkMessageMapper 能映射文本消息。
3. ILinkSender 调用 SDK sendText。
4. Pipeline 的 mock message 入口不受影响。
```

## 验收标准

```text
1. npm run build 通过。
2. npm run test 通过。
3. mock message 链路仍然可用。
4. SDK spike 文档记录了最终选型。
5. /ilink/auth/status 不打印 token。
6. /ilink/auth/qrcode 能启动扫码登录或给出明确 SDK 不支持原因。
7. /ilink/send-test 能通过 SDK 发送文本，或输出清楚的 SDK 限制。
```

## 与旧文档的关系

Day 2.9 覆盖 Day 2.7 和 Day 2.8 的接口猜测路线。

旧文档仍然保留为排查记录：

```text
Day 2.6 的长轮询验证结果仍有参考价值。
Day 2.7 的扫码登录 endpoint 不再作为实施依据。
Day 2.8 的发送 endpoint 候选不再继续扩展。
```

后续所有真实微信接入，都以 SDK facade 为主线。
