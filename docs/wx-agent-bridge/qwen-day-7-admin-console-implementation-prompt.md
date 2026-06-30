# Qwen 实施提示词：Day 7 管理后台 MVP

请基于已有 `wx-agent-bridge` 项目继续开发 Day 7：管理后台 MVP。

## 你要先阅读的文档

请先阅读：

```text
docs/wx-agent-bridge/day-7-admin-console-plan.md
docs/wx-agent-bridge/day-2-9-ilink-sdk-plan.md
docs/wx-agent-bridge/day-2-9-sdk-qr-binding-test.md
```

当前项目已经完成微信 iLink SDK 登录、长轮询、消息接收、Qwen 回复和基础 Pipeline。现在要做的是一个内部管理后台，让人能在页面上看到状态、生成二维码、测试消息和查看最近事件。

## 总目标

实现一个可以本地启动的管理后台：

```text
打开页面 -> 看服务状态 -> 看微信登录状态 -> 扫码绑定 -> 测试消息 -> 看最近事件
```

不要做营销页。第一屏就是控制台。

## 技术要求

前端使用：

```text
Vite
React
TypeScript
Ant Design
qrcode.react
```

后端继续使用：

```text
NestJS
TypeScript
```

如果当前项目还没有 workspace 配置，可以先把前端放在：

```text
admin-web/
```

如果项目已有 `apps/` 结构，可以放在：

```text
apps/admin-web/
```

优先选择改动小、能跑通的方案。

## 后端任务

### 1. 新增 AdminModule

新增：

```text
src/admin/admin.module.ts
src/admin/admin.controller.ts
src/admin/admin-event.service.ts
src/admin/admin.types.ts
```

并在 `AppModule` 中注册。

### 2. 实现 `/admin/status`

接口：

```text
GET /admin/status
```

返回结构：

```ts
type AdminStatusResponse = {
  service: {
    ok: boolean;
    uptimeSec: number;
    startedAt: string;
  };
  ilink: {
    enabled: boolean;
    mode?: string;
    loggedIn: boolean;
    accountId?: string;
    polling?: boolean;
  };
  model: {
    provider: string;
    model: string;
  };
};
```

实现要求：

- `service.ok` 固定为 true。
- `uptimeSec` 用 `process.uptime()`。
- `startedAt` 可以在 AdminController 或 AdminService 初始化时记录。
- `ilink.loggedIn` 复用现有 SDK 登录状态能力。
- `model` 从 config 中读取当前 chat model。
- 不返回 token。
- 不返回 API key。

如果当前 iLink polling 状态没有公开 getter，可以先返回 `polling: undefined`，但不要写假值。

### 3. 实现 AdminEventService

事件类型：

```ts
export type AdminEventLevel = 'info' | 'warn' | 'error';

export type AdminEvent = {
  id: string;
  type: string;
  level: AdminEventLevel;
  message: string;
  at: string;
  meta?: Record<string, unknown>;
};
```

方法：

```ts
append(event: Omit<AdminEvent, 'id' | 'at'>): AdminEvent
list(limit?: number): AdminEvent[]
```

要求：

- 内存保存最近 200 条。
- `list()` 默认返回最近 50 条，按时间倒序。
- `id` 可以用 `Date.now()` 加随机数生成，不需要引入 uuid。

### 4. 实现 `/admin/events`

接口：

```text
GET /admin/events?limit=50
```

返回：

```ts
{
  items: AdminEvent[];
}
```

### 5. 给 iLink 链路补最小事件

至少在这些地方写事件：

- 自动 polling 启动成功。
- 自动 polling 启动失败。
- 收到微信消息。
- 回复微信消息成功。
- 回复微信消息失败。
- QR 登录开始。
- QR 登录成功。

注意：

- 不要记录完整 token。
- `fromUser` 可以 masked，或只记录前后几位。
- `contentPreview` 最多保留前 80 个字符。

如果注入 `AdminEventService` 导致循环依赖，优先少埋点，不要大改架构。

## 前端任务

### 1. 创建管理后台

创建前端项目：

```text
admin-web/
```

安装依赖：

```text
react
react-dom
antd
@ant-design/icons
qrcode.react
vite
typescript
```

页面结构：

```text
src/
  main.tsx
  App.tsx
  api/client.ts
  pages/Dashboard.tsx
  pages/Binding.tsx
  pages/MessageTest.tsx
  pages/Events.tsx
  components/StatusTag.tsx
```

### 2. API Client

实现：

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3100';
```

封装：

```ts
getAdminStatus()
getAdminEvents(limit?: number)
startIlinkLogin()
getIlinkAuthStatus()
sendMockMessage(content: string)
sendIlinkTest(toUser: string, content: string)
```

错误要返回页面可显示的信息，不要只 `console.error`。

### 3. Dashboard 页面

展示：

- 服务在线状态。
- iLink 登录状态。
- bot accountId。
- 当前 provider。
- 当前 model。
- 最近 10 条事件。

使用 Ant Design：

```text
Layout
Card
Descriptions
Tag
Timeline
Button
```

要求：

- 页面加载自动请求 `/admin/status` 和 `/admin/events`。
- 有“刷新”按钮。
- 异常时显示 `Alert`。

### 4. Binding 页面

功能：

- 显示当前登录状态。
- 点击“开始绑定”调用 `/ilink/auth/start`。
- 如果返回 `qrUrl`，用 `qrcode.react` 展示二维码。
- 每 2 秒调用 `/ilink/auth/status`。
- 登录成功后停止轮询，并显示 accountId。

状态文案：

```text
未登录
等待扫码
已登录
绑定失败
```

### 5. Message Test 页面

功能：

- 输入 content，调用 `/mock/message`。
- 提供快捷按钮：
  - `/status`
  - `你好`
  - `.env`
  - `删库`
- 展示返回 JSON。

如果有 `/ilink/send-test`，可以额外提供 iLink 发送测试区：

- toUser 输入框。
- content 输入框。
- 发送按钮。
- 展示错误原因，比如缺少 context_token。

### 6. Events 页面

功能：

- 表格展示 `/admin/events`。
- 显示时间、级别、类型、消息、meta。
- 有刷新按钮。
- 支持按 level 本地筛选。

## 样式要求

- 不做 landing page。
- 不做大 hero。
- 不做装饰性渐变背景。
- 做一个安静、清晰、实用的运维控制台。
- 移动端能基本查看，但优先桌面端。
- 不展示完整 token、API key。
- 卡片不要套卡片。

## 验收命令

后端：

```bash
npm run build
npm test -- --runInBand --passWithNoTests
```

前端：

```bash
cd admin-web
npm run build
npm run dev
```

如果放在 `apps/admin-web`，命令按实际目录调整。

## 验收标准

完成后请确认：

1. 后端构建通过。
2. 后端测试通过。
3. 前端构建通过。
4. 打开后台首页能看到 `/health` 对应的服务在线状态。
5. 后台能看到 `/ilink/auth/status` 的登录状态。
6. 可以点击开始绑定并显示二维码。
7. 登录成功后页面能显示 accountId。
8. 微信发消息后，事件页面能看到 message received/replied 事件。
9. Message Test 页面能测试 `/status`、普通聊天和危险指令。
10. 页面和接口都不泄露完整 token 或 API key。

## 注意事项

- 不要重构已有 Pipeline。
- 不要改动已经跑通的 iLink SDK 登录逻辑，除非修 bug 必须改。
- 不要把管理后台做成复杂权限系统。
- 不要引入数据库。
- 不要硬编码 API key。
- 所有新增源码文件使用 UTF-8。

