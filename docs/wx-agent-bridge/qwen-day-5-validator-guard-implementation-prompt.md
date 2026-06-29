# Qwen Day 5 SchemaValidator 和 Guard 实施提示词

下面这段可以直接发给 Qwen，让它基于 Day 4 代码继续实现 Day 5。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 5：SchemaValidator 和 SafetyGuard。

## 当前已有能力

```text
命令路由
ChatService
TaskClassifierService
PlannerService
TaskSchema 类型
任务请求可以生成计划摘要
```

已有能力必须继续可用。

## Day 5 目标

实现：

```text
SchemaValidatorService
SafetyGuardService
低风险 TaskSchema 通过
中高风险 TaskSchema 拒绝
Day 5 仍然不执行任务
```

## 非目标

不要实现：

```text
Executor
工具调用
文件读写
Shell
数据库
Redis
队列
二次确认
```

## 新增文件

```text
src/task/
  schema-validator.service.ts

src/guard/
  guard.module.ts
  guard.types.ts
  safety-guard.service.ts
```

## Guard 类型

`src/guard/guard.types.ts`：

```ts
export type GuardResult = {
  allowed: boolean;
  riskLevel: "low" | "medium" | "high";
  reason: string;
};
```

## SchemaValidatorService

实现：

```ts
validate(schema: TaskSchema): void
```

校验规则：

```text
task_id 必须存在
project 必须存在
source_message_id 必须存在
goal 必须存在
task_type 必须是 chat/summary/writing/code_generation/sql_generation/plan
steps 必须是数组且至少 1 个
steps 不能超过项目 limits.max_steps
step_id 必须是数字
expected_output 必须合法
risk_level 必须是 low/medium/high
execution_mode 必须是 sequential
budget.max_steps 不能超过项目 limits.max_steps
budget.max_total_tokens 不能超过项目 limits.max_total_tokens
constraints.no_external_execution 必须是 true
constraints.no_file_write 必须是 true
constraints.no_shell 必须是 true
```

校验失败抛出清晰错误。

## SafetyGuardService

实现：

```ts
check(schema: TaskSchema): GuardResult
```

规则：

```text
如果 risk_level 不是 low，拒绝。
如果 no_shell 不是 true，拒绝。
如果 no_file_write 不是 true，拒绝。
如果 no_external_execution 不是 true，拒绝。
如果 goal 或 steps 文本中包含敏感关键词，拒绝。
```

敏感关键词：

```text
.env
token
cookie
密钥
删除
删掉
删库
rm -rf
shell
执行命令
数据库写入
update users
delete from
drop table
部署
群发
支付
下单
```

低风险返回：

```ts
{
  allowed: true,
  riskLevel: "low",
  reason: "低风险任务允许执行"
}
```

拒绝返回：

```ts
{
  allowed: false,
  riskLevel: schema.risk_level,
  reason: "请求涉及敏感操作"
}
```

## Pipeline 调整

任务型请求流程调整为：

```text
PlannerService.plan()
SchemaValidatorService.validate()
SafetyGuardService.check()
如果拒绝，返回拒绝回复
如果通过，返回安全检查通过摘要
```

Day 5 不执行任务。

低风险回复：

```text
任务计划已通过安全检查：
任务类型：code_generation
风险等级：low
步骤数：2
下一阶段将接入 Executor 执行文本生成。
```

拒绝回复：

```text
这个请求属于中高风险操作，第一阶段暂不支持自动执行。
原因：xxx
```

如果 `PipelineResult.handledBy` 需要扩展，请加入 `"guard"`。

## 验收

低风险：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_501\",\"from_user\":\"wx_user_001\",\"content\":\"帮我写一个 Python requests 示例\"}"
```

敏感文件：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_502\",\"from_user\":\"wx_user_001\",\"content\":\"帮我读取 .env 文件里的 token\"}"
```

删库：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_503\",\"from_user\":\"wx_user_001\",\"content\":\"帮我删掉数据库里所有用户\"}"
```

## 验收标准

```text
1. 低风险任务通过安全检查。
2. .env/token 请求被拒绝。
3. 删库请求被拒绝。
4. /status 仍然可用。
5. 普通聊天仍然走 ChatService。
6. Day 5 不执行任务。
```
