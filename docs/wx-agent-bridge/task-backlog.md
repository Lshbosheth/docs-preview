# 开发任务 Backlog

## P0：必须先做

### B001 初始化 NestJS 项目

目标：

```text
项目可以启动，保留最小 NestJS 应用结构。
```

验收：

```text
npm run start:dev 成功
GET /health 返回 ok
```

### B002 配置加载

目标：

```text
读取 config.yaml，校验 app、providers、projects。
```

验收：

```text
启动时打印 app.name、default project、work_dir、mode。
配置缺字段时启动失败并给出清晰错误。
```

### B003 Mock 消息入口

目标：

```text
提供 POST /mock/message，用来模拟微信消息。
```

验收：

```text
发送 message_id、from_user、content 后能返回 replyText。
```

### B004 Message Normalizer

目标：

```text
把 mock 原始消息转为 NormalizedMessage。
```

验收：

```text
字段包含 messageId、platform、fromUser、chatId、chatType、contentType、content、createdAt。
```

### B005 Command Router

目标：

```text
支持 /help、/status、/model、/mode、/dir。
```

验收：

```text
/status 返回当前项目、模型、模式、工作目录。
未知命令返回友好提示。
```

### B006 Pipeline Service

目标：

```text
把 Normalizer、CommandRouter、ResponseBuilder 串起来。
```

验收：

```text
/status 走 command。
普通文本返回固定回复。
日志里有 message_id 和 handledBy。
```

## P1：微信文本闭环

### B101 WeixinClient

目标：

```text
封装微信消息拉取和发送接口。
```

验收：

```text
能通过配置的 base_url 和 token 调用 getUpdates、sendMessage。
```

### B102 WeixinAdapter

目标：

```text
持续接收微信文本消息，并投递给 Pipeline。
```

验收：

```text
微信发消息后，终端能看到标准化消息。
```

### B103 message_id 去重

目标：

```text
避免同一条微信消息重复处理。
```

验收：

```text
重复 message_id 只处理一次。
```

### B104 微信命令回复

目标：

```text
微信里发送 /help、/status 可以收到回复。
```

验收：

```text
实际微信消息收发闭环成功。
```

## P2：模型接入

### B201 LLM Provider 接口

目标：

```text
定义统一 LLMProvider 接口。
```

验收：

```text
业务代码只调用 provider.chat(messages, options)。
```

### B202 OpenAI Compatible Provider

目标：

```text
支持 Qwen、DeepSeek 等兼容 OpenAI 协议的模型。
```

验收：

```text
通过 config.yaml 切换 base_url、api_key、model。
```

### B203 Model Router

目标：

```text
根据项目配置返回 chatModel、decisionModel、executionModel。
```

验收：

```text
普通聊天走 chatModel。
任务规划走 decisionModel。
执行产出走 executionModel。
```

## P3：Planner 和 Schema

### B301 TaskSchema 类型

目标：

```text
定义第一阶段 TaskSchema。
```

验收：

```text
包含 goal、task_type、steps、constraints、risk_level、budget。
```

### B302 PlannerService

目标：

```text
调用 decisionModel 生成 TaskSchema。
```

验收：

```text
输入“帮我写一个 Python requests 示例”，输出 code_generation schema。
```

### B303 SchemaValidator

目标：

```text
校验 Planner 输出。
```

验收：

```text
steps > 3 拒绝。
risk_level 非法拒绝。
constraints 缺失拒绝。
budget 超限拒绝。
```

## P4：Guard 和 Executor

### B401 SafetyGuard

目标：

```text
只允许 low 风险任务执行。
```

验收：

```text
读取 .env、执行 shell、删库请求被拒绝。
```

### B402 ExecutorService

目标：

```text
按 TaskSchema step 调用 executionModel 生成文本。
```

验收：

```text
代码生成任务返回代码和说明。
Executor 不执行外部操作。
```

### B403 ResponseBuilder

目标：

```text
把多个 step 输出合并成微信可读文本。
```

验收：

```text
代码块保留格式。
超长内容可以分段。
失败和拒绝原因清晰。
```

## P5：持久化和管理

### B501 SQLite 存储

目标：

```text
保存 messages、sessions、tasks、task_steps、execution_logs。
```

验收：

```text
每条消息和任务都能查到完整链路。
```

### B502 聊天内容查询 API

目标：

```text
提供基础管理接口查询消息和任务。
```

验收：

```text
可以按用户、项目、时间查询聊天记录。
```

### B503 任务状态查询 API

目标：

```text
查看任务状态、schema、step 输出和失败原因。
```

验收：

```text
管理端可以看到任务从 created 到 done/rejected 的过程。
```

## P6：多进程和队列

### B601 Worker 进程

目标：

```text
把任务执行从消息接收进程拆出去。
```

验收：

```text
Adapter 收消息后入队，Worker 消费任务。
```

### B602 Redis 队列

目标：

```text
支持任务排队、重试、超时。
```

验收：

```text
Worker 重启后未完成任务可恢复或标记失败。
```

### B603 任务取消

目标：

```text
/stop 可以停止当前任务。
```

验收：

```text
running 任务可以进入 stopped。
```
