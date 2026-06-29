# Qwen Day 1 实施提示词

下面这段可以直接发给 Qwen，让它按步骤创建 Day 1 的 NestJS 项目骨架。

---

你是一个资深 TypeScript / NestJS 工程师。

请帮我实现一个项目的 Day 1 骨架，项目叫 `wx-agent-bridge`。

## 目标

Day 1 只实现一个很小的闭环：

```text
启动 NestJS 服务
读取 config.yaml
提供一个 mock 消息接口
把 mock 消息标准化
判断是不是 / 命令
如果是 /status，返回当前项目状态
如果不是命令，返回固定回复
```

最终我要能调用：

```http
POST /mock/message
Content-Type: application/json

{
  "message_id": "msg_001",
  "from_user": "wx_user_001",
  "content": "/status"
}
```

返回类似：

```json
{
  "replyText": "当前项目：default\n当前模式：default\n当前目录：D:/workspace/test-agent\nChat 模型：qwen / qwen-plus\nDecision 模型：qwen / qwen-plus\nExecution 模型：qwen / qwen-plus",
  "handledBy": "command"
}
```

普通文本：

```http
POST /mock/message

{
  "message_id": "msg_002",
  "from_user": "wx_user_001",
  "content": "你好"
}
```

返回：

```json
{
  "replyText": "收到：你的消息已进入 wx-agent-bridge。",
  "handledBy": "pipeline"
}
```

## 非目标

Day 1 不要做下面这些：

```text
不要接真实微信
不要接真实大模型
不要写 Planner
不要写 TaskSchema
不要写 Guard
不要写 Executor
不要写数据库
不要写 Redis
不要写队列
不要做多进程
不要做 Web 管理后台
```

只做 mock 消息入口和命令闭环。

## 技术栈

使用：

```text
NestJS
TypeScript
yaml
zod
```

如果项目还没创建，请用 NestJS 创建。

如果项目已经存在，请在现有项目里添加这些文件。

## 需要安装的依赖

```bash
npm install yaml zod
```

## 配置文件

在项目根目录创建 `config.yaml`：

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

环境变量暂时不用真实存在。Day 1 只读取配置，不调用外部接口。

## 目录结构

请创建下面这些文件：

```text
src/
  main.ts
  app.module.ts

  config/
    app-config.module.ts
    app-config.service.ts
    config.schema.ts
    types.ts

  message/
    message.module.ts
    message-normalizer.service.ts
    types.ts

  command/
    command.module.ts
    command-router.service.ts

  pipeline/
    pipeline.module.ts
    pipeline.service.ts
    types.ts

  mock/
    mock.module.ts
    mock.controller.ts

  health/
    health.module.ts
    health.controller.ts
```

## 类型定义

`src/message/types.ts`：

```ts
export type NormalizedMessage = {
  messageId: string;
  platform: "mock" | "weixin";
  fromUser: string;
  chatId: string;
  chatType: "private" | "group";
  contentType: "text";
  content: string;
  createdAt: string;
  raw?: unknown;
};
```

`src/pipeline/types.ts`：

```ts
export type PipelineResult = {
  replyText: string;
  handledBy: "command" | "pipeline";
};
```

## 配置模块要求

`AppConfigService` 需要：

```ts
getApp()
getProviders()
getProjects()
getDefaultProject()
```

要求：

```text
1. 从项目根目录 config.yaml 读取配置
2. 用 yaml 解析
3. 用 zod 校验
4. 如果配置错误，启动时直接报错
```

## MessageNormalizer 要求

`MessageNormalizerService.normalize(raw)` 输入 mock 原始消息：

```json
{
  "message_id": "msg_001",
  "from_user": "wx_user_001",
  "content": "/status"
}
```

输出：

```ts
{
  messageId: "msg_001",
  platform: "mock",
  fromUser: "wx_user_001",
  chatId: "wx_user_001",
  chatType: "private",
  contentType: "text",
  content: "/status",
  createdAt: new Date().toISOString(),
  raw
}
```

如果缺少 `message_id`、`from_user`、`content`，要抛出清晰错误。

## CommandRouter 要求

支持这些命令：

```text
/help
/status
/model
/mode
/dir
```

方法：

```ts
isCommand(content: string): boolean
handle(content: string): PipelineResult
```

返回内容：

`/help`：

```text
可用命令：
/help 查看帮助
/status 查看当前状态
/model 查看当前模型
/mode 查看权限模式
/dir 查看工作目录
```

`/status`：

```text
当前项目：default
当前模式：default
当前目录：D:/workspace/test-agent
Chat 模型：qwen / qwen-plus
Decision 模型：qwen / qwen-plus
Execution 模型：qwen / qwen-plus
```

`/model`：

```text
Chat：qwen / qwen-plus
Decision：qwen / qwen-plus
Execution：qwen / qwen-plus
```

`/mode`：

```text
当前模式：default
```

`/dir`：

```text
当前目录：D:/workspace/test-agent
```

未知命令：

```text
未知命令。发送 /help 查看可用命令。
```

## Pipeline 要求

`PipelineService.handle(rawMessage)`：

```text
1. 调用 MessageNormalizerService.normalize(rawMessage)
2. 打印日志：messageId、fromUser、content
3. 如果 content 是 / 开头，交给 CommandRouterService.handle(content)
4. 否则返回固定回复
```

固定回复：

```text
收到：你的消息已进入 wx-agent-bridge。
```

## MockController 要求

提供：

```text
POST /mock/message
```

调用 `PipelineService.handle(req.body)`，直接返回结果。

## HealthController 要求

提供：

```text
GET /health
```

返回：

```json
{
  "status": "ok"
}
```

## AppModule 要求

导入：

```text
AppConfigModule
MessageModule
CommandModule
PipelineModule
MockModule
HealthModule
```

注意模块依赖关系，避免循环依赖。

## main.ts 要求

启动端口默认 `3000`：

```text
http://localhost:3000
```

启动时打印：

```text
wx-agent-bridge started on http://localhost:3000
```

## 验收命令

启动：

```bash
npm run start:dev
```

健康检查：

```bash
curl http://localhost:3000/health
```

期望：

```json
{"status":"ok"}
```

测试 `/status`：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_001\",\"from_user\":\"wx_user_001\",\"content\":\"/status\"}"
```

测试普通消息：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_002\",\"from_user\":\"wx_user_001\",\"content\":\"你好\"}"
```

## 输出要求

请直接给出完整代码修改。

如果你是在本地执行，请直接创建文件并运行测试。

如果你不能执行命令，请至少给出每个文件的完整内容。

不要扩展 Day 1 范围。

不要实现真实微信、大模型、数据库、队列、Planner、Guard、Executor。

只完成 Day 1 mock 消息闭环。
