# 记忆系统阶段 0 实施规格

这份是《[记忆检索演进方案](./memory-retrieval-evolution-plan.md)》和《[缺口清单](./memory-retrieval-gap-list.md)》讨论后的定稿，目标是**完成步骤 0 后可以直接照着写代码**。前两篇分别负责"目标结构是什么"和"哪里会卡住"，这篇只负责"阶段 0 具体改什么、数据落在哪里、怎样验收和回滚"。

范围边界：阶段 0 不引入 embedding，不引入向量数据库。做完之后向量检索才有一张可靠、可评测、会更新的表可搜。

## 实施目标与代码落点

先把“改哪一份代码”定死，避免在临时副本里改出一套无法部署的实现。

- 现役 builder 以 `config.toml` 实际引用的 `workspace/scripts/memory-context-builder/build-context.mjs` 为准。
- **Go 改动的唯一落点是 `src/cc-connect/`（仓库根级，不在 `workspace/` 下）。** 0b 已于 2026-08-10 解除，详见下节。
- `tmp/cc-connect-src-v1.4.1/` 是这份源码的来源，现已成为过期副本，**禁止在其中做任何改动**；保留它只为在首个真实改动验证通过前留一份原始状态。`workspace/tmp/cc-connect-upstream/` 与本源码在 `appserver_session.go` 上存在差异，用途未核实，同样不是落点。
- 每次替换 `cc-connect.exe` 前保留上一版二进制；回归失败时恢复二进制和配置，不回滚已经安全落盘的记忆数据。

### 0b 已确认的源码与构建链

`src/cc-connect/` 由 `tmp/cc-connect-src-v1.4.1/` 完整复制而来（含 `.git`，不含 `node_modules`），已验证能编出现役 `bin/cc-connect.exe`。

| 项 | 值 |
| --- | --- |
| 正式目录 | `D:\lshbosheth\cc-connect-weixin-codex\src\cc-connect` |
| 分支 / 提交 | `local/context-auto-rotate` @ `5d5d32c`，父提交为上游 `5d4c96d` |
| remote | `https://github.com/chenhg5/cc-connect.git`（`origin`，仅作上游参照） |
| 本地改动 | context auto-rotate 特性，707 行插入 / 14 文件，已落提交 |
| Go 工具链 | `go1.26.3`（`go.mod` 声明 `1.25.0`，实际用 1.26.3 构建，与现役一致） |

导入时顺手处理掉两件事：原树处于 detached HEAD 且 13 个文件未提交，现已落到正式分支；`core/test_ws_*.json`（测试残留的空状态文件）已进 `.gitignore`。

构建命令（对齐现役二进制的构建方式）：

```bash
cd D:/lshbosheth/cc-connect-weixin-codex/src/cc-connect
go build -trimpath -ldflags "-s -w \
  -X main.version=v1.4.1-local-context-auto-rotate \
  -X main.commit=5d4c96d+local-context-auto-rotate \
  -X main.buildTime=$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  -o cc-connect-new.exe ./cmd/cc-connect
```

不要用 `make build`：它会先 `npm install` 并重建 web UI。`web/dist` 已在版本库里、由 `web/embed.go` 的 `//go:embed all:dist` 嵌入，所以纯 `go build` 就够，不需要 Node。

`-tags goolm` 是 Makefile 的默认值，但现役二进制并未带它，且它只影响 Matrix 的 olm 加密（当前用不到）。**为对齐现役，构建时不加 `goolm`**；加上会额外引入 `petermattis/goid` 依赖。

不追求字节级一致：`-s -w` 会剥符号，`-trimpath` 会去掉绝对路径，`buildTime` 每次不同。验收标准是"编译通过 + `--version` 三项一致"。已核实的差异说明：现役是 `vcs.modified=true` @ `5d4c96d`（脏树构建），新树是 `vcs.modified=false` @ `5d5d32c`（干净树构建），内容同源；缺 `-trimpath` 时二进制会大约 1.7MB。

二进制替换与回滚：

```text
替换前  copy bin\cc-connect.exe bin\cc-connect.exe.bak-<YYYYMMDD-HHMMSS>
替换    停服务 -> 覆盖 bin\cc-connect.exe -> 起服务
回滚    停服务 -> 用 .bak-<...> 覆盖回去 -> 起服务
```

回滚只动二进制和配置，`lshbosheth-memory/` 下已落盘的记忆数据不回滚。

阶段 0 的存储也不再保留“`events.jsonl` 或其他结构化存储”这种临场选择：

```text
lshbosheth-memory/
  open-loops/
    open-loops.jsonl          当前快照；每个 identity_key 只保留一条
    history.jsonl             追加式状态/内容变更记录；按月轮转
  reports/
    memory-write-YYYY-MM-DD.md

data/state/memory-extraction/
  pending/                    等待抽取或重试的 turn job，不进 Git
  processing/
  failed/

data/logs/memory-retrieval/
  YYYY-MM-DD.jsonl            脱敏 trace，不进 Git，默认保留 14 天
```

现有 `events/events.jsonl` 保持原 schema 和原用途，不把 open loop 混进去。这样不用同时迁移旧事件，也不会让当前只认识 `summary / time / entities` 的事件打分器读到半套新 schema。

