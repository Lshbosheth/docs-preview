# Day 8 聊天记忆系统设计

## 背景

当前 `wx-agent-bridge` 的核心价值不只是把微信消息转发给 Agent。

真正有用的形态是：

```text
用户在微信里自然聊天
  -> Bridge 识别当前消息是否有长期价值
  -> 自动沉淀长期记忆 / 项目记忆 / Agent 运行记忆
  -> 后续回复、提醒、推荐、任务执行都能主动利用这些记忆
```

这套能力需要把“聊天上下文”和“可长期复用的记忆”分开。

聊天记录是原始材料，不等于记忆。

记忆应该是被提取、归类、合并、验证、可检索、可撤销的结构化信息。

## 目标

Day 8 设计的是 `wx-agent-bridge` 里的记忆系统主线：

```text
1. 用户通过微信聊天时，可以自动产生候选记忆。
2. 系统能区分长期记忆、会话记忆、项目记忆、Agent 运行记忆。
3. 回复前可以按当前问题检索相关记忆。
4. Agent 执行任务时可以读取项目状态和偏好。
5. 记忆写入要有边界，不能把所有聊天垃圾都塞进长期记忆。
6. 重要记忆支持确认、修正、删除和审计。
```

## 不做事项

第一版不做：

```text
不做复杂知识图谱
不做多用户权限体系
不做云端同步
不做全量语义搜索平台
不做自动读取所有本地文件
不做未经确认的敏感信息长期保存
不把原始聊天记录直接当长期记忆
```

## 核心概念

### 1. 原始消息

原始消息是微信里收到的每一条用户输入：

```text
用户说了什么
什么时候说的
来自哪个会话
是否带图片 / 语音 / 文件
是否触发了某个任务
```

原始消息可以短期保存，用于回溯和摘要，但不直接等同于长期记忆。

### 2. 会话记忆

会话记忆只在当前连续对话中使用。

例如：

```text
刚才说的“那个”指 wx-agent-bridge
用户刚说中午肚子不舒服
用户刚纠正“炸鲤鱼”其实是“炸里脊”
```

它的特点：

```text
生命周期短
上下文依赖强
可以被会话摘要压缩
不一定写入长期存储
```

### 3. 长期用户记忆

长期用户记忆保存稳定偏好、习惯、画像和照看信息。

例如：

```text
默认中文回复
回答前要先考虑历史记忆
晚上吃饭偏好凉拌菜 + 烧饼
英文 TTS 默认 Mia
不喜欢客服腔
技术文档优先放 docs-preview
```

它的特点：

```text
稳定
跨会话复用
影响回复风格和判断
需要去重、合并、修正
```

### 4. 项目记忆

项目记忆保存某个项目的方向、边界、决策和当前状态。

例如：

```text
wx-agent-bridge 当前先做微信 <-> Agent 工作桥
开发文档放 docs-preview，不放代码仓库
iLink 接入应优先 SDK-first
Day 7 是管理后台 MVP
```

它的特点：

```text
绑定 project_id
服务于后续开发任务
比普通聊天摘要更稳定
可以被 Codex / Qwen / 其他 Agent 共享
```

### 5. Agent 运行记忆

Agent 运行记忆保存执行过程中的任务状态和操作记录。

例如：

```text
某次提醒任务为什么失败
某个命令已经执行过
某个文件已经被修改
某个 dev server 当前占用哪个端口
某个提交 hash 已经 push
```

它的特点：

```text
和任务执行强相关
有效期通常比长期用户记忆短
需要可审计
不应该污染用户画像
```

## 记忆分层

建议第一版分成四层：

```text
Memory Layer
  1. Session Memory
  2. User Long-term Memory
  3. Project Memory
  4. Agent Runtime Memory
```

### Session Memory

用途：

```text
维持当前对话连续性
处理“刚才那个”“这个”“你不是说过吗”
避免每条消息都孤立理解
```

存储方式：

```text
短期 JSON
滚动摘要
最近 N 条消息
```

### User Long-term Memory

用途：

```text
回复风格
个人偏好
生活习惯
长期提醒规则
饮食 / 作息 / 学习偏好
```

存储方式：

```text
Markdown canonical memory
结构化 JSON memory entries
后续可加向量索引
```

### Project Memory

用途：

```text
项目架构决策
当前里程碑
文档边界
已确认的技术路线
```

存储方式：

```text
project-memory.json
project-state.md
docs-preview 设计文档
```

### Agent Runtime Memory

用途：

```text
任务状态
工具调用摘要
失败原因
提交 / push 状态
提醒服务状态
```

存储方式：

```text
runtime-events.jsonl
task-state.json
agent-session-summary.md
```

## 总体链路

