# Qwen 实施提示词：Day 10 Agent Runtime + 工具权限 MVP

> Deprecated: 这份提示词已经从当前主线移出。  
> `wx-agent-bridge` 新定位是 Personal Context Layer，不再继续优先自研完整 Agent Runtime / Tool Runtime。
>
> 新主线见：
>
> - `docs/personal-context-layer/index.md`
> - `docs/personal-context-layer/implementation-roadmap.md`
> - `docs/personal-context-layer/handoff-protocol.md`
> - `docs/personal-context-layer/handoff-permission-policy.md`
>
> 本文仅作为历史参考，不再作为下一阶段实施入口。

请基于已有 `wx-agent-bridge` 项目继续开发 Day 10：Agent Runtime + 工具权限 MVP。

## 先读文档

请先阅读：

```text
docs/wx-agent-bridge/day-8-agent-tool-permission-design.md
docs/wx-agent-bridge/day-9-admin-config-center-plan.md
docs/wx-agent-bridge/day-8-1-session-context-plan.md
```

当前系统可以通过微信聊天、规划和生成文本结果，但还不能真正读文件、搜索代码、执行工具。

Day 10 的目标是搭一个最小 Agent Runtime 和只读工具权限系统。

## 本阶段目标

只做只读工具 MVP：

```text
read_file
search_files
git_status
git_diff
```

先不要做：

```text
apply_patch
write_file
run_command
git_commit
git_push
delete_file
move_file
```

原因：先把工具注册、参数校验、workspace 边界、权限、审计跑通，再开放写操作。

## 架构目标

新增模块：

```text
src/agent/
  agent.module.ts
  agent-runtime.service.ts
  agent.types.ts

src/tools/
  tool.module.ts
  tool-registry.service.ts
  tool-router.service.ts
  tool.types.ts
  tools/
    read-file.tool.ts
    search-files.tool.ts
    git-status.tool.ts
    git-diff.tool.ts

src/permissions/
  permission.module.ts
  permission-policy.service.ts
  workspace-scope.service.ts
  permission.types.ts

src/audit/
  audit.module.ts
  tool-audit.service.ts
  audit.types.ts
```

如果项目已有 `src/admin/admin-event.service.ts`，不要混用。工具审计单独放 `src/audit`。

## 核心类型

### ToolDefinition

```ts
export type ToolRisk = 'low' | 'medium' | 'high';

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  risk: ToolRisk;
  readOnly: boolean;
};
```

### ToolCall

```ts
export type ToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};
```

### ToolResult

```ts
export type ToolResult = {
  callId: string;
  tool: string;
  ok: boolean;
  content?: string;
  error?: string;
};
```

## Workspace 边界

第一版只允许访问当前项目配置里的：

```text
project.work_dir
```

实现：

```text
WorkspaceScopeService.resolveInsideWorkspace(workDir, inputPath)
```

要求：

- path resolve 后必须仍在 `workDir` 内。
- 禁止读取 `.env`、token、credential、ssh key、浏览器 cookie 等敏感路径。
- Windows 路径必须正确处理。

## 工具实现

### read_file

输入：

```json
{
  "path": "README.md"
}
```

要求：

- 只能读 workspace 内文件。
- 只读 UTF-8 文本。
- 最大返回 20000 字符。
- 敏感文件拒绝。

### search_files

输入：

```json
{
  "query": "PipelineService",
  "glob": "src/**/*.ts"
}
```

要求：

- 优先用 Node 实现简单搜索，不要依赖 shell。
- 只搜索 workspace 内。
- 返回最多 50 条命中。

### git_status

输入：

```json
{}
```

要求：

- 只执行 `git status --short`。
- cwd 必须是 workspace。
- 这是只读工具。

### git_diff

输入：

```json
{
  "path": "src/pipeline/pipeline.service.ts"
}
```

要求：

- 执行只读 diff。
- path 可选。
- 如果提供 path，必须在 workspace 内。

## 权限策略

本阶段所有工具都是：

```text
risk: low
readOnly: true
requiresApproval: false
```

但仍然必须经过 PermissionPolicyService。

不要因为是只读就跳过权限层。

## 审计日志

每次工具调用写入：

```text
data/audit/tool-audit.jsonl
```

记录：

```ts
{
  id: string;
  sessionId?: string;
  projectName: string;
  tool: string;
  argsSummary: string;
  risk: 'low' | 'medium' | 'high';
  approvedBy: 'auto' | 'user' | 'denied';
  status: 'success' | 'error' | 'denied';
  startedAt: string;
  endedAt: string;
  error?: string;
}
```

不要记录完整 token、API key、Authorization header。

## Agent Runtime API

先提供内部测试 API，不直接接微信：

```text
POST /admin/agent/tool-call
GET /admin/agent/tools
GET /admin/agent/tool-audit?limit=100
```

`POST /admin/agent/tool-call` 请求：

```json
{
  "tool": "read_file",
  "args": {
    "path": "README.md"
  }
}
```

返回：

```json
{
  "ok": true,
  "tool": "read_file",
  "content": "..."
}
```

## 前端管理后台

新增页面：

```text
/agent/tools
/agent/audit
```

Tools 页面：

- 工具列表。
- 工具风险。
- 是否只读。
- 输入 JSON 参数。
- 执行测试。
- 展示结果。

Audit 页面：

- 工具调用审计表。

## 验收标准

1. `npm run build` 通过。
2. 后端测试通过。
3. `admin-web npm run build` 通过。
4. `/admin/agent/tools` 返回 4 个只读工具。
5. `read_file` 能读取 workspace 内 README。
6. `read_file` 不能读取 workspace 外文件。
7. `read_file` 不能读取 `.env`。
8. `search_files` 能搜索代码。
9. `git_status` 能返回 status。
10. 每次工具调用都有 audit。

## 不要做

本阶段不要做：

```text
让模型自动调用工具
写文件
执行任意 shell
git commit
git push
微信确认流程
长期记忆影响权限
```

这一步只打通工具系统的骨架和只读权限。