## 已核实的代码事实

规格里的改动锚在下面这些已验证的现状上。canonical Go worktree 与构建链已于 2026-08-10 确认（见上节），因此这些基础事实全部有据，不需要再靠猜测。

下表中 `appserver_session.go` 的行号来自导入前的 `tmp/cc-connect-src-v1.4.1/`。正式落点 `src/cc-connect/` 的文件内容与之相同（同源复制，仅提交状态不同），但**开工前仍应按符号名重新定位一次行号**，不要盲信数字。

| 事实 | 位置 | 影响 |
| --- | --- | --- |
| injection payload 只组装三段：Resident Core、Events、Daily Summaries | `build-context.mjs:1192` `buildInjectionPayload` | 缺 open loop 数据块；recent conversation 默认不应重复注入 |
| `--recent` 参数已支持，但只流向 preview | `build-context.mjs:198` → `formatRecentMessages`（`:1029`）→ preview 的 Recent Conversation 段 | App Server 没传；它应服务 query rewrite，而不是无条件复制进模型上下文 |
| App Server 未传 `--recent` | `appserver_session.go:546` `memoryContextCommand`，只传 `--message / --session-key / --project-name / --output` | 检索器看不到指代对象 |
| preview 的 `## Open Loops` 是三条静态提示词 | `build-context.mjs:1298` | 命名误导，不是数据注入位；步骤 7 改名或删除 |
| 逐轮事件的真实名称是 `turn/completed` | `appserver_session.go:1243`，同区还有 `turn/started`、`item/completed` | 讨论中出现过的 `task_complete` 在源码里不存在，不要用 |
| `completeTurn()` → `flushPendingAsText()` 是最终 assistant 文本的唯一出口 | `completeTurn` 在 `:1628`，其中 `:1636` 调 `flushPendingAsText`（`:1653`） | 挂钩只挂 `completeTurn()` 一处即正确 |
| `pendingMsgs` 共四处清空，但只有一处属于最终文本 | `:540`（`Send()` 重置）、`:1226`（`turn/started` 重置）、`:1643`（`flushPendingAsThinking`）、`:1656`（`flushPendingAsText`） | `:1643` 吐的是 `EventThinking` 推理文本，**禁止**挂钩取作 `assistant_text` |
| 完成保护已存在且幂等 | `:1630` 判 `currentTurn == ""` 提前返回，`:1634` 先清空再执行 | `turn/completed` 与 `thread/status/changed: idle` 谁后到谁空转，无需额外去重层 |
| builder 失败策略由 `required bool` 控制 | `appserver_session.go:149`，分支在 `:599` 和 `:609` | 故障域拆分要在这里改 |
| 现有评测题库 10 条，仅 `question + expected_terms` | `scripts/memory-context-builder/zvec-eval-questions.jsonl`（仓库根，不在 workspace 下） | 扩展它，不要另起题库 |
| `build-context.mjs` 中文规则本体是正常 UTF-8 | — | 旧"乱码"来自 PowerShell 5 默认编码；仅保留为回归检查项，不是待修缺口 |

## 数据 schema

### open loop 当前快照

```json
{
  "id": "ol_01J9X8Q2M4N7P0",
  "identity_key": "lshbosheth|product-check|gpt-live-availability",
  "type": "open_loop",
  "scope": "episodic",
  "title": "确认 GPT Live 当前是否还能用",
  "aliases": ["GPT Live 失效检查", "看看 Live 还能不能用"],
  "status": "pending",
  "recall_eligibility": "active",
  "next_action": "打开 GPT Live 并确认能否正常发起会话",
  "created_at": "2026-08-06T23:30:00+08:00",
  "updated_at": "2026-08-07T23:20:00+08:00",
  "last_confirmed_at": "2026-08-07T23:20:00+08:00",
  "stale_after": "2026-08-14T23:20:00+08:00",
  "expires_at": null,
  "importance": 3,
  "topics": ["GPT Live", "产品可用性"],
  "supersedes": [],
  "superseded_by": null,
  "revision": 3,
  "evidence_refs": [
    {
      "kind": "conversation",
      "turn_id": "turn_01J9X7...",
      "time": "2026-08-07T23:20:00+08:00",
      "excerpt_hash": "hmac-sha256:..."
    }
  ],
  "extraction": {
    "confidence": 0.82,
    "model": "<from config>",
    "review_state": "auto_accepted"
  }
}
```

`id` 生成后不变，opaque，不含语义。`identity_key` 才是 upsert 的匹配键，格式 `<user>|<category>|<slug>`。主题改名、目标细化时改 `title` 和 `aliases`，不动 `id`；同一主题下出现两个不同任务时给两个 `identity_key`，不撞成一条。

不要用主题字符串直接当主键。

`open-loops.jsonl` 是可直接读取的当前快照，不承担审计历史。每次有效 upsert 还要向 `history.jsonl` 追加一条变更记录，至少包含：

