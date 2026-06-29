# Day 4 Planner 和 TaskSchema 计划

## 目标

Day 4 让任务型请求进入 Decision Layer，生成结构化 TaskSchema。

```text
普通聊天 -> Chat Layer
任务型请求 -> Planner -> TaskSchema
```

Day 4 只生成和校验前的 Schema，不执行任务。

## 不做事项

```text
不做 Guard
不做 Executor
不调用工具
不执行 Shell
不读写文件
不写数据库
```

## 新增模块

```text
src/task/
  task.module.ts
  task-schema.types.ts
  task-classifier.service.ts

src/planner/
  planner.module.ts
  planner.service.ts
  planner.prompt.ts
```

## 简单分类规则

Day 4 先用规则判断是否任务型请求：

```text
包含：帮我写、生成、设计、计划、SQL、代码、README、文档、脚本
=> task

其他
=> chat
```

后续可以改成模型分类。

## TaskSchema

第一阶段 Schema：

```ts
export type TaskSchema = {
  task_id: string;
  project: string;
  source_message_id: string;
  goal: string;
  task_type: "chat" | "summary" | "writing" | "code_generation" | "sql_generation" | "plan";
  steps: Array<{
    step_id: number;
    name: string;
    expected_output: "text" | "markdown" | "json" | "python_code" | "sql";
  }>;
  constraints: {
    language?: string;
    style?: string;
    work_dir?: string;
    no_external_execution: true;
    no_file_write: true;
    no_shell: true;
  };
  risk_level: "low" | "medium" | "high";
  execution_mode: "sequential";
  budget: {
    max_steps: number;
    max_tokens_per_step: number;
    max_total_tokens: number;
  };
};
```

## Planner 输出

Planner 只输出 JSON，不返回最终答案。

用户输入：

```text
帮我写一个 Python requests 示例
```

期望：

```text
task_type = code_generation
risk_level = low
steps <= 3
no_shell = true
no_file_write = true
no_external_execution = true
```

## Day 4 回复方式

Day 4 暂不执行任务，返回：

```text
已生成任务计划：
任务类型：code_generation
风险等级：low
步骤数：2
下一阶段将接入 SchemaValidator、Guard 和 Executor。
```

## 验收标准

```text
1. 普通聊天仍走 Chat Layer。
2. /status 仍走 CommandRouter。
3. 任务型请求走 Planner。
4. Planner 调 decisionModel。
5. Planner 输出合法 JSON。
6. Day 4 不执行任务。
```
