# 微信 AI Agent Bridge 实施路线图

## 总原则

先做无模型、无微信、无数据库的 Pipeline 骨架。

再逐步接入命令、模型、Planner、Guard、Executor、真实微信、多进程。

每一阶段都必须有可运行的验收结果，避免只堆代码不闭环。

## Phase 0：项目骨架

目标：

```text
NestJS 项目能启动
配置能加载
Pipeline 能接收 mock 消息
/status 能返回状态
日志能看到完整链路
```

不接真实微信，不接真实模型，不接数据库。

验收：

```text
npm run start:dev
调用 mock 入口发送 /status
返回当前项目、模型配置、权限模式、工作目录
```

## Phase 1：微信文本最小闭环

目标：

```text
微信文本消息能进入系统
系统能回复微信文本
message_id 能去重
基础命令可用
普通文本能走 Chat Layer
```

范围：

```text
WeixinAdapter
WeixinClient
WeixinSender
MessageNormalizer
CommandRouter
SessionManager
ResponseBuilder
```

验收：

```text
微信发送 /help，可以收到帮助
微信发送 /status，可以收到系统状态
微信发送 你好，可以收到模型或固定回复
重复 message_id 不重复处理
```

## Phase 2：模型 Provider 和三层路由

目标：

```text
ProviderFactory 可根据配置创建模型客户端
Chat / Decision / Execution 三层模型分开
业务代码不写死具体模型名
```

范围：

```text
LlmModule
BaseLLMProvider
OpenAICompatibleProvider
ProviderFactory
ModelRouter
```

验收：

```text
只改 config.yaml 就能切换 chat、decision、execution 模型
普通聊天走 Chat Layer
任务型请求可以进入 Decision Layer
```

## Phase 3：Planner + Task Schema

目标：

```text
用户自然语言任务能被转成结构化 TaskSchema
Schema 字段完整
steps、risk_level、constraints、budget 能被锁定
```

范围：

```text
PlannerService
TaskSchema 类型
planner.md prompt
SchemaValidator
任务状态 created -> planning -> validated
```

验收：

```text
输入：帮我写一个 Python requests 示例
输出：task_type = code_generation
risk_level = low
steps <= 3
no_shell = true
no_file_write = true
```

## Phase 4：Guard + Executor

目标：

```text
低风险任务可以执行
中高风险任务被拒绝
Executor 只生成文本，不执行外部操作
```

范围：

```text
SafetyGuard
ExecutorService
executor.md prompt
ResponseBuilder 合并 step 输出
任务状态 validated -> running -> done / rejected
```

验收：

```text
帮我写一个 Python requests 示例 -> 返回代码和说明
帮我读取 .env 文件 -> 拒绝
帮我删掉数据库所有用户 -> 拒绝
```

## Phase 5：存储和聊天内容管理

目标：

```text
消息、会话、任务、步骤、日志可以持久化
后续管理后台可以查询聊天内容和任务状态
```

建议存储：

```text
开发阶段：SQLite
生产阶段：PostgreSQL 或 MySQL + Redis
```

核心表：

```text
users
projects
sessions
messages
tasks
task_steps
execution_logs
```

## Phase 6：多进程和队列

目标：

```text
Adapter 进程负责收消息
API 进程负责管理和查询
Worker 进程负责任务执行
Redis 队列负责任务分发
```

建议命令：

```bash
wx-agent-bridge start api
wx-agent-bridge start worker
wx-agent-bridge start weixin
```

或者先用 NestJS monolith 内部模块跑通，再拆成多个进程。

## Phase 7：Tool Router 和 Agent Runtime

目标：

```text
Executor 不直接调用工具
工具统一走 Tool Router
危险工具必须二次确认
后续接 Codex、Claude Code、Cursor Agent
```

第一批工具：

```text
项目结构扫描
文件只读
Git diff 查看
HTTP GET
日志读取
数据库只读查询
```

危险工具：

```text
文件写入
文件删除
Shell
数据库写入
外部 POST
自动部署
群发消息
```

## 当前建议

现在先做 Phase 0。

不要一开始就接真实微信、数据库、队列和 Agent Runtime。先让 mock 消息能完整穿过 Pipeline，再逐层替换真实实现。
