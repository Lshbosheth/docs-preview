# wx-agent-bridge 实施路线图

> 本页保留为兼容入口。实施主线已经拆到独立目录：[进入自研微信链路交付路线图](/wx-agent-bridge/delivery-roadmap/)。

## 两层路线图

- [Personal Context Layer 路线图](/personal-context-layer/implementation-roadmap)定义产品方向和能力演进。
- [自研微信链路交付路线图](/wx-agent-bridge/delivery-roadmap/)定义阶段依赖、工作包、验收、风险、切换和回滚。

两者共同遵守：

```text
Context first, Runtime later if necessary.
```

Bridge 近期主线是微信入口、会话上下文、记忆、意图识别、人话回复和 Agent Handoff，不再扩张成完整命令行 Runtime。

## 分期入口

| 阶段 | 主题 |
| --- | --- |
| [Phase 0](/wx-agent-bridge/delivery-roadmap/phase-0-foundation) | 方向收敛、契约、状态机和测试地基 |
| [Phase 1](/wx-agent-bridge/delivery-roadmap/phase-1-weixin-conversation) | 微信入口、可靠会话和 10 月前迁移门禁 |
| [Phase 2](/wx-agent-bridge/delivery-roadmap/phase-2-memory-mvp) | Memory MVP |
| [Phase 3](/wx-agent-bridge/delivery-roadmap/phase-3-humanized-response) | 符合人设且状态真实的人话回复 |
| [Phase 4](/wx-agent-bridge/delivery-roadmap/phase-4-handoff-draft) | Handoff 草稿和人工闭环 |
| [Phase 5](/wx-agent-bridge/delivery-roadmap/phase-5-context-disclosure) | 上下文披露、脱敏、确认和审计 |
| [Phase 6](/wx-agent-bridge/delivery-roadmap/phase-6-admin-web) | Admin Web 重排 |
| [Phase 7](/wx-agent-bridge/delivery-roadmap/phase-7-external-agent-adapter) | 外部 Agent 适配和自动闭环 |

## 切换硬约束

当前 `微信 -> cc-connect -> Codex` 链路已经完成的优化，在自研链路切换时不得回退。验收、风险和操作顺序分别见：

- [现有链路兼容基线](/wx-agent-bridge/cc-connect-compatibility-baseline)
- [主线风险台账](/wx-agent-bridge/delivery-roadmap/risk-register)
- [切换与回滚手册](/wx-agent-bridge/delivery-roadmap/cutover-playbook)

## 历史能力处理

完整 Tool Router、完整 Agent Runtime、`write_file`、`apply_patch`、`run_command` 和 Git 操作不再作为近期主线。旧 `Day N`、Runtime 和工具权限文档保留作历史参考，不作为排期和验收依据。
