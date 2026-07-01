# wx-agent-bridge 代码学习导览

## 为什么还值得看

`wx-agent-bridge` 后续不再作为主线产品继续推进。

但它仍然适合当代码学习材料。

原因很简单：它身上留下了一个 AI 项目从“想做微信 Agent Runtime”到“改成 Personal Context Layer”的完整痕迹。

这比一个干净到像样板工程的项目更适合学习。

你能看到：

```text
NestJS 怎么拆模块
一条消息怎么进 Pipeline
微信入口怎么适配
模型调用怎么包 provider
会话上下文怎么存
管理后台怎么接 API
AI 生成代码哪里会膨胀
方向跑偏后哪些模块应该降级
```

## 当前定位

当前 README 已经把它改成：

```text
WeChat gateway for a Personal Context Layer
```

现在应该这样理解：

```text
微信入口
  -> 消息标准化
  -> 会话上下文
  -> 记忆 / 项目状态
  -> 意图识别
  -> 外部 Agent Handoff
  -> 人话回复
```

早期的 `agent / tools / permissions / audit` 模块还在，但它们现在更像历史样本，不是第一学习主线。

## 先看哪条线

别一上来啃目录树。

先看一条消息怎么走。

推荐顺序：

```text
src/main.ts
src/app.module.ts
src/mock/mock.controller.ts
src/pipeline/pipeline.service.ts
src/chat/chat.service.ts
src/memory/conversation-log.service.ts
src/memory/session-context.service.ts
```

这几份读完，项目主线就有感觉了。

## 入口层

先看：

```text
src/main.ts
src/app.module.ts
```

`main.ts` 是启动入口。

`AppModule` 是总装配台。

从 `AppModule` 可以看到项目模块：

```text
config
message
command
llm
chat
task
planner
guard
executor
response
pipeline
mock
health
platform
admin
config-center
memory
agent
```

这是 NestJS 项目的骨架。

## Mock 消息入口

看：

```text
src/mock/mock.controller.ts
```

它暴露：

```text
POST /mock/message
```

这是最适合学习的入口，因为不用真的接微信。

它只做一件事：

```text
把请求体交给 PipelineService.handle()
```

这点挺好。

Controller 没有塞业务，业务都往 Pipeline 走。

## Pipeline 主流程

核心文件：

```text
src/pipeline/pipeline.service.ts
```

这是整个项目最值得看的文件。

它现在的流程是：

```text
normalize raw message
  -> 读取最近会话上下文
  -> 保存用户消息
  -> 判断命令 / 任务 / 闲聊
  -> 生成回复
  -> 保存助手回复
```

关键分支：

```text
commandRouter.isCommand()
taskClassifier.isTaskRequest()
handleChat()
handleTaskRequest()
```

这就是一个微信聊天 Agent 的最小骨架。

哪怕以后不做这个项目，这条 Pipeline 思路也是能学的。

## 消息标准化

看：

```text
src/message/message-normalizer.service.ts
src/message/types.ts
```

这里的思想是：

```text
外部消息不要直接进业务。
先转成内部统一结构。
```

微信、mock、iLink 后续都应该转成 `NormalizedMessage`。

这类抽象是值得学的。

## 会话上下文

看：

```text
src/memory/conversation-log.service.ts
src/memory/session-context.service.ts
src/memory/stores/json-conversation.store.ts
src/memory/memory.types.ts
```

当前做了这些：

```text
保存用户消息
保存助手回复
按 chatId 取最近 N 条
把最近上下文注入 ChatService
```

它还不是完整长期记忆。

但它是“记忆系统”的第一块砖。

## ChatService

看：

```text
src/chat/chat.service.ts
```

它做的事：

```text
读取默认项目配置
选择聊天模型
加载 system prompt
注入最近会话上下文
调用 provider.chat()
返回模型回复
```

以后如果要做“更说人话”，这个模块会是重点。

现在它还比较薄，更多是模型调用包装。

