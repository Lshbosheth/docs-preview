# Day 6 Executor 和 ResponseBuilder 计划

## 目标

Day 6 让低风险任务真正产出结果。

```text
Planner 生成 TaskSchema
SchemaValidator 校验
Guard 通过
Executor 按 step 调 executionModel
ResponseBuilder 合并结果
返回微信可读文本
```

第一阶段 Executor 只生成文本，不执行外部操作。

## 不做事项

```text
不调用工具
不执行 Shell
不读写文件
不访问数据库
不外部 HTTP 请求
不部署
不做 Agent Runtime
```

## 新增模块

```text
src/executor/
  executor.module.ts
  executor.service.ts
  executor.prompt.ts
  executor.types.ts

src/response/
  response-builder.service.ts
```

如果已有 ResponseBuilder，则扩展它。

## Executor 限制

Executor 必须遵守：

```text
只能执行当前 step
不能修改 TaskSchema
不能新增 step
不能删除 step
不能调用工具
不能访问网络
不能执行 shell
不能读写文件
不能声称已经完成外部操作
```

## Step 输出

```ts
export type StepExecutionResult = {
  step_id: number;
  output_type: "text" | "markdown" | "json" | "python_code" | "sql";
  content: string;
};
```

## Executor Prompt

```text
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
```

## ResponseBuilder

职责：

```text
合并多个 step 输出
代码块格式化
SQL 格式化
错误信息友好化
拒绝原因友好化
超长文本分段预留
```

第一版只需要返回一个字符串。

## 验收标准

```text
1. 帮我写 Python requests 示例，返回代码和说明。
2. 帮我写 users 建表 SQL，返回 SQL，不执行 SQL。
3. 帮我写 README 模板，返回 Markdown。
4. .env/token 请求仍然被 Guard 拒绝。
5. 删库请求仍然被 Guard 拒绝。
6. Executor 不执行任何外部操作。
```

## 完成后的状态

Day 6 完成后，第一阶段核心链路基本跑通：

```text
微信 / Mock / iLink
  -> Pipeline
  -> Command / Chat / Planner
  -> SchemaValidator
  -> Guard
  -> Executor
  -> ResponseBuilder
  -> 回复
```
