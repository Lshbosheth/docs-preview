# Day 9 管理后台配置中心计划

## 目标

把系统里能配置的东西逐步放进管理后台，但不是随便给一个表单直接改。

配置中心要解决三个问题：

```text
1. 当前配置能看清楚。
2. 需要调整时能在页面修改。
3. 所有修改都有留痕、校验、版本、回滚和生效状态。
```

这里的配置包括但不限于：

- 模型分流配置。
- 提示词配置。
- 微信 / iLink 配置。
- Guard 和安全策略。
- 记忆系统策略。
- 管理后台显示项。
- 任务执行限制。

## 核心原则

### 1. 配置中心不是数据库后台

不要把整个 `config.yaml` 原样暴露成一个大文本框。

应该按业务域拆开：

```text
模型配置
提示词配置
微信配置
记忆配置
任务限制
安全策略
```

### 2. 能改，但要严格

所有配置修改必须经过：

```text
读取当前版本
编辑草稿
字段校验
预览 diff
保存新版本
记录审计日志
明确生效方式
```

不要允许页面静默改配置。

### 3. 敏感字段特殊处理

这些字段不能明文回显：

```text
api_key
token
secret
password
credential
authorization
```

后台只能显示：

```text
已配置 / 未配置
masked value
最后更新时间
```

修改时可以输入新值，但保存后不再返回明文。

### 4. 提示词可以配置，但必须版本化

提示词是系统行为的一部分，必须可查看、可编辑、可回滚。

不要把提示词硬编码死在 service 里。

第一版可以把提示词放到：

```text
data/config/prompts/
  chat.system.md
  planner.system.md
  executor.system.md
```

后续再迁移到 SQLite。

## 配置类型

### 1. 模型分流配置

当前已经支持：

```yaml
models:
  default:
    provider: qwen
    model: qwen3.7-max
```

含义：

```text
只配置 default 时，chat / decision / execution 都继承 default。
```

也支持分开配置：

```yaml
models:
  default:
    provider: qwen
    model: qwen3.7-max
  chat:
    provider: qwen
    model: qwen3.7-max
  decision:
    provider: qwen
    model: qwen3.7-max
  execution:
    provider: qwen
    model: qwen3.7-max
```

后台需要展示：

```text
默认模型
聊天模型
规划模型
执行模型
是否继承 default
temperature
max_tokens
enable_thinking
```

后台允许操作：

```text
修改 default
单独覆盖 chat
单独覆盖 decision
单独覆盖 execution
恢复继承 default
测试某一路模型
```

### 2. 提示词配置

第一版提示词分成：

```text
chat.system
planner.system
executor.system
memory.extractor
memory.merge
```

每个提示词需要有：

```json
{
  "key": "chat.system",
  "title": "聊天系统提示词",
  "content": "...",
  "version": 3,
  "updated_at": "2026-06-30T12:00:00+08:00",
  "updated_by": "local-admin",
  "enabled": true
}
```

后台页面能力：

```text
查看当前提示词
编辑草稿
预览 diff
保存新版本
查看历史版本
回滚到历史版本
用测试消息试跑当前草稿
```

提示词编辑必须有确认步骤。

不要保存空提示词。

### 3. 微信 / iLink 配置

可展示：

```text
base_url
cdn_base_url
mode
long_poll_timeout_ms
poll_interval_ms
send_text_endpoint
account_id
登录状态
```

敏感字段：

```text
token
credential_file 内部 token
```

只能显示：

```text
已配置
masked
最后更新
```

允许操作：

```text
重新扫码绑定
清除本地登录态
重启 polling
测试发送
```

### 4. Guard / 安全策略

可配置：

```text
allow_risk_levels
危险关键词
是否需要确认
任务最大步骤数
最大总 token
单轮超时时间
```

注意：

不要把 Guard 做成死限制。

Guard 是任务执行前的风控层，不应该影响普通聊天自由度。

### 5. 记忆系统策略

Day 8 后需要配置：

```text
是否启用会话记忆
最近消息条数
是否启用长期记忆候选
低风险是否自动写入
高风险是否需要确认
top_k
敏感信息过滤规则
```

第一版先只做展示和少量开关。

## 后端模块建议

新增：

```text
src/config-center/
  config-center.module.ts
  config-center.controller.ts
  config-center.service.ts
  config-version.service.ts
  config-audit.service.ts
  prompt-config.service.ts
  config-center.types.ts
  stores/
    file-config-version.store.ts
    file-prompt.store.ts
```

不要直接让前端写 `config.yaml`。

建议流程：

```text
前端提交 patch
  -> ConfigCenterService 校验
  -> 生成 ConfigChangeSet
  -> 写入版本记录
  -> 更新运行时配置或提示需要重启
```