## LLM Provider

看：

```text
src/llm/provider-factory.service.ts
src/llm/openai-compatible.provider.ts
src/llm/types.ts
```

学习点：

```text
业务层不要直接绑死某个模型 SDK。
中间包一层 provider。
```

这样以后换 OpenAI / Qwen / 其他 OpenAI-compatible 服务时，主流程不用大改。

## 微信和 iLink

看：

```text
src/platform/weixin/
src/platform/weixin/ilink/
```

这里分两块：

```text
weixin/
  平台抽象层

weixin/ilink/
  真实 iLink 接入尝试
```

iLink 部分有历史探索痕迹。

学习时不要一开始扎进去。

建议只看：

```text
ILinkMessageMapper
ILinkSender
ILinkPollingService
ILinkSdkClient
```

先理解“外部微信消息如何变成内部消息”。

扫码、token、SDK 细节可以后面再看。

## 配置中心和后台

后端：

```text
src/config/
src/config-center/
src/admin/
src/memory/memory-admin.controller.ts
src/permissions/permission-admin.controller.ts
```

前端：

```text
admin-web/src/App.tsx
admin-web/src/pages/
admin-web/src/api/client.ts
```

这里可以学：

```text
YAML 配置加载
zod schema 校验
prompt 配置
API key 管理
配置审计
管理后台页面拆分
```

这块是一个“后端 NestJS + 前端 React 管理台”的小样本。

## 先别深挖的模块

先别花太多力气在：

```text
src/agent/
src/tools/
src/permissions/
src/audit/
```

这些不是没价值。

只是它们代表旧方向：自己做 Agent Runtime 和工具权限。

现在方向已经变了，所以先当历史参考。

## 值得保留的设计

```text
Controller 薄，Pipeline 承载主流程
消息先 normalize
模型调用走 provider
会话上下文从 memory 模块取
平台接入和业务 Pipeline 分开
配置中心单独成模块
管理后台和后端 API 分层
```

这些都值得学。

## 暴露出来的问题

```text
方向变化后，旧模块残留比较多
Agent Runtime 和 Personal Context Layer 混在一起
记忆系统还很浅
人话层还没有独立模块
iLink 接入探索痕迹重
AI 生成代码有些地方边界不稳
```

……这也挺有学习价值。

真实项目经常就是这样，不是每一步都干净得像教材。

## 学习路线

第一遍只看主线：

```text
MockController
PipelineService
ChatService
ConversationLogService
SessionContextService
```

第二遍看模块：

```text
AppModule
各个 *.module.ts
```

第三遍看模型和配置：

```text
llm/
config/
config-center/
```

第四遍看平台：

```text
platform/weixin/
platform/weixin/ilink/
```

最后再看旧方向：

```text
agent/
tools/
permissions/
audit/
```

## Understand Anything 状态

Understand Anything 已经安装到：

```text
C:\Users\EDY\.understand-anything\repo
```

它也给 Codex 建了技能链接：

```text
C:\Users\EDY\.agents\skills\understand
```

但当前 Codex 会话不会立刻识别新技能。

需要重启 Codex 或开新会话后，才能尝试：

```text
/understand D:\lshbosheth\wx-agent-bridge --language zh
```

它会生成类似：

```text
D:\lshbosheth\wx-agent-bridge\.understand-anything\knowledge-graph.json
```

注意：`wx-agent-bridge` 当前有不少未提交改动。

跑 `/understand` 前最好先确认是否接受新增 `.understand-anything/` 目录。

## 一句话结论

这个项目不用继续当主线产品做。

但它可以当代码标本看：

```text
看 AI 生成项目怎么长出来
看 NestJS 模块怎么组织
看 Pipeline 怎么串
看方向跑偏后怎么降级旧模块
看 Personal Context Layer 怎么从 Agent Runtime 里拆出来
```

别把它当“必须继续完善的大工程”。

把它当“有点乱但很真实的学习样本”，反而更值。
