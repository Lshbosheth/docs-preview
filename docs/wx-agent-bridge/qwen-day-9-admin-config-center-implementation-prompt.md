# Qwen 实施提示词：Day 9 管理后台配置中心

请基于已有 `wx-agent-bridge` 项目继续开发 Day 9：管理后台配置中心。

## 先读文档

请先阅读：

```text
docs/wx-agent-bridge/day-9-admin-config-center-plan.md
docs/wx-agent-bridge/day-7-admin-console-plan.md
docs/wx-agent-bridge/day-8-chat-memory-system-design.md
```

当前项目已经有：

```text
NestJS 后端
React + Ant Design 管理后台
iLink 微信绑定和长轮询
模型分流配置 default/chat/decision/execution
基础 Admin 状态页
```

现在要做的是：把可配置项逐步放进后台，尤其是提示词和模型分流。

## 总目标

实现一个严格的配置中心：

```text
能查看配置
能编辑配置
能保存版本
能查看审计
能回滚
敏感字段不泄露
```

不要做一个直接编辑 `config.yaml` 的大文本框。

## 本次 MVP 范围

优先实现：

```text
1. 提示词配置文件化
2. 后台提示词列表
3. 提示词详情编辑
4. 提示词版本历史
5. 提示词回滚
6. 配置审计日志
7. 模型分流只读展示
```

模型分流编辑可以放下一小步，不要一次做太大。

## 后端任务

### 1. 新增 ConfigCenterModule

新增：

```text
src/config-center/config-center.module.ts
src/config-center/config-center.controller.ts
src/config-center/prompt-config.service.ts
src/config-center/config-audit.service.ts
src/config-center/config-center.types.ts
```

注册到 `AppModule`。

### 2. 提示词文件化

当前提示词可能硬编码在：

```text
src/chat/chat.service.ts
src/planner/planner.prompt.ts
src/executor/executor.prompt.ts
```

请改成从 `PromptConfigService` 读取。

默认提示词文件：

```text
data/config/prompts/chat.system.md
data/config/prompts/planner.system.md
data/config/prompts/executor.system.md
```

如果文件不存在，首次启动时用当前代码里的默认提示词写入文件。

### 3. PromptConfigService

实现能力：

```ts
listPrompts()
getPrompt(key: string)
updatePrompt(key: string, content: string, reason: string)
rollbackPrompt(key: string, toVersion: number, reason: string)
```

提示词 key：

```text
chat.system
planner.system
executor.system
```

每次更新：

```text
保存当前版本到 prompt-history
写入新内容
version + 1
记录 audit
```

### 4. ConfigAuditService

写入：

```text
data/config/config-audit.jsonl
```

审计结构：

```ts
export type ConfigAuditEvent = {
  id: string;
  target: string;
  action: 'create' | 'update' | 'rollback';
  reason: string;
  beforeHash?: string;
  afterHash?: string;
  createdAt: string;
  createdBy: string;
};
```

注意：

- 不要写入完整 token。
- 不要写入完整 api_key。
- 提示词审计只记录 hash，不需要把全文写入 audit。

### 5. API

实现：

```text
GET /admin/prompts
GET /admin/prompts/:key
PUT /admin/prompts/:key
POST /admin/prompts/:key/rollback
GET /admin/config/audit
GET /admin/config/models
```

`PUT /admin/prompts/:key` 请求：

```json
{
  "content": "...",
  "reason": "减少自我介绍"
}
```

规则：

- content 不能为空。
- reason 不能为空。
- key 必须在允许列表内。
- 保存后立即生效。

### 6. 模型分流只读 API

```text
GET /admin/config/models
```

返回：

```json
{
  "default": {},
  "chat": {
    "provider": "qwen",
    "model": "qwen3.7-max",
    "inheritsDefault": true
  },
  "decision": {},
  "execution": {}
}
```

先不做编辑。

## 前端任务

### 1. 增加菜单

管理后台新增：

```text
配置中心
  - 模型分流
  - 提示词
  - 配置审计
```

### 2. Prompts 页面

路径：

```text
/config/prompts
```

展示：

```text
key
title
version
updatedAt
updatedBy
```

点击进入详情。

### 3. Prompt Detail 页面

路径：

```text
/config/prompts/:key
```

功能：

```text
textarea 编辑提示词
保存前必须填写 reason
显示当前版本
显示历史版本
支持回滚
保存成功后提示
```

第一版不用 Monaco。

### 4. Models 页面

路径：

```text
/config/models
```

只读展示：

```text
default
chat
decision
execution
inheritsDefault
temperature
max_tokens
enable_thinking
```

### 5. Audit 页面

路径：

```text
/config/audit
```

表格展示：

```text
createdAt
target
action
reason
beforeHash
afterHash
createdBy
```

## 验收标准

1. 后端 `npm run build` 通过。
2. 后端测试通过。
3. 前端 `npm run build` 通过。
4. `/admin/prompts` 能列出三个提示词。
5. `/admin/prompts/chat.system` 能查看当前聊天提示词。
6. 后台能编辑聊天提示词并保存新版本。
7. 保存提示词必须填写 reason。
8. 保存后新提示词立即影响聊天回复。
9. 可以查看配置审计记录。
10. 可以回滚提示词。
11. `api_key/token` 不明文出现在任何配置 API 返回里。

## 注意事项

- 不要再把聊天提示词写死在 `ChatService`。
- 不要把 planner/executor 提示词编辑和执行逻辑耦合太死。
- 不要直接暴露完整 `config.yaml`。
- 所有新增文件使用 UTF-8。
- 不要破坏当前 iLink 登录和消息收发。