## API 设计

### 配置总览

```text
GET /admin/config
```

返回：

```json
{
  "version": 12,
  "updated_at": "2026-06-30T12:00:00+08:00",
  "sections": {
    "models": {},
    "prompts": {},
    "ilink": {},
    "guard": {},
    "memory": {}
  }
}
```

敏感字段不返回明文。

### 模型分流配置

```text
GET /admin/config/models
PUT /admin/config/models
```

PUT 请求必须带：

```json
{
  "reason": "调整执行模型 max_tokens",
  "models": {}
}
```

没有 reason 不允许保存。

### 提示词列表

```text
GET /admin/prompts
```

### 提示词详情

```text
GET /admin/prompts/:key
```

返回当前版本和历史版本摘要。

### 保存提示词新版本

```text
PUT /admin/prompts/:key
```

请求：

```json
{
  "content": "...",
  "reason": "减少自我介绍",
  "test_message": "你是谁"
}
```

要求：

```text
content 不能为空
reason 不能为空
保存前做长度检查
保存前返回 diff 或由前端展示 diff
```

### 回滚提示词

```text
POST /admin/prompts/:key/rollback
```

请求：

```json
{
  "to_version": 2,
  "reason": "上一版回复更自然"
}
```

### 配置审计

```text
GET /admin/config/audit?limit=100
```

审计记录：

```json
{
  "id": "audit_...",
  "target": "prompt.chat.system",
  "action": "update",
  "reason": "减少自我介绍",
  "before_hash": "...",
  "after_hash": "...",
  "created_at": "...",
  "created_by": "local-admin"
}
```

不要把完整敏感值写进审计日志。

## 前端页面建议

新增后台页面：

```text
/config
/config/models
/config/prompts
/config/prompts/:key
/config/audit
```

### Config Overview

展示：

```text
当前配置版本
最后更新时间
需要重启的配置项
已启用的功能
敏感配置是否已设置
```

### Models

展示模型分流表：

```text
route        provider     model          inherit default
default      qwen         qwen3.7-max    -
chat         qwen         qwen3.7-max    yes
decision     qwen         qwen3.7-max    yes
execution    qwen         qwen3.7-max    yes
```

支持：

```text
编辑 default
覆盖单一路由
恢复继承
保存前 diff
保存 reason
```

### Prompts

提示词列表：

```text
key
title
version
updated_at
updated_by
enabled
```

详情页：

```text
Monaco Editor 或 textarea
版本历史
diff 预览
测试输入
测试输出
保存 reason
回滚
```

第一版不用 Monaco，普通 textarea 就够。

### Audit

展示所有配置修改记录。

支持按：

```text
target
action
created_at
```

筛选。

## 存储建议

第一版使用本地文件：

```text
data/config/
  active-config.json
  config-audit.jsonl
  prompts/
    chat.system.md
    planner.system.md
    executor.system.md
  prompt-history/
    chat.system/
      v1.md
      v2.md
      v3.md
```

注意：

```text
config.yaml 仍然可以作为启动默认配置。
后台修改后的配置写入 data/config/active-config.json。
AppConfigService 启动时优先加载 active-config.json，再 fallback 到 config.yaml。
```

这样既保留手写配置能力，又支持后台修改。

## 生效策略

配置分两类：

### 热更新

可以立即生效：

```text
提示词
模型路由
temperature
max_tokens
Guard 规则
记忆策略
```

### 需要重启或重连

需要提示用户：

```text
iLink base_url
credential_file
端口
底层 provider base_url
某些 SDK 配置
```

后台保存后返回：

```json
{
  "ok": true,
  "version": 13,
  "effect": "hot | restart_required | reconnect_required"
}
```

## 验收标准

1. 后台可以看到模型分流配置。
2. 只配置 default 时，chat / decision / execution 都显示继承 default。
3. 可以编辑提示词并保存新版本。
4. 保存提示词必须填写 reason。
5. 可以查看提示词历史版本。
6. 可以回滚提示词。
7. 所有配置修改都有 audit log。
8. token / api_key 不明文返回给前端。
9. 配置修改后可以通过测试消息验证效果。
10. `npm run build` 和测试通过。

## MVP 顺序

建议拆成：

```text
Day 9.1 Prompt Config：提示词文件化、后台查看、编辑、版本、回滚。
Day 9.2 Model Routing Config：模型分流后台编辑、继承 default、测试。
Day 9.3 Config Audit：统一审计、diff、敏感字段脱敏。
Day 9.4 Memory Config：记忆策略配置接入。
```

优先做提示词，因为现在系统回复风格变化最频繁。

