# Personal Context Layer 方向设计

## 背景

`wx-agent-bridge` 最初的方向是：

```text
微信消息
  -> Bridge
  -> Agent
  -> 工具 / 模型 / 文件 / 命令行
  -> 微信回复
```

这个方向可以跑通“微信远程驱动 Agent”的闭环，但继续往下做会很快变成重新实现一套 Agent Runtime：

```text
模型接入
搜索
文件创建
命令行
工具权限
沙箱
工作流
多 Agent 调度
浏览器
审计日志
失败恢复
```

这些能力已经有成熟工具在做：

```text
Codex
Qwen Code
Claude Code
Cursor Agent
其他 CLI Agent / MCP 工具链
```

如果 `wx-agent-bridge` 继续自己重做这些基础设施，项目会变大、变慢、变散，并且很难形成独特价值。

## 修正结论

`wx-agent-bridge` 不应该定位成通用 Agent Runtime。

新的定位是：

```text
Personal Context Layer
个人上下文层
```

它的核心价值不是“自己执行所有工具”，而是：

```text
记住用户
理解当前上下文
维护项目状态
把自然语言整理成可执行意图
把外部 Agent 的结果翻译成人话
在微信里提供连续、自然、有记忆的交互入口
```

一句话：

```text
不要造微信版 Codex。
要造一个懂用户、会记事、会说人话、会转交任务的上下文中枢。
```

## 新定位

```text
WeChat
  -> wx-agent-bridge
  -> Memory System
  -> Conversation Layer
  -> Intent Router
  -> External Agent Adapter
  -> Humanized Response
  -> WeChat
```

其中：

```text
Memory System
  负责长期记忆、会话记忆、项目记忆、Agent 运行摘要。

Conversation Layer
  负责说人话、保留语气、减少客服腔、判断什么时候该短答。

Intent Router
  负责识别这句话是聊天、提醒、项目任务、文档任务、代码任务还是外部 Agent 任务。

External Agent Adapter
  负责把任务交给 Codex / Qwen Code / Claude Code，而不是自己执行所有工具。

Humanized Response
  负责把执行结果整理成用户真正看得懂的微信回复。
```

## 旧方向的问题

### 1. 容易重造 Agent Runtime

如果 Bridge 自己接：

```text
文件系统
命令行
搜索
浏览器
Git
工具权限
工作流编排
```

那它就会变成一个半成品 IDE 后端。

这不是微信入口最该做的事。

### 2. 独特价值不明显

通用工具能力越做越多，但用户真正感知到的可能只是：

```text
能跑命令
能改文件
能返回日志
```

这些 Codex 已经能做。

Bridge 自己重做一遍，没有明显增益。

### 3. 用户体验仍然可能很差

即使工具全接上，如果回复还是：

```text
已执行。
操作完成。
请查看日志。
```

用户仍然会觉得它不像人、不中用、没有陪伴感。

所以“说人话”不是锦上添花，是核心能力。

### 4. 记忆缺失会导致重复劳动

如果系统不记得：

```text
用户偏好
项目边界
之前的纠正
最近状态
饮食/作息/提醒习惯
文档放哪里
提交是否要 push
```

那么每次都要用户重新解释。

这才是最应该优先解决的问题。

## 新目标

后续目标从“工具能力优先”改为“上下文能力优先”。

优先做：

```text
1. 记忆系统更完善、更精准。
2. 回复更像人话，更少工具腔。
3. 聊天上下文更连续。
4. 项目状态更清楚。
5. 外部 Agent 分发更稳定。
6. 执行结果更会总结和翻译。
```

暂缓做：

```text
自己实现搜索引擎
自己实现文件创建工具
自己实现命令行工具体系
自己实现完整权限沙箱
自己实现复杂工作流引擎
自己实现多模型通用 Agent Runtime
```

## 核心模块

### 1. Memory System

记忆系统是第一优先级。

需要分层：

```text
User Memory
  用户长期偏好、习惯、语言风格、照看规则。

Session Memory
  当前连续聊天上下文、短期状态、刚刚纠正过的内容。

Project Memory
  项目方向、架构决策、当前里程碑、文档边界。

Agent Runtime Summary
  外部 Agent 最近做过什么、失败原因、提交状态、服务状态。
```

目标：

```text
用户不需要反复提醒。
系统回答前会先想“记忆里有没有相关锚点”。
短期状态不会误写成长期事实。
语音识别错误不会污染记忆。
项目决策可以被 Codex/Qwen 共享。
```

### 2. Conversation Layer

Conversation Layer 负责“说人话”。

它不是简单润色，而是要处理：

```text
语气
称呼
长短
上下文承接
吐槽和照看感
是否需要解释
什么时候该直接给结论
什么时候该少说话
```

例如，同一个工具结果：

```text
npm run docs:build 通过。
git push 成功。
```

不应该直接返回成日志。

应该转成：

```text
文档站构建过了，也已经推到远端。
你等部署跑完就能看线上效果。
```

### 3. Intent Router

Intent Router 判断用户这句话该走哪里。

常见类型：

```text
casual_chat
care_context
memory_update
project_discussion
docs_task
code_task
agent_handoff
reminder_task
health_lite
shopping_decision
schedule_lookup
```

不同类型使用不同策略：

```text
闲聊：少工具调用，直接自然回复。
个人化问题：先检索记忆。
项目任务：检索项目记忆和 docs-preview。
代码任务：转交 Codex/Qwen Code。
时效信息：联网查证。
健康/法律/金融：更谨慎，必要时查证和提示边界。
```

### 4. External Agent Adapter

