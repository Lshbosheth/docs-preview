# Day 8 Agent 工具权限设计

## 背景

模型本身不能直接读文件、写文件、执行命令。

模型能做的是：

```text
理解输入
推理下一步
生成回复
生成工具调用请求
```

真正让模型能“操作电脑”的，是模型外面的 Agent Runtime。

也就是说：

```text
模型不是手。
Agent Runtime 才是手。
工具权限决定这只手能碰什么。
```

`wx-agent-bridge` 如果要支持用户在微信里让 Agent 读项目、改文件、跑命令、提交代码，就必须设计一套明确的工具权限系统。

## 结论

要让模型具备本地操作能力，至少需要：

```text
1. 支持工具调用的模型
2. Agent Runtime
3. 工具注册表
4. Tool Router
5. Tool Executor
6. 权限系统
7. 工作区边界
8. 用户确认机制
9. 审计日志
```

模型是否多模态不是核心要求。

如果只是：

```text
读文件
写文件
搜索代码
执行命令
Git 操作
NPM 构建
更新 Markdown
分析日志文本
```

文本模型 + 工具调用能力就够了。

如果要处理：

```text
看截图
理解图片
识别二维码
分析 UI 视觉效果
处理语音
读取视频帧
```

才需要多模态模型，或者需要外部 OCR / ASR / 图像分析工具辅助。

## 模型和 Agent 的分工

### 模型负责

```text
理解用户意图
拆解任务
决定是否需要工具
生成工具调用参数
阅读工具结果
继续推理
生成最终回复
```

### Agent Runtime 负责

```text
维护会话状态
维护项目上下文
暴露可用工具
执行工具调用
管理权限
处理超时
记录审计日志
把工具结果返回给模型
```

### 工具负责

```text
读文件
写文件
执行 Shell
搜索代码
应用 patch
Git 提交
浏览网页
发送微信消息
调用数据库
```

## 总体架构

```text
WeChat Message
  -> wx-agent-bridge
  -> Session Manager
  -> Memory Retrieval
  -> Agent Runtime
  -> Model Provider
  -> Tool Router
  -> Permission Resolver
  -> Tool Executor
  -> Audit Log
  -> Response Builder
  -> WeChat Reply
```

边界原则：

```text
微信只负责入口。
模型只负责决策。
Tool Executor 才真正执行本地操作。
Permission Resolver 决定这次能不能执行。
Audit Log 记录执行过什么。
```

## 模型能力要求

### 必须具备

```text
稳定的指令遵循能力
结构化输出能力
函数调用 / tool calling 能力
长上下文阅读能力
错误恢复能力
```

如果模型没有原生 tool calling，也可以用 JSON 输出模拟：

```json
{
  "tool": "read_file",
  "args": {
    "path": "docs/wx-agent-bridge/index.md"
  }
}
```

但 Agent Runtime 必须做严格校验。

### 不一定必须

```text
多模态
联网搜索
超长上下文
代码专用模型
```

这些是加分项，不是能不能操作电脑的前提。

## 多模态什么时候需要

### 不需要多模态

```text
读 README
改 TypeScript
更新 Markdown
跑 npm test
git commit
分析日志文本
整理设计文档
```

这些任务只需要文本模型能调用工具。

### 需要多模态或视觉工具

```text
看浏览器截图判断 UI 是否错位
分析用户发来的图片
识别二维码
看设计稿
比较两张图片
分析图表截图
```

这里有两条路线：

```text
1. 使用多模态模型直接看图。
2. 使用 OCR / 图像识别 / 截图检测工具，把视觉结果转成文本。
```

## 工具注册表

工具必须注册后才能被模型调用。

示例：

```json
{
  "name": "read_file",
  "description": "Read a UTF-8 text file within the workspace.",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string" }
    },
    "required": ["path"]
  },
  "permission": {
    "scope": "workspace",
    "risk": "low",
    "requires_approval": false
  }
}
```

推荐工具分类：

```text
read-only tools
write tools
shell tools
network tools
git tools
browser tools
wechat tools
admin tools
```

## 权限模型

权限按风险分层。

### 低风险

```text
读工作区文件
搜索代码
查看 git status
查看 package.json
读取日志
```

通常可以自动执行。

### 中风险

```text
写文件
应用 patch
格式化代码
启动 dev server
安装 npm 包
```

可以在受信任项目里自动执行，但必须记录审计日志。

### 高风险

```text
删除文件
递归移动目录
执行未知脚本
访问用户家目录
访问密钥文件
git push
发送微信消息
调用外部付费 API
```

默认需要用户确认。

## 工作区边界

第一版必须有 workspace root。

示例：

```text
D:\lshbosheth\cc-connect-weixin-codex\workspace
```

默认规则：

