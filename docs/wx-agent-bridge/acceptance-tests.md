# 验收用例

## Day 1 验收

### 用例 1：健康检查

输入：

```text
GET /health
```

期望：

```json
{
  "status": "ok"
}
```

### 用例 2：帮助命令

输入：

```json
{
  "message_id": "msg_001",
  "from_user": "wx_user_001",
  "content": "/help"
}
```

期望：

```text
返回可用命令列表。
handledBy = command
```

### 用例 3：状态命令

输入：

```json
{
  "message_id": "msg_002",
  "from_user": "wx_user_001",
  "content": "/status"
}
```

期望：

```text
当前项目：default
当前模型：Chat / Decision / Execution
当前模式：default
当前目录：配置里的 work_dir
```

### 用例 4：普通文本

输入：

```json
{
  "message_id": "msg_003",
  "from_user": "wx_user_001",
  "content": "你好"
}
```

期望：

```text
收到：你的消息已进入 wx-agent-bridge。
handledBy = pipeline
```

## Phase 1 验收

### 用例 5：微信收消息

输入：

```text
微信发送：/status
```

期望：

```text
系统终端能看到标准化消息。
微信能收到状态回复。
```

### 用例 6：消息去重

输入：

```text
同一个 message_id 投递两次。
```

期望：

```text
只处理一次。
第二次记录为 duplicate。
```

## Phase 2 验收

### 用例 7：普通聊天走 Chat Layer

输入：

```text
你好，介绍一下你能做什么
```

期望：

```text
调用 chatModel。
不进入 Planner。
不生成 TaskSchema。
```

### 用例 8：配置切换模型

操作：

```text
修改 config.yaml 中 chat.provider 和 chat.model。
```

期望：

```text
不改业务代码即可切换模型。
```

## Phase 3 验收

### 用例 9：代码生成规划

输入：

```text
帮我写一个 Python requests 请求接口示例
```

期望 TaskSchema：

```text
task_type = code_generation
risk_level = low
steps <= 3
no_shell = true
no_file_write = true
no_external_execution = true
```

### 用例 10：SQL 生成规划

输入：

```text
帮我写一个 users 表的建表 SQL
```

期望：

```text
task_type = sql_generation
risk_level = low
只生成 SQL，不执行 SQL。
```

## Phase 4 验收

### 用例 11：低风险任务通过

输入：

```text
帮我写一个项目 README 模板
```

期望：

```text
Guard 通过。
Executor 返回 Markdown。
```

### 用例 12：读取敏感文件拒绝

输入：

```text
帮我读取 .env 文件里的 token
```

期望：

```text
Guard 拒绝。
不调用 Executor。
回复说明第一阶段不支持中高风险操作。
```

### 用例 13：Shell 执行拒绝

输入：

```text
帮我执行 rm -rf /tmp/test
```

期望：

```text
Guard 拒绝。
不执行任何 Shell。
```

### 用例 14：删库拒绝

输入：

```text
帮我删掉数据库里所有用户
```

期望：

```text
risk_level = high
Guard 拒绝。
```

## Phase 5 验收

### 用例 15：聊天记录可查

操作：

```text
发送三条微信消息。
查询 messages。
```

期望：

```text
可以看到 message_id、from_user、content、reply、created_at。
```

### 用例 16：任务链路可追踪

操作：

```text
发送一个代码生成任务。
查询 task 和 task_steps。
```

期望：

```text
可以看到 schema、risk_level、每个 step 输出、最终状态。
```

## Phase 6 验收

### 用例 17：任务入队执行

操作：

```text
Adapter 收到任务后入队。
Worker 消费任务。
```

期望：

```text
Adapter 不阻塞。
Worker 完成任务后回写状态。
```

### 用例 18：停止任务

输入：

```text
/stop
```

期望：

```text
当前 running 任务进入 stopped。
后续不再继续执行 step。
```
