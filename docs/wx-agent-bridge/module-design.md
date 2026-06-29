# 模块设计

## 总体模块

推荐 NestJS 模块划分：

```text
AppModule
  ConfigModule
  PlatformModule
  MessageModule
  CommandModule
  ProjectModule
  SessionModule
  LlmModule
  PlannerModule
  TaskModule
  GuardModule
  ExecutorModule
  ResponseModule
  PipelineModule
  StorageModule
  QueueModule
  AdminModule
```

第一阶段不用全部实现。Day 1 只实现 Config、Message、Command、Project、Session、Response、Pipeline、Mock。

## ConfigModule

职责：

```text
读取 config.yaml
展开环境变量
校验配置结构
提供项目、模型、权限、平台配置查询
```

关键服务：

```text
AppConfigService
```

关键方法：

```ts
getApp()
getProjects()
getDefaultProject()
getProject(name: string)
```

## PlatformModule

职责：

```text
接收平台消息
发送平台消息
处理平台鉴权
处理消息去重
```

第一阶段只做微信。

后续平台：

```text
企业微信
飞书
钉钉
Telegram
Slack
Web Chat
```

## MessageModule

职责：

```text
把平台原始消息转成 NormalizedMessage
隐藏平台差异
为后续模块提供统一输入
```

不要让 Planner、Guard、Executor 直接依赖微信原始字段。

## CommandModule

职责：

```text
识别 / 开头命令
处理系统控制命令
命令不进入 Planner
```

第一阶段命令：

```text
/help
/status
/new
/model
/mode
/dir
/stop
```

后续命令：

```text
/project list
/project switch <name>
/model switch <name>
/mode ask
```

## ProjectModule

职责：

```text
根据用户、群、会话找到当前项目
提供项目配置
控制 allow_from 和 admin_from
```

第一阶段只支持单项目。

## SessionModule

职责：

```text
保存当前用户上下文
保存当前项目
保存最近消息
保存当前任务状态
```

第一阶段可以用内存或本地 JSON。

后续改成 Redis + DB。

## LlmModule

职责：

```text
统一模型供应商接口
根据配置创建模型实例
屏蔽 OpenAI、Qwen、DeepSeek、Zhipu 差异
```

业务代码只使用：

```text
chatModel
decisionModel
executionModel
```

不要在业务流程里写死具体供应商。

## PlannerModule

职责：

```text
把自然语言任务转成 TaskSchema
不执行任务
不调用工具
不返回最终答案
```

输出必须是结构化 JSON。

## TaskModule

职责：

```text
定义 TaskSchema
校验 Schema
管理任务状态机
记录 task 和 task_steps
```

状态：

```text
created
planning
validated
rejected
running
waiting_confirm
done
failed
stopped
```

## GuardModule

职责：

```text
判断任务是否允许执行
控制风险等级
控制权限
控制工具调用边界
```

第一阶段只允许 low 风险任务。

## ExecutorModule

职责：

```text
按 TaskSchema 的 step 生成结果
第一阶段只调用模型生成文本
不执行 shell
不写文件
不访问数据库
```

Executor 不能修改 TaskSchema。

## ResponseModule

职责：

```text
合并 step 输出
格式化微信可读文本
处理超长分段
处理错误和拒绝原因
```

## PipelineModule

职责：

```text
串联主流程
统一处理来自微信、Mock、Web、队列的消息
```

主方法：

```ts
handle(rawMessage: unknown): Promise<PipelineResult>
```

Controller 和 Adapter 都应该调用 Pipeline，而不是自己写业务流程。

## StorageModule

职责：

```text
保存用户、会话、消息、任务、日志
```

开发阶段：

```text
SQLite
```

生产阶段：

```text
PostgreSQL 或 MySQL
Redis
```

## QueueModule

职责：

```text
多进程任务分发
控制任务并发
支持重试、超时和取消
```

建议后续使用 Redis 队列。

## AdminModule

职责：

```text
聊天内容管理
任务日志查询
用户权限管理
项目配置管理
模型配置管理
运行状态查看
```

不要在 Phase 1 做 Admin UI。先留出接口和数据结构。