```json
{
  "ts": "2026-08-07T23:20:00+08:00",
  "id": "ol_01J9X8Q2M4N7P0",
  "identity_key": "lshbosheth|product-check|gpt-live-availability",
  "revision_from": 2,
  "revision_to": 3,
  "changed_fields": ["status", "updated_at", "last_confirmed_at"],
  "evidence_ref": {"turn_id": "turn_01J9X7...", "excerpt_hash": "hmac-sha256:..."}
}
```

同一 `id` 原地更新和 `supersedes` 是两件事：前者靠 `revision + history` 留证；后者只表示一个事项正式取代另一个事项。

`history.jsonl` 是纯追加且进 Git，长期会无限增长。按月轮转：当月写 `history.jsonl`，跨月由夜间维护改名为 `history-YYYY-MM.jsonl` 并新建空文件。归档文件保留在 Git 里（它是审计证据，不能删），但单文件体积受控。轮转只在夜间维护窗口做，避开 writer 持锁时段。

### 两层状态

语义状态回答"这件事本身怎么样了"：

| `status` | 含义 |
| --- | --- |
| `pending` | 已记录，未开始 |
| `in_progress` | 已开始 |
| `blocked` | 想继续，被外部条件卡住 |
| `done` | 已完成 |
| `expired` | 有明确截止且已过、用户取消，或被新事项正式取代 |

召回资格回答"现在还该不该端上来"：

| `recall_eligibility` | 行为 |
| --- | --- |
| `active` | 参与主动注入 |
| `stale` | 降权，不主动注入，明确历史查询仍可命中 |
| `archived` | 移出候选集，仅可按来源回查 |

两层分开的理由：三十天没聊不等于用户取消。`status` 只能由显式信号或事实推进，`recall_eligibility` 由时间派生。

派生规则（首轮参数，随评测调整）：

```text
last_confirmed_at + 7d  未更新   -> stale
last_confirmed_at + 30d 未更新   -> archived
status = done                    -> 立即退出待办候选，历史查询仍可回查
status = expired                 -> archived
expires_at 已过                  -> status = expired
```

`blocked` 超时不默认主动提醒。是否提醒受提醒权限和场景控制，记忆系统不能偷偷变成催办系统。

### 冲突消解

`supersedes` / `superseded_by` 进 schema，配合 `scope` 判优先级：

- `scope: "episodic"`（一次性状态）：同一 `identity_key` 下按新版本覆盖旧版本。
- `scope: "durable"`（稳定偏好）：只有明确的偏好变更证据才允许改写。一顿饭、一次通勤、一句临时状态不构成证据。

## 改动一：写入链路

两段式。逐轮产候选，夜间对账。

### writer 与并发边界

所有 `open-loops.jsonl` 更新只能经过同一个 writer 模块，extraction worker 和夜间维护都不能自行拼 JSONL。

writer 固定执行：

1. schema 校验与字段白名单；
2. 按 `identity_key` 查当前快照；
3. 应用显式状态规则和 revision 检查；
4. 在同目录写临时快照，flush 后原子替换正式文件；
5. 成功替换后追加 `history.jsonl`；
6. 返回 `created / updated / no_op / rejected`。

Windows 上必须用自动化测试验证“进程中断不会留下半行 JSON”和“逐轮 writer 与夜间维护同时触发不会丢更新”。实现可用单 writer 队列或跨进程独占锁，但不能依赖“它们通常不会碰巧同时跑”。锁需包含持有者和创建时间，并能清理异常退出留下的 stale lock。

首次启用前只做旧数据健康检查，不把旧 `events.jsonl` 自动迁成 open loop：报告重复 `id`、坏 JSON 行和缺字段记录；人工确认后再单独清理。当前已存在的重复事件不能被新 writer 当成正常基线。

### 逐轮 extraction worker

不能直接在通知回调里拿零散字段开抽取。先在 App Server 会话里维护一个 `activeTurnSnapshot`：

```json
{
  "job_id": "<thread_id>:<turn_id>",
  "thread_id": "...",
  "turn_id": "...",
  "project": "lshbosheth",
  "session_key": "cc-connect-app-server",
  "user_text": "未包裹 retrieved_memory_context 的本轮用户原文",
  "recent_turns": [],
  "assistant_text": "最终对用户可见的 assistant 文本",
  "started_at": "2026-08-10T10:44:46+08:00",
  "completed_at": "2026-08-10T10:45:12+08:00"
}
```

`Send()` 在调用 memory builder 之前保存干净的 `user_text`；`turn/start` 返回后补 `turn_id`；`completeTurn()` 取到最终 assistant 文本后组装 job。`turn/completed` 和 `thread/status/changed: idle` 都可能抵达，但只能统一经过 `completeTurn()` 的现有完成保护，按 `job_id` 最多入队一次。

挂钩位置已核实，只挂 `completeTurn()`（`:1628`）一处即完整覆盖，不需要下沉到统一排干函数：

- `completeTurn()` 在 `:1636` 调用 `flushPendingAsText()`，后者是最终 assistant 文本的唯一出口。
- `pendingMsgs` 另外三处清空都不是最终文本：`:540` 是 `Send()` 重置，`:1226` 是 `turn/started` 重置，`:1643` 在 `flushPendingAsThinking()` 里、吐的是 `EventThinking` 推理正文。**把 `:1643` 也挂上会把推理文本误当 `assistant_text`**，比漏挂更糟。
- 幂等由现有完成保护提供：`:1630` 判 `currentTurn == ""` 提前返回，`:1634` 先清空 `currentTurn` 再往下走，两个完成通知谁后到谁空转。

