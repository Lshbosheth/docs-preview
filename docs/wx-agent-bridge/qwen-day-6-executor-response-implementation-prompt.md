# Qwen Day 6 Executor 和 ResponseBuilder 实施提示词

下面这段可以直接发给 Qwen，让它基于 Day 5 代码继续实现 Day 6。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 6：Executor 和 ResponseBuilder。

## 当前已有能力

```text
命令路由
ChatService
PlannerService
TaskSchema
SchemaValidatorService
SafetyGuardService
低风险任务通过
中高风险任务拒绝
```

已有能力必须继续可用。

## Day 6 目标

实现：

```text
ExecutorService
按 TaskSchema.steps 顺序执行
每个 step 调 executionModel
解析 StepExecutionResult
ResponseBuilder 合并 step 结果
低风险任务返回最终产出
```

第一阶段 Executor 只生成文本，不执行外部操作。

## 非目标

不要实现：

```text
工具调用
文件读写
Shell
数据库访问
外部 HTTP 请求
自动部署
Agent Runtime
Redis
队列
```

## 新增文件

```text
src/executor/
  executor.module.ts
  executor.types.ts
  executor.prompt.ts
  executor.service.ts

src/response/
  response-builder.service.ts
```

如果已有 `ResponseBuilderService`，请扩展它，不要重复创建同名冲突文件。

## Executor 类型

`src/executor/executor.types.ts`：

```ts
export type StepExecutionResult = {
  step_id: number;
  output_type: "text" | "markdown" | "json" | "python_code" | "sql";
  content: string;
};
```

## Executor Prompt

`src/executor/executor.prompt.ts`：

```ts
export const EXECUTOR_SYSTEM_PROMPT = `
你是 Execution Layer / Executor。
你只能执行当前 step。
你必须严格遵守 TaskSchema。
你不能修改 goal。
你不能修改 steps。
你不能新增 step。
你不能调用工具。
你不能访问网络。
你不能执行 shell。
你不能读写文件。
你不能声称自己已经完成外部操作。

你只输出 JSON：
{
  "step_id": 1,
  "output_type": "text | markdown | json | python_code | sql",
  "content": ""
}
`;
```

## ExecutorService

实现：

```ts
execute(schema: TaskSchema): Promise<StepExecutionResult[]>
```

流程：

```text
1. 读取 default project 的 models.execution
2. ProviderFactory 创建 execution provider
3. 按 schema.steps 顺序执行
4. 每个 step 构造 messages
5. 调 executionModel.chat()
6. 解析 JSON
7. 校验 step_id 和 output_type
8. 返回 StepExecutionResult[]
```

每个 step 的 user message 至少包含：

```text
完整 TaskSchema
当前 step
要求只输出 JSON
```

如果模型输出不是合法 JSON，抛出清晰错误。

## ResponseBuilderService

实现或扩展：

```ts
buildTaskResult(results: StepExecutionResult[]): string
buildRejected(reason: string): string
buildError(error: unknown): string
```

`buildTaskResult` 规则：

```text
1. 多个 step 按顺序合并。
2. python_code 用 ```python 包裹。
3. sql 用 ```sql 包裹。
4. markdown 原样保留。
5. text 原样保留。
6. 每个 step 之间空一行。
```

## Pipeline 调整

任务型请求流程：

```text
PlannerService.plan()
SchemaValidatorService.validate()
SafetyGuardService.check()
如果拒绝 -> ResponseBuilder.buildRejected()
如果通过 -> ExecutorService.execute()
ResponseBuilder.buildTaskResult()
返回最终结果
```

如果 `PipelineResult.handledBy` 需要扩展，请加入 `"executor"`。

## 验收

代码生成：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_601\",\"from_user\":\"wx_user_001\",\"content\":\"帮我写一个 Python requests 示例\"}"
```

SQL 生成：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_602\",\"from_user\":\"wx_user_001\",\"content\":\"帮我写一个 users 表的建表 SQL\"}"
```

README：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_603\",\"from_user\":\"wx_user_001\",\"content\":\"帮我写一个项目 README 模板\"}"
```

拒绝：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_604\",\"from_user\":\"wx_user_001\",\"content\":\"帮我读取 .env 文件里的 token\"}"
```

## 验收标准

```text
1. 低风险代码生成返回代码和说明。
2. SQL 生成返回 SQL，不执行 SQL。
3. README 生成返回 Markdown。
4. .env/token 请求仍被拒绝。
5. 删库请求仍被拒绝。
6. /status 仍然可用。
7. 普通聊天仍然走 ChatService。
8. Executor 不执行任何外部操作。
```