```text
WeChat Message
  -> Message Normalizer
  -> Session Resolver
  -> Memory Retrieval
  -> Model / Agent Runtime
  -> Response Builder
  -> Memory Candidate Extractor
  -> Memory Classifier
  -> Memory Writer
  -> Audit Log
```

关键点：

```text
回复前先检索记忆。
回复后再提取候选记忆。
不是所有消息都写长期记忆。
写入长期记忆前要分类、去重、合并。
高风险或敏感记忆需要用户确认。
```

## 回复前记忆检索

每次用户发消息后，Bridge 不应该直接把消息丢给模型。

推荐流程：

```text
1. 识别当前消息类型。
2. 判断是否需要记忆检索。
3. 检索会话记忆。
4. 检索用户长期记忆。
5. 检索项目记忆。
6. 检索 Agent 运行记忆。
7. 组装成 Memory Context。
8. 再调用模型或 Agent。
```

### 什么时候必须检索

```text
个性化推荐
饮食 / 作息 / 健康照看
命名 / 偏好判断
项目开发任务
提醒 / 自动化任务
用户说“之前”“刚才”“你记得吗”
用户纠正模型“你应该知道”
```

### 什么时候可以不检索

```text
纯事实问答
简单寒暄
一次性命令
明确不依赖个人上下文的问题
```

## 记忆写入流程

记忆写入不能直接由聊天模型自由发挥。

建议拆成四步：

```text
1. Candidate Extractor：从对话中提取候选记忆。
2. Memory Classifier：判断属于哪一类记忆。
3. Memory Merger：和已有记忆去重、合并、修正。
4. Memory Writer：写入对应存储，并记录审计日志。
```

### 候选记忆格式

```json
{
  "id": "mem_...",
  "scope": "user | project | session | agent_runtime",
  "type": "preference | habit | rule | project_decision | task_state | correction",
  "content": "用户希望技术开发文档放在 docs-preview，不放代码仓库。",
  "source": {
    "channel": "weixin",
    "session_id": "weixin:dm:...",
    "message_id": "msg_...",
    "created_at": "2026-06-30T14:58:00+08:00"
  },
  "confidence": 0.92,
  "sensitivity": "low | medium | high",
  "ttl": null,
  "status": "candidate | active | rejected | archived"
}
```

## 写入策略

### 自动写入

可以自动写入的内容：

```text
明确偏好
明确纠正
稳定项目决策
工具执行状态
低敏感配置偏好
```

例如：

```text
以后读中文文件默认 UTF-8。
开发文档放 docs-preview。
DOC Preview 提交默认 commit + push。
```

### 需要确认

需要用户确认的内容：

```text
健康长期结论
身份信息
账号信息
财务偏好
重要生活习惯推断
可能误听的语音转写内容
```

例如：

```text
用户长期肠胃敏感。
用户每天晚上都会吃某类食物。
用户某个账号固定使用某个邮箱。
```

### 不写入

不应写入长期记忆：

```text
一次性情绪
短期吐槽
未确认猜测
明显语音识别错误
敏感凭证
完整 token
完整聊天原文
```

## 冲突处理

记忆会过期，也会被用户修正。

冲突处理优先级：

```text
1. 用户最新明确纠正
2. 项目内最新文档 / 代码事实
3. 高置信长期记忆
4. 会话上下文
5. 模型推断
```

示例：

```text
旧记忆：开发文档可放项目 docs。
新纠正：开发文档不要放项目里，要放 docs-preview。

结果：
旧记忆归档，新记忆 active。
```

## 检索策略

第一版可以先做规则检索，不急着上完整向量库。

推荐顺序：

```text
1. scope filter：按 user/project/session/agent_runtime 过滤。
2. keyword match：按关键词召回。
3. recency boost：近期纠正优先。
4. type boost：偏好、规则、项目决策优先。
5. top_k：限制注入模型的条数。
```

后续再加：

```text
embedding
hybrid search
rerank
memory graph
```

## Prompt 注入方式

不要把所有记忆都塞给模型。

建议注入结构：

```text
Relevant Memory:

User Preferences:
- ...

Project Context:
- ...

Recent Session:
- ...

Agent Runtime State:
- ...

Instruction:
Use these memories only when relevant. If a memory conflicts with the latest user message, prefer the latest user message.
```

## 模块设计

建议新增模块：

```text
src/memory/
  memory.module.ts
  memory.service.ts
  memory.types.ts
  memory-policy.service.ts
  memory-retrieval.service.ts
  memory-writer.service.ts
  memory-audit.service.ts
  extractors/
    memory-candidate.extractor.ts
  stores/
    memory.store.ts
    json-memory.store.ts
    markdown-memory.store.ts
  prompts/
    memory-extraction.prompt.ts
    memory-merge.prompt.ts
```