实现约束（这条决定代码怎么写）：`flushPendingAsText()` 在同一个 `stateMu` 锁段内取走并清空 `pendingMsgs`（`:1655`–`:1656`），出锁后正文只存在于它的局部切片里。因此复制**不能**靠在外层包装 `completeTurn()` 实现——包装函数拿不到任何东西。只有两种合法写法：在 `flushPendingAsText()` 内部取副本，或让 `completeTurn()` 在调用它之前自己先持锁复制一份。

`turn_id` 兜底：`job_id` 正常形如 `<thread_id>:<turn_id>`，但 `turn_id` 要等 `turn/start` 返回才有，轮次在那之前失败时拼不全。缺 `turn_id` 时降级为 `<thread_id>:pre-turn:<started_at 单调序号>`，保证 `job_id` 始终非空且同轮稳定——它同时是入队去重键，拼不全会连带削弱"重启后不重复 upsert"的验收项。这类 job 允许 `turn_id` 为 null 落盘，夜间对账按 `thread_id` 归位。

job 先原子写入 `data/state/memory-extraction/pending/`，写成功即算入队；随后后台 worker 异步执行，用户回复不等它。不能只起一个无持久化 goroutine，否则进程重启会把待抽内容吞掉。

准入闸门必须在调模型之前：

```text
收到 turn/completed
  -> 准入判断（纯本地，无模型调用）
       本轮用户消息字符数 < 阈值 且 无实体、无决策词、无时间锚点  -> 跳过
       命中日常查岗词表（喝水/吃饭/哈啊/ok/摸鱼 等）              -> 跳过
       本轮仅工具输出、无用户新信息                              -> 跳过
  -> 通过则入抽取队列
```

没这道闸门，"哈啊""ok"这种也照抽一遍，纯烧调用。闸门只做粗筛，宁可放过也别漏抽。

抽取配置不写死在 schema 里，走 `extractor.command / model / timeout`。使用独立后台会话，不污染主聊天 thread。

模型只产候选，本地 writer 负责 schema 校验、权限边界、幂等和落盘。抽取失败保留 job 并记录 `attempts / last_error / next_retry_at`；指数退避重试，默认最多 5 次，之后移入 `failed/` 等夜间维护重放。job 成功消化后删除正文，只在 write report 中保留 job id 和结果，避免另存一份长期聊天记录。

### 候选消化

模型语义含糊时只产候选，不擅自判 `done`。但候选必须有出口，否则一个月后跟 `pending` 僵尸问题一模一样，只是换了张表。

定死消化规则，区间不能重叠：

```text
[0.85, 1.00] 且存在明确行动/状态证据 -> writer 合入，review_state = auto_accepted
[0.60, 0.85)                         -> 只保留候选 7 天，不进入 active open loop
[0.00, 0.60)                         -> 直接拒绝，记计数与原因，不保留正文
```

中等置信候选若在 7 天内被后续显式证据印证，可自动晋升；否则超期丢弃。对已有事项的 `done / expired / superseded` 更新，不论模型置信度多高，都必须带明确证据类型，禁止仅凭语气猜测推进状态。

不引入"每天问用户一次确认"。日常入口是微信，主动发确认消息的打扰成本高于收益。

### 夜间对账

复用 `daily-memory-maintenance.mjs`，新增：

1. 重放白天失败的抽取任务。
2. 按 `identity_key` 合并重复项。
3. 消化候选（上面的置信度规则）。
4. 推进 `recall_eligibility`，处理 `expires_at`。
5. `failed/` 报数与裁剪：报告当前积压条数，删除超过 14 天的 job；单日入 `failed/` 超过 20 条时在报告里显式告警（通常意味着抽取配置或模型通道坏了，不是个别 job 的问题）。
6. `history.jsonl` 跨月轮转为 `history-YYYY-MM.jsonl`。
7. 删除 `data/logs/memory-retrieval/` 下超过 14 天的 trace 文件。
8. 输出当日写入报告，进 git。

## 改动二：查询预处理

### 先拆输入边界，再传最近对话

现役链路的 `prompt` 可能已经包含 `[cc-connect message_time=...]` 和 `<recent_session_handoff>`。当前 builder 把整段 prompt 当 `--message`，真实 preview 已出现过以下现象：handoff 的标签、时间戳、历史问答和英文说明全部进入 keywords，而 `Recent Conversation` 仍为空。

因此不能在原 prompt 上简单追加 `--recent`。App Server 先做 `splitConversationEnvelope(prompt)`，得到：

```json
{
  "current_text": "memory-phase0-spec 他生成了这个 你看看",
  "message_time": "2026-08-10T10:44:46+08:00",
  "handoff_turns": [
    {"role": "user", "text": "他提了疑问你给他解释下呗"},
    {"role": "assistant", "text": "解释写进……"}
  ]
}
```

解析失败时保留原 prompt 作为 `current_text` 并记一次降级，不能把消息吃掉。

