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

- [实施路线图](/wx-agent-bridge/implementation-roadmap)
- [Day 1 启动任务清单](/wx-agent-bridge/day-1-bootstrap)
- [Qwen Day 1 实施提示词](/wx-agent-bridge/qwen-day-1-implementation-prompt)
- [Day 2 微信入口计划](/wx-agent-bridge/day-2-weixin-plan)
- [Qwen Day 2 微信入口实施提示词](/wx-agent-bridge/qwen-day-2-implementation-prompt)
- [Day 2.5 iLink 微信接入计划](/wx-agent-bridge/day-2-5-ilink-plan)
- [Qwen Day 2.5 iLink 微信接入实施提示词](/wx-agent-bridge/qwen-day-2-5-ilink-implementation-prompt)
- [Day 2.6 iLink 长轮询改造计划](/wx-agent-bridge/day-2-6-ilink-long-poll-plan)
- [Qwen Day 2.6 iLink 长轮询改造实施提示词](/wx-agent-bridge/qwen-day-2-6-ilink-long-poll-implementation-prompt)
- [Day 2.7 iLink 扫码登录计划](/wx-agent-bridge/day-2-7-ilink-qr-login-plan)
- [Qwen Day 2.7 iLink 扫码登录实施提示词](/wx-agent-bridge/qwen-day-2-7-ilink-qr-login-implementation-prompt)
- [Day 2.8 iLink 发送接口修正计划](/wx-agent-bridge/day-2-8-ilink-send-fix-plan)
- [Qwen Day 2.8 iLink 发送接口修正实施提示词](/wx-agent-bridge/qwen-day-2-8-ilink-send-fix-implementation-prompt)
- [Day 2.9 iLink SDK 接入修正计划](/wx-agent-bridge/day-2-9-ilink-sdk-plan)
- [Qwen Day 2.9 iLink SDK 接入实施提示词](/wx-agent-bridge/qwen-day-2-9-ilink-sdk-implementation-prompt)
- [Day 3 模型 Provider 和 Chat Layer 计划](/wx-agent-bridge/day-3-model-provider-plan)
- [Qwen Day 3 模型 Provider 和 Chat Layer 实施提示词](/wx-agent-bridge/qwen-day-3-model-provider-implementation-prompt)
- [Day 4 Planner 和 TaskSchema 计划](/wx-agent-bridge/day-4-planner-task-schema-plan)
- [Qwen Day 4 Planner 和 TaskSchema 实施提示词](/wx-agent-bridge/qwen-day-4-planner-task-schema-implementation-prompt)
- [Day 5 SchemaValidator 和 Guard 计划](/wx-agent-bridge/day-5-validator-guard-plan)
- [Qwen Day 5 SchemaValidator 和 Guard 实施提示词](/wx-agent-bridge/qwen-day-5-validator-guard-implementation-prompt)
- [Day 6 Executor 和 ResponseBuilder 计划](/wx-agent-bridge/day-6-executor-response-plan)
- [Qwen Day 6 Executor 和 ResponseBuilder 实施提示词](/wx-agent-bridge/qwen-day-6-executor-response-implementation-prompt)
- [模块设计](/wx-agent-bridge/module-design)
- [开发任务 Backlog](/wx-agent-bridge/task-backlog)
- [验收用例](/wx-agent-bridge/acceptance-tests)