和 Pipeline 的关系：

```text
Pipeline
  -> MemoryRetrievalService.getContext()
  -> ModelRouter / AgentRuntime
  -> MemoryCandidateExtractor.extract()
  -> MemoryWriter.write()
```

## 数据文件建议

第一版可以先用本地文件：

```text
data/memory/
  user/
    lshbosheth.memory.json
    lshbosheth.memory.zh-CN.md
  projects/
    wx-agent-bridge.memory.json
  sessions/
    weixin-dm-xxx.summary.json
  runtime/
    agent-runtime-events.jsonl
```

后续迁移 SQLite：

```text
memory_entries
memory_events
memory_embeddings
conversation_summaries
agent_runtime_states
```

## API 设计

### 查询记忆

```text
GET /memory/search?q=docs-preview&scope=project
```

返回：

```json
{
  "items": [
    {
      "id": "mem_001",
      "scope": "project",
      "type": "project_decision",
      "content": "开发文档放 docs-preview，不放代码仓库。",
      "confidence": 0.98
    }
  ]
}
```

### 列出候选记忆

```text
GET /memory/candidates
```

### 接受候选记忆

```text
POST /memory/candidates/:id/accept
```

### 拒绝候选记忆

```text
POST /memory/candidates/:id/reject
```

### 删除记忆

```text
DELETE /memory/:id
```

## 微信命令

第一版可以支持：

```text
/memory search 关键词
/memory list
/memory forget 关键词
/memory pending
/memory accept id
/memory reject id
```

但日常聊天里不应该要求用户总是手动命令。

正常路径应该是：

```text
用户自然聊天
  -> 系统自动提取候选
  -> 低风险自动写入
  -> 高风险等用户确认
```

## 管理后台关系

Day 7 管理后台可以为记忆系统提供页面：

```text
Memory List
Memory Candidate Queue
Memory Detail
Memory Audit Log
Project Memory
Agent Runtime State
```

但 Day 8 不依赖完整后台。

第一版可以先通过 API 和本地文件验证。

## 安全边界

必须遵守：

```text
不保存完整 token。
不把敏感信息注入无关模型调用。
不把一次性私密信息自动长期保存。
不把语音识别可能错误的内容直接写死。
用户明确说“记一下”时，也要判断内容属于哪个 scope。
用户明确说“忘掉”时，要能删除或归档。
```

## 最小可行版本

MVP 只需要：

```text
1. MemoryEntry 类型。
2. JSONMemoryStore。
3. MemoryRetrievalService。
4. MemoryCandidateExtractor。
5. MemoryPolicyService。
6. 写入 user/project/session/runtime 四类 scope。
7. Pipeline 回复前读取相关记忆。
8. Pipeline 回复后提取候选记忆。
9. /memory/search 和 /memory/list。
```

MVP 不要求：

```text
向量检索
图谱
复杂后台
多用户权限
跨设备同步
```

## 验收标准

```text
1. 用户说“以后中文文件都用 UTF-8”，系统能生成 user preference 候选记忆。
2. 用户说“开发文档放 docs-preview”，系统能写入 project decision。
3. 用户问“中午吃啥”，系统能检索饮食偏好和当天肠胃状态。
4. 用户问项目问题，系统能检索 wx-agent-bridge 当前项目决策。
5. 用户纠正“炸鲤鱼其实是炸里脊”，系统只更新会话记忆，不写长期健康结论。
6. token、账号密钥、完整授权头不会写入记忆。
7. 用户可以列出、删除、拒绝候选记忆。
```

## 给 Codex 的分析提示词

下面这段可以直接发给 Codex，让它分析并细化实现方案。

---

你是一个资深 TypeScript / NestJS 架构工程师。

请基于 `wx-agent-bridge` 项目，分析并细化聊天记忆系统设计。

重点分析：

```text
1. 现有 Pipeline 应该在哪些节点接入 MemoryRetrieval 和 MemoryCandidateExtractor。
2. `user / project / session / agent_runtime` 四类记忆是否足够。
3. 第一版 JSON 文件存储如何设计，后续如何迁移 SQLite。
4. 哪些记忆可以自动写入，哪些必须用户确认。
5. 如何避免把语音识别错误、短期状态、敏感信息写入长期记忆。
6. 如何让 Codex / Qwen / 其他 Agent 共享项目记忆，但不互相污染运行状态。
7. 如何设计最小 API 和测试用例。
```

请输出：

```text
1. 建议模块结构。
2. 核心 TypeScript 类型。
3. Pipeline 接入点。
4. 存储格式。
5. 写入策略。
6. 检索策略。
7. MVP 开发步骤。
8. 风险和替代方案。
```

不要直接实现大规模代码。

先做架构评审和可执行拆分。