会话内再维护最近 2～4 轮 `user / assistant` 纯文本环形缓冲；首轮优先由 handoff 初始化，后续由本地 turn snapshot 更新。工具输出、推理正文、memory injection 和 XML 包裹不进入缓冲。

然后改 `memoryContextCommand`（`appserver_session.go:546`），只把 `current_text` 作为 `--message`，把环形缓冲作为重复 `--recent`：

```go
args = append(args,
    "--message", currentText,
    "--session-key", cfg.sessionKey,
    "--project-name", cfg.projectName,
)
for _, turn := range recentTurns {
    args = append(args, "--recent", turn.Role+":"+turn.Text)
}
```

builder 的 intent、keywords、raw query 和时间解析只基于 `current_text`；`recentTurns` 只给 query rewrite / 指代消解使用，不能混进关键词集合一起打分。

### recent conversation 默认不重复注入

持久 App Server thread 本来就拥有会话历史；轮换后的 handoff 也已经随当前 prompt 交给模型。阶段 0 不把 `--recent` 再复制进 memory injection，否则同一段对话会出现两遍并额外消耗 token。

`--recent` 的职责是帮助检索器理解“它 / 那个 / 继续”，不是替模型补聊天历史。只有未来出现“检索器拿得到 handoff、模型却拿不到”的新通道，才通过显式配置 `inject_recent_conversation: true` 条件注入，默认值必须是 false。

### 条件式改写

只对低信息 query 做改写，不无条件改写：

```text
触发条件：含指代词（那个/它/这事）、或含相对时间（昨天/上周/之前）、或字符数低于阈值且无实体
```

检索输入是一个结构，不是一段被覆盖的文本：

```json
{
  "raw_query": "它修好了没",
  "rewritten_query": "GPT Live 的可用性检查完成了吗",
  "resolved_entities": ["GPT Live"],
  "time_window": null,
  "rewrite_confidence": 0.78
}
```

原话必须保留。低置信度时扩大候选或回查来源，不把错误改写当事实。

rewrite 输出还要标记证据来自哪一轮，例如 `resolved_from_turn_index: -1`。若当前 query 无实体且最近对话里存在两个同等可能的对象，禁止强行选一个；保留 raw query、扩大候选，并让回答层在确实影响结论时询问用户。

相对时间解析成绝对窗，供元数据过滤：

```text
昨天     -> [2026-08-09T00:00, 2026-08-09T23:59] +08:00
上周     -> [2026-08-03, 2026-08-09]
之前那个 -> 不做时间过滤，转为按 open loop 状态优先
```

## 改动三：open loop 检索与注入

在 builder 新增独立的 `readOpenLoops / scoreOpenLoop / formatInjectionOpenLoops`，读取 `open-loops/open-loops.jsonl`。不要复用当前 `scoreEvent()` 硬吃新 schema：open loop 的检索文本由 `title + aliases + next_action + topics` 组成，时间衰减使用 `updated_at / last_confirmed_at`，状态分单独计算。

**三个函数已于 2026-08-10 落地（步骤 2，commit `d3db14b`）**：`readOpenLoops`（`build-context.mjs:632`）、`scoreOpenLoop`（`:948`）、`formatInjectionOpenLoops`（`:1142`）。实现细节见下方进度记录；本节剩余的注入块接线属于步骤 7。

`buildInjectionPayload` 新增独立的 open loop 块，附带状态过滤：

```text
候选 = open loop where recall_eligibility = active
       and status in (pending, in_progress, blocked)
       and 与当前 query 相关
```

preview 里那个 `## Open Loops` 静态提示段要么改名成 `## Memory Usage Rules`，要么删掉。名字腾给真正的数据块，避免继续误导。

open loop 文件不存在时视为空集合；文件存在但包含坏 JSON、重复 `identity_key` 或 schema 错误时视为基础检索故障，按 required 暴露，不能静默跳过。

## 改动四：注入预算

保底下限 + 段内上限 + 二次借用：

```text
1. 当前查询相关且存在 active open loop 时，先保留至少 1 条
2. 各段在自己的 hard cap 内选取
3. 保护完成后，空余预算按优先级二次分配
4. 总量仍受 max_injection_chars 硬限制
```

只在真的相关时保底，不为凑栏位每轮硬塞一个待办。

副作用记一笔：开了二次借用之后各段实际长度是浮动的。看 trace 和评测报告时别把长度变化误读成打分逻辑变了。

`formatBudgetStats`（`build-context.mjs:1246`）已经在按段统计字符和估算 token，顺着现有结构加上限即可。

## 改动五：召回 trace

结构化落盘，默认字段：

```json
{
  "ts": "2026-08-10T14:22:31+08:00",
  "query_hash": "sha256:...",
  "rewrite_applied": true,
  "rewrite_confidence": 0.78,
  "candidates": [
    {"id": "ol_01J...", "scores": {"keyword": 0.7, "state": 1.0, "time": 0.4}, "decision": "injected"},
    {"id": "ev_01J...", "scores": {"keyword": 0.3}, "decision": "dropped:budget"}
  ],
  "latency_ms": {"total": 240, "retrieval": 180},
  "fallback": null
}
```

