# Qwen 实施提示词：Day 11 长期记忆接入工具权限策略

请基于已有 `wx-agent-bridge` 项目继续开发 Day 11：长期记忆接入工具权限策略。

## 先读文档

请先阅读：

```text
docs/wx-agent-bridge/day-8-chat-memory-system-design.md
docs/wx-agent-bridge/day-8-agent-tool-permission-design.md
docs/wx-agent-bridge/qwen-day-10-agent-runtime-tool-permission-mvp-prompt.md
```

前提：Day 10 已经有只读工具系统、权限层和审计日志。

Day 11 的目标不是让记忆绕过权限，而是让记忆辅助权限决策。

## 核心原则

```text
记忆可以影响默认偏好。
记忆不能绕过硬安全边界。
高风险操作仍然需要确认。
所有权限决策必须审计。
```

示例：

```text
记忆：用户说 docs-preview 项目默认可以 commit。
策略：git_commit 可降低确认频率。
边界：git_push 仍然默认需要确认，除非有明确项目级授权规则。
```

## 本阶段目标

实现项目级权限偏好读取：

```text
project memory / permission preference
  -> PermissionPolicyService
  -> 决定 requiresApproval
  -> 写入 audit reason
```

先只支持配置和本地 JSON，不做向量检索。

## 新增数据结构

新增：

```text
data/memory/permissions/project-permissions.json
```

示例：

```json
{
  "projects": {
    "default": {
      "workspace": "D:/workspace/test-agent",
      "rules": [
        {
          "id": "perm_docs_readonly_auto",
          "tool": "read_file",
          "risk": "low",
          "decision": "auto",
          "reason": "只读工具默认允许",
          "createdAt": "2026-06-30T12:00:00.000Z"
        }
      ]
    }
  }
}
```

类型：

```ts
export type PermissionDecision = 'auto' | 'confirm' | 'deny';

export type ProjectPermissionRule = {
  id: string;
  tool: string;
  risk?: 'low' | 'medium' | 'high';
  decision: PermissionDecision;
  reason: string;
  createdAt: string;
  updatedAt?: string;
};
```

## 后端模块

可以放在现有 permissions 模块：

```text
src/permissions/
  project-permission-memory.service.ts
  permission-policy.service.ts
```

`ProjectPermissionMemoryService` 负责：

```ts
listRules(projectName: string)
addRule(projectName: string, rule)
updateRule(projectName: string, ruleId, patch)
deleteRule(projectName: string, ruleId)
findDecision(projectName: string, tool: string, risk: ToolRisk)
```

## 权限决策流程

`PermissionPolicyService` 应按顺序判断：

```text
1. 硬安全边界
   - workspace 外路径 deny
   - 敏感文件 deny
   - 未注册工具 deny

2. 工具基础风险
   - low 默认 auto
   - medium 默认 confirm
   - high 默认 confirm 或 deny

3. 项目权限记忆规则
   - 可把 medium 从 confirm 降为 auto
   - 可把某些工具固定 deny
   - 不能把 workspace 外访问改成 auto
   - 不能把敏感文件访问改成 auto

4. 输出最终 decision 和 reason
```

返回：

```ts
export type PermissionResult = {
  allowed: boolean;
  requiresApproval: boolean;
  decision: 'auto' | 'confirm' | 'deny';
  reason: string;
  matchedRuleId?: string;
};
```

## API

新增：

```text
GET /admin/permissions/project-rules
POST /admin/permissions/project-rules
PUT /admin/permissions/project-rules/:id
DELETE /admin/permissions/project-rules/:id
```

请求新增规则：

```json
{
  "projectName": "default",
  "tool": "git_status",
  "risk": "low",
  "decision": "auto",
  "reason": "只读 git 状态默认允许"
}
```

要求：

- reason 必填。
- 不允许添加违反硬安全边界的规则。
- 所有规则变更写 audit。

## 前端管理后台

新增页面：

```text
/permissions/project-rules
```

展示：

- projectName
- tool
- risk
- decision
- reason
- createdAt
- 操作：编辑 / 删除

支持新增规则。

## 和长期记忆的关系

本阶段不要从自然聊天自动生成权限规则。

只能通过后台显式添加规则。

后续可以做：

```text
用户在微信里说“以后 docs-preview 的 git status 不用问我”
  -> 生成候选权限记忆
  -> 后台或微信确认
  -> 写入 project permission rule
```

但这不是 Day 11 MVP。

## 审计

权限规则变更要写：

```text
data/audit/permission-audit.jsonl
```

工具调用审计要记录：

```text
matchedRuleId
permissionReason
decision
```

## 验收标准

1. `npm run build` 通过。
2. 后端测试通过。
3. 前端构建通过。
4. 后台可以新增项目权限规则。
5. 权限规则能影响工具调用的 `requiresApproval`。
6. 硬安全边界不能被规则覆盖。
7. 所有规则增删改有 audit。
8. 工具调用 audit 记录匹配到的规则。

## 不要做

本阶段不要做：

```text
自然语言自动生成权限规则
微信确认流程
高风险自动授权
绕过 workspace 检查
向量记忆检索
复杂 RBAC
```

这一步只让“项目级权限偏好”进入权限决策链。