Bridge 不直接做所有执行。

它只负责把任务交给合适 Agent：

```text
Codex Adapter
Qwen Code Adapter
Claude Code Adapter
Shell Agent Adapter
Docs Agent Adapter
```

Adapter 要做的不是“万能执行”，而是标准化任务：

```json
{
  "agent": "codex",
  "project": "docs-preview",
  "task_type": "docs_update",
  "goal": "新增 Personal Context Layer 方向修正文档",
  "context": {
    "memory_refs": ["mem_project_docs_preview", "mem_bridge_direction"],
    "files": [
      "docs/wx-agent-bridge/index.md",
      "docs/.vitepress/config.ts"
    ]
  },
  "constraints": [
    "开发文档放 docs-preview",
    "构建通过后再汇报",
    "不要覆盖用户未提交改动"
  ]
}
```

### 5. Humanized Result Builder

外部 Agent 执行完后，Bridge 不能只转发原始输出。

需要整理成：

```text
做了什么
改了哪里
验证是否通过
有没有风险
下一步是什么
```

并且用用户能接受的语气表达。

## 推荐架构

```text
src/
  conversation/
    conversation.module.ts
    conversation-policy.service.ts
    humanized-response.service.ts
    tone-profile.service.ts

  memory/
    memory.module.ts
    memory-retrieval.service.ts
    memory-writer.service.ts
    memory-policy.service.ts
    memory-candidate-extractor.service.ts

  intent/
    intent-router.service.ts
    intent.types.ts

  agent-handoff/
    agent-handoff.module.ts
    agent-router.service.ts
    codex-adapter.service.ts
    qwen-code-adapter.service.ts
    handoff-task.types.ts

  project-context/
    project-context.service.ts
    project-state.service.ts

  response/
    response-builder.service.ts
    result-summarizer.service.ts
```

## 新主流程

```text
1. 收到微信消息。
2. 标准化消息。
3. 识别 intent。
4. 按 intent 检索记忆。
5. 判断是否需要外部 Agent。
6. 如果不需要，直接生成自然回复。
7. 如果需要，生成 handoff task。
8. 外部 Agent 执行。
9. Bridge 接收执行结果。
10. Humanized Result Builder 转成人话。
11. 回复微信。
12. 提取候选记忆和项目状态更新。
```

## 优先级调整

### P0：记忆和上下文

```text
聊天记录摘要
会话上下文
长期记忆提取
项目记忆
记忆冲突处理
记忆检索注入
```

### P1：说人话

```text
回复风格策略
长短控制
项目结果总结
闲聊和任务模式切换
避免客服腔和日志腔
```

### P2：Agent Handoff

```text
Codex 任务转交
Qwen Code 任务转交
任务上下文打包
执行结果解析
```

### P3：轻量工具

只保留 Bridge 自己必须拥有的小工具：

```text
查记忆
写记忆
查项目状态
发微信
读 docs-preview 文档索引
管理提醒
```

### P4：复杂工具权限

文件写入、命令行、搜索、浏览器这类能力不作为 Bridge 主线。

只有当外部 Agent 不能覆盖时，再做最小适配。

## 文档方向调整

之前的 Day 10-11 Agent Runtime 文档不删除，但应降级为后续参考。

新的主线应该是：

```text
Day 8：记忆系统
Day 8.1：聊天记录和会话上下文
Day 8.2：Personal Context Layer 方向修正
Day 8.3：说人话策略
Day 8.4：Agent Handoff 协议
Day 9：管理后台只服务配置和记忆可视化
```

## 验收标准

### 记忆精准度

```text
用户问个性化问题时，会主动使用相关记忆。
用户纠正后，下次不会再犯同类错。
短期状态不会污染长期记忆。
项目决策能被后续任务读取。
```

### 说人话

```text
回复不像接口日志。
不把用户当成陌生人。
能承接上下文。
能在闲聊时少调用工具。
能在任务完成时用人话总结。
```

### Agent Handoff

```text
能把代码任务转交给 Codex。
能把文档任务转交给 docs-preview 工作流。
能把执行结果转成简短微信回复。
不会自己重造一整套命令行 Agent。
```

## 非目标

明确不做：

```text
微信版 IDE
通用 Agent Runtime
完整 Shell 执行平台
完整 MCP 平台
多用户 SaaS Agent 后台
复杂权限系统第一优先级
```

## 给 Codex 的分析提示词

下面这段可以直接发给 Codex，让它分析这个方向修正是否合理。

---

你是一个资深 Agent 产品架构师和 TypeScript / NestJS 工程师。

请基于 `wx-agent-bridge` 当前方向，评审这次定位修正：

```text
从“微信 Agent Runtime / 工具执行桥”
改为“Personal Context Layer / 个人上下文层”
```

请重点分析：

```text
1. 是否应该停止继续自研完整工具执行和命令行 Runtime。
2. 记忆系统、会话上下文、说人话是否应该成为第一优先级。
3. Bridge 和 Codex / Qwen Code / Claude Code 的边界应该如何划分。
4. Agent Handoff 协议应该怎样设计。
5. 现有 Day 8-11 文档应该如何调整优先级。
6. MVP 应该砍掉哪些能力，保留哪些能力。
7. 哪些模块必须现在设计，哪些可以推迟。
```

请输出：

```text
1. 方向判断。
2. 新架构建议。
3. 模块边界。
4. MVP 路线。
5. 需要删除、降级或保留的旧文档。
6. 风险和反例。
7. 下一步可执行任务清单。
```

不要直接写代码。

先做架构评审和路线修正。