隐私约束：trace 会接触私人记忆，只记必要元数据。正文脱敏，设保留期。不能为了调参把完整聊天再复制一份到日志里。

落点固定为 `data/logs/memory-retrieval/YYYY-MM-DD.jsonl`，默认保留 14 天，由夜间维护删除超期文件。`query_hash` 使用本机 secret 做 HMAC-SHA256，不用可被短句字典反查的裸 SHA256；secret 不进 Git。trace 禁止记录 raw query、rewritten query 正文、完整候选正文和 handoff，只记录实体类别、candidate id、分数、决策、耗时与降级原因。

这项成本不算零，但它是后面所有调优的前提，仍然排 P0。

## 改动六：故障域拆分

现在 builder 整体是 `required`（`appserver_session.go:149`），本意是防止检索失败后模型凭印象编个人事实。这个保护要留，但要把故障域拆开：

| 分支 | 策略 |
| --- | --- |
| 本地关键词 + 状态过滤 | 基础分支，保持 `required`。失败就按 required 暴露失败 |
| query embedding（阶段 1 才有） | 增强分支，超时可软降级，记降级日志 |
| builder 整体失败 | 仍按 required 暴露，**不能伪装成"已经查过但没找到"** |

最后一条是重点。静默跳过整条检索、然后让模型凭印象编事实，比明着失败糟得多。

软超时初值不写死。阶段 1 接 embedding 时先按本机和实际服务的 p95 观察 `800~1200ms`，再定值。

## 改动七：评测集

扩展仓库根的 `scripts/memory-context-builder/zvec-eval-questions.jsonl`，不另起题库。

每条补齐：

```json
{
  "id": "life_shoes_requirements",
  "category": "life_preference",
  "question": "我之前说鞋子有什么要求？",
  "recent_messages": [],
  "expected_terms": ["鞋码", "42", "好打理", "毛面"],
  "forbidden_terms": ["麂皮优先", "鞋码 41"],
  "expected_ids": [],
  "forbidden_ids": [],
  "expected_status": null,
  "expected_time_window": null
}
```

`forbidden_terms` 和 `forbidden_ids` 分开：前者检查生成的 injection 文本，后者检查候选 id。至少有一种反例约束，否则只测该找到的，把阈值放宽就能刷高分。

分批填写，因为 `expected_ids` 依赖 writer 落地后才有稳定 id：

- 第一批（不依赖 writer）：`recent_messages`、`forbidden_terms`、`expected_status`、`expected_time_window`，以及跨轮指代用例。
- 第二批（writer 落地后）：`expected_ids`。

产物结构：

```text
eval/
  cases.jsonl
  run-eval.mjs          输出 Recall@K / Precision@K / ForbiddenHitRate / RewriteAccuracy
  reports/
    2026-08-1x-baseline.md
```

没有 `expected_ids` 的用例不参与 id 级 Recall@K / Precision@K，不能拿空数组当零分或满分；它们参与词级反例、状态、时间窗和 rewrite 指标。基线报告必须在调权重和接 embedding 之前生成并进 git。

## 执行顺序

有依赖关系，按序做：

| 步骤 | 内容 | 依赖 |
| --- | --- | --- |
| 0a | 确认现役 builder 路径（已定：`workspace/scripts/memory-context-builder/build-context.mjs`） | — |
| 0b | ~~锁定 canonical Go worktree、构建/替换/回滚命令~~ **已完成 2026-08-10**：`src/cc-connect/` @ `local/context-auto-rotate` | — |
| 1 | ~~固定 open-loop schema、独立存储、revision/history、writer 原子更新与锁~~ **已完成 2026-08-10**：`open-loop-writer.mjs` + 17 个测试，commit `1fa4c17` | 0a |
| 2 | ~~旧 events 健康检查；新增 open-loop reader 与 schema 故障测试~~ **已完成 2026-08-10**：三个函数 + 32 个测试，commit `d3db14b` | 1 |
| 3 | ~~拆分 current text / handoff，建立 recent-turn 环形缓冲与 turn snapshot~~ **已完成 2026-08-10**：canonical Go commit `4d3d757` | 0b |
| 4 | ~~持久化 extraction job、失败队列、准入闸门和 worker~~ **已完成 2026-08-10**：writer commit `d19dad2` + canonical Go commit `63f26a2` | 1, 3 |
| 5 | ~~夜间对账：重放、合并、候选消化、TTL、trace 清理~~ **已完成 2026-08-10**：workspace commit `b3cfad1` + canonical Go commit `71254cb` | 1, 4 |
| 6 | ~~条件式 rewrite 与时间解析；recent 只参与改写，不混入关键词~~ **已完成 2026-08-10**：workspace commit `5643a18` | 2, 3 |
| 7 | open-loop 检索块、独立注入、预算保底与二次借用 | 2, 6 |
| 8 | 隐私受控的召回 trace | 6, 7 |
| 9 | 评测集第一批，生成关键词基线 | 6, 8 |
| 10 | 评测集第二批补 `expected_ids`，重新生成完整基线 | 1, 9 |

步骤 1~2 和步骤 3 可以并行；worker 必须等 snapshot 和 writer 都可用后再接。任何权重调整和 embedding shadow 都排在完整基线之后。

