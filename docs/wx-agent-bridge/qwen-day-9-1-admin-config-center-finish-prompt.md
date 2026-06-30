# Qwen 实施提示词：Day 9.1 配置中心收尾

请基于已有 `wx-agent-bridge` 项目继续收尾 Day 9.1：提示词 / 配置中心。

## 先读文档

请先阅读：

```text
docs/wx-agent-bridge/day-9-admin-config-center-plan.md
docs/wx-agent-bridge/qwen-day-9-admin-config-center-implementation-prompt.md
docs/wx-agent-bridge/day-8-chat-memory-system-design.md
```

当前项目已经做了部分配置中心能力，但还需要收尾、修正边界和补齐体验。

## 目标

把配置中心整理成可长期使用的基础设施：

```text
提示词可查看
提示词可版本化
提示词可回滚
所有修改有 reason
所有修改有 audit
模型分流可只读展示
敏感字段不泄露
运行期依赖注入正确
```

注意：这一步不是做长期记忆。提示词是系统底座，长期记忆后续单独做。

## 必须检查和修复的问题

### 1. Nest 模块依赖

确认这些服务注入 `PromptConfigService` 后，所属 module 都正确 import `ConfigCenterModule`：

```text
ChatModule
PlannerModule
ExecutorModule
```

启动服务时不能再出现：

```text
Nest can't resolve dependencies of ChatService / PlannerService / ExecutorService
```

### 2. 提示词文件化

确认以下提示词已经从代码硬编码迁移为文件读取：

```text
chat.system
planner.system
executor.system
```

默认文件路径：

```text
data/config/prompts/chat-system.md
data/config/prompts/planner-system.md
data/config/prompts/executor-system.md
```

如果文件不存在，启动时自动写入默认内容。

### 3. 提示词版本历史

当前版本历史可以继续用 JSON 文件，但必须满足：

```text
每次 update 生成新版本
rollback 也生成新版本
history 返回倒序或明确排序
history 不要丢内容
audit 只存 hash，不存全文
```

### 4. API 错误码

无效 key、空 content、空 reason 不应该返回 500。

请使用：

```text
BadRequestException
NotFoundException
```

例如：

```text
GET /admin/prompts/invalid
```

应该返回 400。

### 5. 模型分流只读展示

接口：

```text
GET /admin/config/models
```

必须正确展示：

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

当前项目支持：

```yaml
models:
  default:
    provider: qwen
    model: qwen3.7-max
```

此时 `chat / decision / execution` 都应该显示 `inheritsDefault: true`。

### 6. 前端配置中心

后台必须包含：

```text
/config/prompts
/config/prompts/:key
/config/models
/config/audit
```

提示词详情页至少支持：

```text
查看内容
编辑内容
保存 reason
保存新版本
查看版本历史
回滚
显示错误和成功信息
```

如果现在回滚使用 `window.prompt()`，可以保留，但更推荐改成 Ant Design Modal + Input。

### 7. API client 格式一致

确认前端 rollback 请求和后端一致。

允许采用：

```json
{
  "version": 1,
  "reason": "恢复上一版"
}
```

不要前端发 `to_version`，后端收 `version`，造成不一致。

## 验收测试

### 构建

```bash
npm run build
npm test -- --runInBand --passWithNoTests
cd admin-web
npm run build
```

### 运行期接口

启动后端后测试：

```text
GET /health
GET /admin/prompts
GET /admin/prompts/chat.system
GET /admin/config/models
GET /admin/config/audit
```

### 热更新测试

1. 读取原始 `chat.system`。
2. 临时更新为：

```text
如果用户发送 ping，只回复 pong。
```

3. 调用 `/mock/message` 发送 `ping`。
4. 预期回复是 `pong`。
5. 再恢复原提示词。
6. 确认 audit 里有两条 update。

### 回滚测试

1. 获取 `chat.system` history。
2. 回滚到某个历史版本。
3. 确认生成一个新版本，而不是覆盖历史。

## 不要做

本阶段不要做：

```text
长期记忆管理
模型分流编辑
工具执行
Agent Runtime
数据库迁移
多用户权限
```

这一步只收尾配置中心基础能力。

