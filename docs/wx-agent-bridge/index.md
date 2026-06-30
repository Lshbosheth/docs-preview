# 微信 AI Agent Bridge 项目总览

## 项目目标

这个项目要做的不是普通微信机器人，而是一个可以通过微信远程驱动 AI Agent 的 Bridge 系统。

第一阶段先跑通最小闭环：

```text
微信消息
  -> Adapter
  -> Message Normalizer
  -> Command Router
  -> Project Router
  -> Session Manager
  -> Model Router
  -> Chat / Planner / Executor
  -> Guard
  -> Response Builder
  -> 微信回复
```

第一阶段不追求功能多，只追求链路稳定、边界清楚、后续能扩。

## 技术路线

推荐直接使用 NestJS，因为后续会有多进程、任务队列、聊天内容管理、管理后台和权限体系。

第一阶段仍然保持最小范围：

```text
NestJS
TypeScript
YAML 配置
本地 JSON 或 SQLite 存储
单微信入口
单项目
规则 Guard
文本生成 Executor
```

暂时不做：

```text
文件写入
Shell 执行
数据库写入
自动部署
多平台
多 Agent Runtime
Web UI
复杂队列
长期记忆
```

## 最小可运行版本

第一版只需要实现这些能力：

```text
1. 服务能启动
2. 能加载 config.yaml
3. 能模拟收到一条微信消息
4. 能标准化成 NormalizedMessage
5. 能识别 /help、/status、/model、/mode、/dir
6. 非命令消息先返回固定回复
7. 有基础日志
```

这一步完成后，再接真实微信和模型。

## 核心边界

项目里最重要的不是模型，而是边界。

```text
Controller 只负责入口
Pipeline 负责串联主流程
Planner 只生成 Task Schema
Schema Validator 只校验边界
Guard 只判断能不能做
Executor 只按 Schema 产出结果
Tool Router 后续统一管工具
Response Builder 只负责整理回复
```

不要让 Controller、模型 Provider 或微信 Adapter 直接承载业务主流程。

## 文档入口

### 总览

- [实施路线图](/wx-agent-bridge/implementation-roadmap)
- [模块设计](/wx-agent-bridge/module-design)
- [开发任务 Backlog](/wx-agent-bridge/task-backlog)
- [验收用例](/wx-agent-bridge/acceptance-tests)

### Day 1 启动骨架

- [计划](/wx-agent-bridge/day-1-bootstrap)
- [Qwen 提示词](/wx-agent-bridge/qwen-day-1-implementation-prompt)

### Day 2 微信入口

| 阶段 | 计划 | Qwen 提示词 |
| --- | --- | --- |
| 2.0 基础入口 | [计划](/wx-agent-bridge/day-2-weixin-plan) | [Qwen](/wx-agent-bridge/qwen-day-2-implementation-prompt) |
| 2.5 iLink 接入 | [计划](/wx-agent-bridge/day-2-5-ilink-plan) | [Qwen](/wx-agent-bridge/qwen-day-2-5-ilink-implementation-prompt) |
| 2.6 长轮询 | [计划](/wx-agent-bridge/day-2-6-ilink-long-poll-plan) | [Qwen](/wx-agent-bridge/qwen-day-2-6-ilink-long-poll-implementation-prompt) |
| 2.7 扫码登录 | [计划](/wx-agent-bridge/day-2-7-ilink-qr-login-plan) | [Qwen](/wx-agent-bridge/qwen-day-2-7-ilink-qr-login-implementation-prompt) |
| 2.8 发送修正 | [计划](/wx-agent-bridge/day-2-8-ilink-send-fix-plan) | [Qwen](/wx-agent-bridge/qwen-day-2-8-ilink-send-fix-implementation-prompt) |
| 2.9 SDK 接入修正 | [计划](/wx-agent-bridge/day-2-9-ilink-sdk-plan) | [Qwen](/wx-agent-bridge/qwen-day-2-9-ilink-sdk-implementation-prompt) |

- [Day 2.9 SDK 二维码绑定测试清单](/wx-agent-bridge/day-2-9-sdk-qr-binding-test)

### Day 3-6 核心能力

| 阶段 | 计划 | Qwen 提示词 |
| --- | --- | --- |
| Day 3 模型 Provider 和 Chat Layer | [计划](/wx-agent-bridge/day-3-model-provider-plan) | [Qwen](/wx-agent-bridge/qwen-day-3-model-provider-implementation-prompt) |
| Day 4 Planner 和 TaskSchema | [计划](/wx-agent-bridge/day-4-planner-task-schema-plan) | [Qwen](/wx-agent-bridge/qwen-day-4-planner-task-schema-implementation-prompt) |
| Day 5 SchemaValidator 和 Guard | [计划](/wx-agent-bridge/day-5-validator-guard-plan) | [Qwen](/wx-agent-bridge/qwen-day-5-validator-guard-implementation-prompt) |
| Day 6 Executor 和 ResponseBuilder | [计划](/wx-agent-bridge/day-6-executor-response-plan) | [Qwen](/wx-agent-bridge/qwen-day-6-executor-response-implementation-prompt) |

### Day 7 管理后台

| 阶段 | 计划 | Qwen 提示词 |
| --- | --- | --- |
| Day 7 管理后台 MVP | [计划](/wx-agent-bridge/day-7-admin-console-plan) | [Qwen](/wx-agent-bridge/qwen-day-7-admin-console-implementation-prompt) |

### Day 8 记忆系统

- [聊天记忆系统设计](/wx-agent-bridge/day-8-chat-memory-system-design)
- [Agent 工具权限设计](/wx-agent-bridge/day-8-agent-tool-permission-design)

| 阶段 | 计划 | Qwen 提示词 |
| --- | --- | --- |
| Day 8.1 聊天记录和会话上下文 | [计划](/wx-agent-bridge/day-8-1-session-context-plan) | [Qwen](/wx-agent-bridge/qwen-day-8-1-session-context-implementation-prompt) |

### Day 9 管理后台配置中心

| 阶段 | 计划 | Qwen 提示词 |
| --- | --- | --- |
| Day 9 配置中心 | [计划](/wx-agent-bridge/day-9-admin-config-center-plan) | [Qwen](/wx-agent-bridge/qwen-day-9-admin-config-center-implementation-prompt) |
| Day 9.1 配置中心收尾 | - | [Qwen](/wx-agent-bridge/qwen-day-9-1-admin-config-center-finish-prompt) |

### Day 10-11 Agent Runtime 和权限

| 阶段 | Qwen 提示词 |
| --- | --- |
| Day 10 Agent Runtime + 工具权限 MVP | [Qwen](/wx-agent-bridge/qwen-day-10-agent-runtime-tool-permission-mvp-prompt) |
| Day 11 长期记忆接入工具权限策略 | [Qwen](/wx-agent-bridge/qwen-day-11-memory-permission-integration-prompt) |