### 进度记录 2026-08-10

步骤 1 已完成并单独提交（commit `1fa4c17`，只含 `open-loop-writer.mjs` 与 `open-loop-writer.test.mjs`，未混入步骤 2，未改 `events.jsonl`）。writer 侧过程中修掉两个并发真 bug：

- 锁撕裂：`open(…,"wx")` 会让锁文件先以空内容存在，竞争方读到无法解析的 JSON 就误判为废弃锁并删掉活锁。改用 `mkdir` 作为原子原语。
- 陈旧回收的 check-then-act 竞态：读完 `owner.json` 后该 pid 退出，等到按"pid 已死"动手时锁已被另一个写入方重新持有。加 5s 回收宽限期 + rename 后再删。第二个 bug 大约三次一现，修完连跑四轮 17/17 才算稳。

步骤 2 前半段（旧 events 健康检查）已跑完：`events.jsonl` 15 行，JSON 全部可解析，`id`/`time`/`summary` 无缺失，15 个 id 零重复，`healthy: true`。按 spec 只体检不迁移，旧文件一行未动。

步骤 2 后半段已完成并单独提交（commit `d3db14b`，只含 `build-context.mjs` 与 `open-loop-reader.test.mjs`，未混入 spec 或其他未跟踪文件，未改 `events.jsonl`）。32 个测试全绿，步骤 1 的 17 个重跑仍全绿。

配置侧（本步之前已落地的两处）：

- `openLoopsPath` 改为直接取 writer 的 `paths.snapshotPath`，不再自己拼一遍路径——两边各算一份迟早漂移。
- 新增 `max_retrieved_open_loops` 与独立的 `open_loop_score_weights`（`title/alias/next_action/topic` 命中、状态分、`updated_at / last_confirmed_at` 时间衰减），并接进 `normalizeConfig`（`normalizeOpenLoopScoreWeights` 逐键回退，缺键和垃圾值都落默认）。刻意不复用 `score_weights`，避免待办排序和事件排序耦合。

三个函数本体（行号见「改动三：open loop 检索与注入」小节）：

- `readOpenLoops` 复用 writer 的 `readOpenLoops({strict:false})` 做解析、重复 `id`/`identity_key` 检测和 BOM 处理，只在上面加一层面向检索的 schema 校验，不另写解析。
- 两种"没数据"分开：文件不存在是空集合，不算故障；文件存在但坏 JSON / 重复 `identity_key` / schema 不合法则抛 `OPEN_LOOPS_CORRUPT` 让 builder 非零退出，由 App Server 的 `required` 暴露。静默返回空集合和"查过但没找到"在调用方看来一模一样，正好会让模型凭印象编个人事实。
- `strict: false` 保留为诊断通道，返回 `{loops, problems}` 并仍吐出能用的行，供健康检查使用。
- `scoreOpenLoop` 关键词零命中即 0 分，状态分和时间分不会把没命中的待办抬上来；否则每条 `pending` 都有正分，无关消息也会被注入。时间衰减走 `last_confirmed_at → updated_at → created_at` 回退链。`done / expired` 不给状态加分，但匹配到仍有正分——移出主动候选集是步骤 7 注入过滤的事，不在打分层做。
- `formatInjectionOpenLoops` 只产出块正文，**没有**接进 `buildInjectionPayload`。注入块接线、状态过滤、预算保底与二次借用属于步骤 7。

过程中两处值得记一笔：

- `typeof [] === "object"`，所以 JSON 数组行能通过 writer 的对象检查，然后在 reader 侧被报成一堆"缺字段"。改成先判数组直接说 `not an object`。不是 writer 的 bug（schema 校验本来是 reader 的活），但报错得说人话。测试先炸出来的。
- `main()` 改成仅直接调用时执行并导出三个函数。改之前核过两个真实调用方——`config.toml` 的 `memory_context_builder_cmd` 和 `codex-shadow.ps1`，都是 `node <绝对路径> --message ...`，所以 gate 安全；另实跑一次 CLI 确认输出照旧。**新增测试如需 import builder，靠的就是这个 gate，别把它改回无条件执行。**

两个接手须知：

- `build-context.mjs` 在本次提交前是未跟踪状态，所以 `d3db14b` 是整文件新增（1463 行）而非增量 diff。想看本步实际改了什么，`git show` 看不出来，得对照本文这份记录。
- 当前分支是 `master`，但仓库同时存在 `main` 的引用记录。两个名字都在的话值得理一下，不影响已落地的两次提交。

步骤 3 已完成并单独提交（canonical Go commit `4d3d757`）：`--message` 只接本轮正文，`--recent` 接容量 4 的纯净对话缓冲；handoff 缺失和解析失败均有显式降级。`completeTurn() → flushPendingAsText()` 只从最终可见文本生成 snapshot，不收 thinking、工具输出或 memory injection。

步骤 4 已完成并分仓提交：writer 兼容层 commit `d19dad2`，canonical Go worker commit `63f26a2`。

