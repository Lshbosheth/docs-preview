# Day 1 启动任务清单

## Day 1 目标

Day 1 只做一个目标：

```text
NestJS 服务启动后，能处理一条 mock 消息 /status，并返回系统状态。
```

不接真实微信。

不接真实模型。

不接数据库。

不做复杂任务规划。

## 1. 初始化项目

建议在实际项目目录执行：

```bash
nest new wx-agent-bridge
cd wx-agent-bridge
npm install yaml zod pino
npm install -D @types/node
```

如果不想使用 Nest CLI，也可以手动搭，但第一版用 CLI 更省心。

## 2. 建议目录

Day 1 只建这些目录：

```text
src/
  main.ts
  app.module.ts

  config/
    app-config.module.ts
    app-config.service.ts
    config.schema.ts
    types.ts

  pipeline/
    pipeline.module.ts
    pipeline.service.ts

  message/
    message.module.ts
    message-normalizer.service.ts
    types.ts

  command/
    command.module.ts
    command-router.service.ts

  project/
    project.module.ts
    project-router.service.ts

  session/
    session.module.ts
    session.service.ts

  response/
    response.module.ts
    response-builder.service.ts

  mock/
    mock.module.ts
    mock.controller.ts
```

## 3. 配置文件

先放一个 `config.yaml`：

```yaml
app:
  name: wx-agent-bridge
  data_dir: ./data
  log_level: info

providers:
  qwen:
    type: openai_compatible
    api_key: ${QWEN_API_KEY}
    base_url: https://dashscope.aliyuncs.com/compatible-mode/v1

projects:
  - name: default
    work_dir: D:/workspace/test-agent
    admin_from:
      - wx_user_001
    allow_from:
      - wx_user_001
    models:
      chat:
        provider: qwen
        model: qwen-plus
      decision:
        provider: qwen
        model: qwen-plus
      execution:
        provider: qwen
        model: qwen-plus
    guard:
      type: rule_based
      mode: default
      allow_risk_levels:
        - low
    limits:
      max_steps: 3
      max_total_tokens: 6000
      max_turn_seconds: 60
    platform:
      type: weixin
      token: ${WEIXIN_TOKEN}
      base_url: ${WEIXIN_BASE_URL}
```

Day 1 只读取配置，不调用模型。

## 4. 核心类型

Day 1 先定义 `NormalizedMessage`：

```ts
export type NormalizedMessage = {
  messageId: string;
  platform: "weixin" | "mock";
  fromUser: string;
  chatId: string;
  chatType: "private" | "group";
  contentType: "text";
  content: string;
  createdAt: string;
  raw?: unknown;
};
```

再定义 `PipelineResult`：

```ts
export type PipelineResult = {
  replyText: string;
  handledBy: "command" | "chat" | "pipeline";
};
```

## 5. Mock 入口

Day 1 用 HTTP mock 入口，不用真实微信：

```text
POST /mock/message
```

请求：

```json
{
  "message_id": "msg_001",
  "from_user": "wx_user_001",
  "content": "/status"
}
```

响应：

```json
{
  "replyText": "当前项目：default\n当前模式：default\n当前目录：D:/workspace/test-agent",
  "handledBy": "command"
}
```

## 6. Pipeline 处理顺序

Day 1 的 `PipelineService.handle()` 只做这些：

```text
1. MessageNormalizer.normalize(raw)
2. CommandRouter.isCommand(message.content)
3. 如果是命令，CommandRouter.handle(message)
4. 如果不是命令，返回固定文本
```

固定文本：

```text
收到：你的消息已进入 wx-agent-bridge。
```

## 7. Command Router

Day 1 只实现：

```text
/help
/status
/model
/mode
/dir
```

可以暂时跳过：

```text
/new
/stop
/project
/model switch
/mode ask
```

## 8. Day 1 验收标准

必须满足：

```text
1. npm run start:dev 可以启动。
2. POST /mock/message 发送 /help，可以返回帮助。
3. POST /mock/message 发送 /status，可以返回项目状态。
4. POST /mock/message 发送普通文本，可以返回固定回复。
5. 配置从 config.yaml 读取，不写死在代码里。
6. 控制台能看到 message_id、from_user、handler。
```

## 9. Day 1 不做事项

明确不要做：

```text
真实微信接入
真实模型调用
Planner
Task Schema
Guard
Executor
数据库
队列
多进程
Web UI
```

Day 1 成功以后，项目就从“只有想法”变成“有一条能跑的主链路”。
