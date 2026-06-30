# Day 7 管理后台 MVP 计划

## 目标

把已经跑通的后端能力做成一个可以直接使用的管理后台。

这个阶段不追求复杂权限、漂亮营销页或完整运营系统，先解决一个核心问题：

```text
打开页面，就能知道微信是否在线、能不能扫码绑定、消息有没有进来、AI 是否能正常回复。
```

## 当前前提

后端已经具备这些能力：

- NestJS 服务可以启动。
- `/health` 可以检查服务状态。
- `/ilink/auth/start` 可以发起二维码绑定。
- `/ilink/auth/status` 可以查看 iLink 登录状态。
- iLink SDK 可以通过长轮询接收微信消息。
- 收到微信消息后可以进入 Pipeline。
- Qwen 模型可以正常回复。
- `/mock/message` 可以做本地消息测试。

管理后台只负责把这些能力展示出来，并提供少量操作入口。

## 技术选择

推荐直接使用：

```text
Vite
React
TypeScript
Ant Design
```

原因：

- 启动快，适合先做内部控制台。
- Ant Design 适合状态页、表单、表格、日志列表。
- 和 NestJS 都使用 TypeScript，后续可以共享类型。

目录建议：

```text
wx-agent-bridge/
  apps/
    admin-web/
      package.json
      vite.config.ts
      src/
        main.tsx
        App.tsx
        api/
        pages/
        components/
```

如果当前项目还不是 monorepo，也可以先放在：

```text
wx-agent-bridge/admin-web/
```

先跑起来比目录完美更重要。

## 后端需要补的 Admin API

前端不要直接拼太多底层接口，后端可以新增一个轻量 `AdminModule` 聚合状态。

### 1. 系统总览

```text
GET /admin/status
```

返回：

```json
{
  "service": {
    "ok": true,
    "uptimeSec": 1234,
    "startedAt": "2026-06-30T02:54:48.000Z"
  },
  "ilink": {
    "enabled": true,
    "mode": "polling",
    "loggedIn": true,
    "accountId": "b37db32380b7@im.bot",
    "polling": true
  },
  "model": {
    "provider": "qwen",
    "model": "qwen3.7-max"
  }
}
```

注意：

- 不返回完整 token。
- 不返回完整 API key。
- 如果需要展示敏感字段，只展示 masked。

### 2. 最近事件

```text
GET /admin/events?limit=50
```

先用内存 Ring Buffer 存最近事件即可。

事件类型：

```text
service_started
ilink_login_started
ilink_login_confirmed
ilink_polling_started
message_received
message_replied
message_reply_failed
model_call_started
model_call_failed
guard_rejected
```

返回示例：

```json
{
  "items": [
    {
      "id": "evt_001",
      "type": "message_received",
      "level": "info",
      "message": "收到微信消息",
      "at": "2026-06-30T02:53:08.000Z",
      "meta": {
        "fromUser": "o9cq...@im.wechat",
        "contentPreview": "现在通了"
      }
    }
  ]
}
```

### 3. 二维码绑定状态

复用现有接口即可：

```text
POST /ilink/auth/start
GET /ilink/auth/status
```

如果当前 `/ilink/auth/start` 只返回二维码 URL，前端可以用二维码组件渲染。

前端依赖建议：

```text
qrcode.react
```

### 4. 本地消息测试

复用：

```text
POST /mock/message
```

后台页面需要提供一个输入框，点击发送后展示原始返回。

### 5. 微信发送测试

复用：

```text
POST /ilink/send-test
```

注意：真实微信发送通常需要先收到该用户消息，SDK 才有 context_token。页面上要展示失败原因，不要吞错误。

## 前端页面规划

### 1. Dashboard

路径：

```text
/
```

内容：

- 服务状态。
- iLink 登录状态。
- 当前 bot 账号。
- polling 状态。
- 当前模型 provider 和 model。
- 最近 10 条事件。

视觉要求：

- 不做 landing page。
- 第一屏就是控制台。
- 使用 Ant Design 的 `Layout`、`Card`、`Descriptions`、`Tag`、`Timeline`。
- 状态用明确颜色：在线绿色，异常红色，等待黄色，未启用灰色。

### 2. WeChat Binding

路径：

```text
/binding
```

内容：

- 当前登录状态。
- 当前 accountId。
- “开始绑定”按钮。
- 二维码展示区。
- 扫码后自动轮询状态。
- 失败信息展示。

交互：

- 点击“开始绑定”后调用 `/ilink/auth/start`。
- 拿到 `qrUrl` 后展示二维码。
- 每 2 秒调用一次 `/ilink/auth/status`。
- 登录成功后停止轮询并刷新 Dashboard。

### 3. Message Test

路径：

```text
/test`
```

内容：

- Mock 消息测试。
- `/status` 快捷测试按钮。
- 普通聊天测试输入框。
- 危险指令测试按钮，例如 `.env`、`删库`，用于验证 Guard。
- 展示返回 JSON。

### 4. Events

路径：

```text
/events
```

内容：

- 最近事件列表。
- 按类型筛选。
- 按级别筛选。
- 手动刷新。

先不用做复杂日志检索。

## 后端事件记录设计

新增一个轻量服务：

```text
src/admin/admin-event.service.ts
```

职责：

- `append(event)` 写入内存数组。
- 最多保留 200 条。
- `list(limit)` 返回倒序事件。

事件结构：

```ts
export type AdminEvent = {
  id: string;
  type: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  at: string;
  meta?: Record<string, unknown>;
};
```

先不要引入数据库。等后台页面可用后，再考虑 SQLite 持久化。

## 需要埋点的位置

最少埋这些点：

- iLink 自动 polling 启动成功。
- iLink 自动 polling 启动失败。
- 收到微信消息。
- 回复微信消息成功。
- 回复微信消息失败。
- QR 登录开始。
- QR 登录成功。
- 模型调用失败。
- Guard 拒绝危险请求。

如果某些模块暂时不好注入 `AdminEventService`，可以先只在 iLink 和 AdminController 里做，避免大范围改动。

## 验收标准

完成后必须满足：

1. `npm run build` 通过。
2. 后端 `npm test` 通过。
3. 前端可以 `npm run dev` 启动。
4. 打开后台首页能看到服务在线。
5. 后台能显示 iLink 登录状态。
6. 未登录时可以生成二维码。
7. 登录成功后页面能显示 accountId。
8. 微信发消息后，事件列表能看到 `message_received` 和 `message_replied`。
9. Mock 测试页可以测试 `/status` 和普通聊天。
10. 页面不展示完整 token 或 API key。

## 本阶段不做

先不要做：

- 多用户登录。
- RBAC 权限。
- 复杂主题系统。
- 数据库日志持久化。
- 多 bot 管理。
- 远程服务器部署。
- WebSocket 实时推送。

这些等后台 MVP 能稳定跑起来后再加。

## 推荐实施顺序

1. 新增 AdminModule 和 `/admin/status`。
2. 新增 AdminEventService 和 `/admin/events`。
3. 在 iLink 收发链路补最小事件。
4. 创建 React + Vite 管理后台。
5. 实现 Dashboard。
6. 实现 Binding 页面。
7. 实现 Message Test 页面。
8. 实现 Events 页面。
9. 补构建脚本和 README。
10. 做完整验收。

