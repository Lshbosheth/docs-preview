# MVP Scope

## MVP 保留

```text
微信 / iLink 接入
消息归一化
短期会话上下文
长期用户记忆
项目记忆
记忆候选提取
记忆检索注入
说人话回复
Agent Handoff Request
Context Disclosure Policy
Handoff Audit
后台查看 Conversations / Memory / Handoff / Config / Audit
```

## MVP 砍掉

```text
完整 Agent Runtime
模型自动 tool calling
write_file
apply_patch
run_command
git_commit
git_push
微信高风险工具确认流
复杂 RBAC
向量数据库
多 Agent 自动调度
```

## MVP 可以保留但降级

```text
read_file
search_files
git_status
git_diff
tool audit
permission rules
```

这些只作为内部诊断和历史兼容能力，不作为产品主线继续扩展。

## Admin Web 优先级

主导航建议调整为：

```text
1. Conversations
2. Memory
3. Handoff
4. Config
5. Audit
```

降级到开发诊断区：

```text
Agent Tools
Tool Audit
Permission Rules
```

## 第一版用户体验

```text
用户：帮我让 Codex 接着昨天那个微信 bridge 的方向改。

Bridge：
我理解是要把 wx-agent-bridge 从“工具执行桥”改成“个人上下文层”。
我会带上最近讨论、项目边界和文档位置，生成一个 Codex handoff。
这次不会让 Bridge 自己执行命令或改文件。
要现在交给 Codex 吗？
```

这就是 MVP 的核心闭环。