- job 在 `EventResult` 发出前原子写入 `pending/`，后台单 worker 通过 `pending → processing → completed/failed` 状态机处理；正文成功后删除，完成标记只留 job id 与计数。
- 准入闸门在模型前过滤短噪声和日常查岗；抽取使用独立 `codex exec --ephemeral`、只读沙箱和 JSON schema。高置信明确证据进入 writer，中置信候选保留 7 天，低置信只计数。
- writer 从持久化 source job 本地生成 HMAC 证据，不信任模型提供的摘要哈希；相同 `job_id` 重放为 no-op。worker 最多重试 5 次并指数退避，崩溃可恢复，且多 session 不会抢走新鲜 processing job 或删除活跃输出。
- 缺 `turn_id` 的 snapshot 在 `Send()` 时分配稳定序号，重复入队仍得到同一个 pre-turn job id；完成标记也参与去重。
- 验证：Codex package、`go vet ./agent/codex`、`go build ./...` 通过；writer 20 项与 reader 32 项通过。仓库级 `go test ./...` 仍有既存 Windows/Unix 假设失败，但 `agent/codex` 通过。
- 现役 `config.toml` 已加入 extraction 开关、独立状态目录、模型/超时/重试和 writer 路径；需部署 `63f26a2` 构建并重启后才生效，当前会话未热启 worker。

步骤 5 已完成并分仓提交：workspace commit `b3cfad1`，canonical Go commit `71254cb`。

- `daily-memory-maintenance.mjs` 现在即使当天 daily review 缺失也会继续跑 Phase 0 对账；`nightly-memory-maintenance.ps1` 不再因 review 缺失提前退出。
- 所有 open-loop 合并、TTL / `recall_eligibility` 推进仍经过 writer 的同一把跨进程锁和原子快照替换；自动时间推进不刷新 `last_confirmed_at`，不会把“沉默”误当新证据。
- `failed/` 会按夜间重放元数据回到 `pending/`，单 job 最多 3 个夜间重放周期；超过 14 天清理，单日新失败超过 20 条在报告告警。Go job schema 保留 `nightly_replays / last_nightly_replay_at`，worker 重写 job 时不会丢掉节流状态。
- 中置信候选在后续独立 job 给出显式证据时可晋升；已被高置信写入印证或超过 7 天的候选被清理。`history.jsonl` 按上海月份拆档，trace 默认清理 14 天前文件，每日生成 `reports/memory-write-YYYY-MM-DD.md`。
- 新增 3 个夜间维护测试；与 writer 测试合跑 23/23 通过。

步骤 6 已完成并单独提交（workspace commit `5643a18`）。

- 仅在指代词、相对时间或“短且无实体”时触发 deterministic rewrite；当前消息已经带明确实体时，最近对话不会覆盖它。
- recent 环形缓冲只用于选出一个高置信实体并生成独立 `retrievalKeywords`，原始 `keywords` 仍只来自 `current_text`；两个对象同分时标记 `ambiguous` 并不强猜。
- `今天 / 昨天 / 前天 / 上周` 按北京时间转为绝对范围并用于 events / daily summaries 的元数据过滤；`之前那个` 不伪造时间窗，留给 open-loop 状态优先。
- preview 增加 rewrite 是否生效、置信度、实体来源轮次、绝对时间窗和歧义标志；recent 仍不进入 injection。
- 新增 6 个 rewrite / 时间窗测试；Phase 0 当前相关 Node 测试合计 61/61 通过，真实 CLI 冒烟可把“它修好了吗”解析到最近对话里的 `GPT Live`。`go test ./agent/codex`、`go vet ./agent/codex` 与 `go build ./...` 同轮通过。

下一步按依赖进入步骤 7：把已经完成的 open-loop reader / scorer / formatter 接进 `buildInjectionPayload`，再做状态过滤、预算保底与二次借用。现役二进制仍未替换或重启。

## 验收

阶段 0 算做完，需要同时满足：

- `open-loops/open-loops.jsonl` 里有真实产生的 open loop，且跨天更新的是同一条 `id`、`revision` 递增，`history.jsonl` 有对应证据记录。
- 现有 `events.jsonl` 不被新 writer 改写；旧事件仍按原逻辑可检索。
- 最新 preview 的 keywords 只来自本轮 `current_text`，不再出现 `recent_session_handoff` 标签、历史整段问答或 memory injection 文本。
- "它修好了没"这类无实体消息，trace 里能看到 rewrite 生效、resolved_entities 非空；有两个同等候选时不会强行选错。
- injection payload 里能看到独立的 open loop 块，但默认不重复出现 recent conversation。
- 每次注入都有对应 trace，能回答"为什么命中这条、为什么裁掉那条"。
- `run-eval.mjs` 能跑出基线报告，含 Recall@K、Precision@K、ForbiddenHitRate 和 RewriteAccuracy。
- 人为同时触发逐轮写入与夜间维护，没有坏 JSON、重复 identity 或丢更新。
- 在 job 写入后杀掉并重启进程，待抽取 turn 能继续处理且不会重复 upsert。
- 关掉 extraction worker 或造抽取失败，聊天不受影响；builder 整体失败时明着报错，不伪装成查过。
- 新二进制回归失败时，按步骤 0b 的记录能恢复上一版，现有微信文本链路和旧记忆检索可继续工作。

全部通过，再进阶段 1 的向量 shadow。
