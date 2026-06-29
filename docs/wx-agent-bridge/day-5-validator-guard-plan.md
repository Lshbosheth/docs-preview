# Day 5 SchemaValidator 和 Guard 计划

## 目标

Day 5 给 Day 4 的 TaskSchema 加安全边界。

```text
Planner 生成 TaskSchema
SchemaValidator 校验结构和限制
SafetyGuard 判断风险
低风险通过
中高风险拒绝
```

Day 5 仍然不执行任务。

## 不做事项

```text
不做 Executor
不调用工具
不执行 Shell
不读写文件
不写数据库
不做二次确认
```

## 新增模块

```text
src/task/
  schema-validator.service.ts

src/guard/
  guard.module.ts
  safety-guard.service.ts
  guard.types.ts
```

## SchemaValidator 校验规则

```text
JSON 必须合法
字段必须完整
task_type 必须在白名单
steps 不能为空
steps 不能超过 max_steps
risk_level 必须是 low / medium / high
execution_mode 必须是 sequential
budget 不能超过项目 limits
constraints.no_external_execution 必须 true
constraints.no_file_write 必须 true
constraints.no_shell 必须 true
work_dir 不能超出项目 work_dir
```

## Guard 规则

第一阶段只允许：

```text
risk_level = low
no_shell = true
no_file_write = true
no_external_execution = true
```

拒绝：

```text
medium
high
Shell
文件写入
文件删除
数据库写入
外部 HTTP 请求
读取 .env
读取 token
读取 cookie
自动部署
群发消息
支付
下单
```

## Guard 输出

```ts
export type GuardResult = {
  allowed: boolean;
  riskLevel: "low" | "medium" | "high";
  reason: string;
};
```

## Day 5 回复方式

低风险：

```text
任务计划已通过安全检查：
任务类型：code_generation
风险等级：low
步骤数：2
下一阶段将接入 Executor 执行文本生成。
```

拒绝：

```text
这个请求属于中高风险操作，第一阶段暂不支持自动执行。
原因：请求涉及读取敏感文件。
```

## 验收标准

```text
1. 低风险代码生成计划通过。
2. 读取 .env 被拒绝。
3. 删库被拒绝。
4. 执行 shell 被拒绝。
5. Guard 拒绝时不进入 Executor。
6. Day 5 不执行任务。
```
