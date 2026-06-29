# Qwen Day 4 Planner 和 TaskSchema 实施提示词

下面这段可以直接发给 Qwen，让它基于 Day 3 代码继续实现 Day 4。

---

你是一个资深 TypeScript / NestJS 工程师。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 4：Planner 和 TaskSchema。

## 当前已有能力

```text
命令路由
mock / weixin / ilink 入口
PipelineService.handleNormalizedMessage()
LLM Provider
ChatService
普通文本走 chatModel
```

已有能力必须继续可用。

## Day 4 目标

实现：

```text
任务型请求识别
TaskSchema 类型
PlannerService
decisionModel 调用
Planner JSON 输出
任务型请求返回“已生成任务计划”
```

Day 4 只规划，不执行。

## 非目标

不要实现：

```text
SchemaValidator
Guard
Executor
工具调用
文件读写
Shell
数据库
Redis
队列
```

## 新增文件

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

## TaskSchema 类型

`src/task/task-schema.types.ts`：

```ts
export type TaskType =
  | "chat"
  | "summary"
  | "writing"
  | "code_generation"
  | "sql_generation"
  | "plan";

export type RiskLevel = "low" | "medium" | "high";

export type TaskSchema = {
  task_id: string;
  project: string;
  source_message_id: string;
  goal: string;
  task_type: TaskType;
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
  risk_level: RiskLevel;
  execution_mode: "sequential";
  budget: {
    max_steps: number;
    max_tokens_per_step: number;
    max_total_tokens: number;
  };
};
```

## TaskClassifierService

实现：

```ts
isTaskRequest(content: string): boolean
```

Day 4 用简单规则：

```text
包含以下关键词则是任务：
帮我写
生成
设计
计划
SQL
代码
README
文档
脚本
接口
```

其他走 ChatService。

## Planner Prompt

`planner.prompt.ts` 导出字符串：

```text
你是 Decision Layer / Planner。
你的职责是把用户消息转成结构化 TaskSchema。
你不能执行任务。
你不能返回最终答案。
你不能调用工具。
你不能访问文件。
你不能访问网络。
你只能输出 JSON。

当前系统是微信 AI Agent Bridge。
用户通过微信发送任务。
系统第一阶段只允许低风险文本任务。

你必须输出：
{
  "goal": "",
  "task_type": "chat | summary | writing | code_generation | sql_generation | plan",
  "steps": [
    {
      "step_id": 1,
      "name": "",
      "expected_output": "text | markdown | json | python_code | sql"
    }
  ],
  "constraints": {
    "language": "",
    "style": "",
    "no_external_execution": true,
    "no_file_write": true,
    "no_shell": true
  },
  "risk_level": "low | medium | high",
  "execution_mode": "sequential",
  "budget": {
    "max_steps": 3,
    "max_tokens_per_step": 2000,
    "max_total_tokens": 6000
  }
}

规则：
1. steps 最多 3 个。
2. 普通聊天、写文案、总结、生成代码片段，一般是 low。
3. 涉及文件修改、shell、数据库写入、外部请求，是 medium 或 high。
4. 涉及删除、支付、群发、密钥、生产环境，是 high。
5. 只能输出 JSON，不要输出解释。
```

## PlannerService

实现：

```ts
plan(message: NormalizedMessage): Promise<TaskSchema>
```

流程：

```text
1. 读取 default project 的 models.decision
2. ProviderFactory 创建 decision provider
3. 调用 decisionModel.chat()
4. 解析 JSON
5. 补充 task_id、project、source_message_id、work_dir
6. 返回 TaskSchema
```

如果 JSON 解析失败，返回清晰错误。

## Pipeline 调整

`handleNormalizedMessage()`：

```text
1. 命令 -> CommandRouter
2. 非命令且 TaskClassifierService.isTaskRequest(content) = false -> ChatService
3. 非命令且是任务 -> PlannerService.plan()
4. 返回计划摘要，不执行任务
```

计划摘要格式：

```text
已生成任务计划：
任务类型：code_generation
风险等级：low
步骤数：2
下一阶段将接入 SchemaValidator、Guard 和 Executor。
```

如果 `PipelineResult.handledBy` 需要扩展，请加入 `"planner"`。

## 验收

普通聊天：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_401\",\"from_user\":\"wx_user_001\",\"content\":\"你好\"}"
```

任务请求：

```bash
curl -X POST http://localhost:3000/mock/message ^
  -H "Content-Type: application/json" ^
  -d "{\"message_id\":\"msg_402\",\"from_user\":\"wx_user_001\",\"content\":\"帮我写一个 Python requests 示例\"}"
```

## 验收标准

```text
1. /status 仍然走命令。
2. 你好 仍然走 ChatService。
3. 帮我写一个 Python requests 示例 走 PlannerService。
4. Planner 调 decisionModel。
5. 返回计划摘要。
6. 不执行任务。
```