```text
读写只允许在 workspace 内。
跨 workspace 访问必须显式授权。
禁止默认读取 SSH key、浏览器 cookie、系统凭证。
删除和移动操作必须做路径校验。
```

## 用户确认机制

微信里不适合每个小工具都确认。

建议按风险确认：

```text
低风险：自动执行
中风险：项目内可自动执行
高风险：发微信确认
```

确认消息示例：

```text
这一步会执行 git push origin main，把 docs-preview 的改动推到远端。
确认执行吗？
```

用户可回复：

```text
确认
取消
只允许这一次
以后这个项目默认允许
```

## 审计日志

每次工具调用都要记录：

```json
{
  "event_id": "tool_...",
  "session_id": "weixin:dm:...",
  "project_id": "docs-preview",
  "tool": "shell",
  "args_summary": "npm run docs:build",
  "risk": "medium",
  "approved_by": "auto",
  "started_at": "2026-06-30T15:43:45+08:00",
  "ended_at": "2026-06-30T15:44:12+08:00",
  "status": "success"
}
```

不能记录：

```text
完整 token
完整 Authorization header
密钥文件内容
敏感环境变量值
```

## 和记忆系统的关系

记忆系统负责：

```text
用户偏好
项目决策
Agent 运行状态摘要
长期规则
```

工具权限系统负责：

```text
这次能不能读
这次能不能写
这次能不能 push
这次需不需要确认
```

示例：

```text
记忆：用户说 DOC Preview 提交默认 commit + push。
权限：git push 仍然属于高风险操作，但可以在 docs-preview 项目内降低确认频率。
```

记忆可以影响策略，但不能绕过安全边界。

## 建议模块

```text
src/agent/
  agent-runtime.service.ts
  agent-session.service.ts
  agent.types.ts

src/tools/
  tool.module.ts
  tool-registry.service.ts
  tool-router.service.ts
  tool-executor.service.ts
  tool.types.ts
  tools/
    file-read.tool.ts
    file-patch.tool.ts
    shell.tool.ts
    git.tool.ts
    browser.tool.ts
    wechat-send.tool.ts

src/permissions/
  permission.module.ts
  permission-policy.service.ts
  approval.service.ts
  workspace-scope.service.ts
  risk-classifier.service.ts

src/audit/
  audit.module.ts
  audit-log.service.ts
  audit.types.ts
```

## Tool Calling 流程

```text
1. 用户发微信任务。
2. Agent Runtime 读取会话、记忆和项目上下文。
3. 模型决定调用工具。
4. Tool Router 校验工具名和参数 schema。
5. Permission Resolver 评估风险。
6. 如需确认，Bridge 发微信确认。
7. Tool Executor 执行工具。
8. Audit Log 记录结果。
9. 工具结果返回模型。
10. 模型继续下一步或生成最终回复。
```

## MVP 工具列表

```text
read_file
search_files
apply_patch
run_command
git_status
git_diff
git_commit
git_push
```

权限策略：

```text
read_file/search_files：自动
apply_patch：workspace 内自动
run_command：白名单命令自动，其他确认
git_commit：确认或项目白名单
git_push：默认确认，可按项目记忆降低确认频率
```

## 风险和处理

### 模型幻觉工具参数

```text
严格 schema 校验
路径规范化
失败后让模型重试
禁止字符串拼接危险命令
```

### 权限过大

```text
默认 workspace sandbox
高风险确认
敏感路径黑名单
审计日志
```

### 微信误触发危险操作

```text
高风险二次确认
命令摘要
执行前说明影响
支持取消
```

### 多 Agent 状态污染

```text
project memory 共享
agent runtime state 隔离
tool audit 独立记录
```

## 给 Codex 的分析提示词

下面这段可以直接发给 Codex，让它分析 `wx-agent-bridge` 如何接工具权限。

---

你是一个资深 Agent Runtime / TypeScript / NestJS 架构工程师。

请基于 `wx-agent-bridge`，分析如何让模型通过 Agent Runtime 安全地读写文件、执行命令、提交代码和推送远端。

重点分析：

```text
1. 模型、Agent Runtime、Tool Router、Tool Executor 的边界。
2. 工具注册表和 schema 应该如何设计。
3. 权限系统如何按 workspace、project、risk 分层。
4. 哪些工具可以自动执行，哪些必须用户确认。
5. 微信确认流程应该如何设计。
6. 审计日志如何记录，如何避免泄露 token。
7. 如何和记忆系统配合，但不让记忆绕过权限。
8. 文本模型和多模态模型在这个系统里的区别。
```

请输出：

```text
1. 推荐模块结构。
2. 核心 TypeScript 类型。
3. Tool calling 流程。
4. 权限策略。
5. MVP 工具列表。
6. 测试用例。
7. 风险和替代方案。
```

不要直接实现完整代码。

先输出架构评审和可执行拆分。
