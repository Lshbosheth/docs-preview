# zvec 记忆检索改造方案

这份文档用于判断 `alibaba/zvec` 是否适合接入当前的 `cc-connect-weixin-codex` 记忆系统，以及如果接入，应该怎么安装、升级、迁移和长期演进。

结论先放前面：**zvec 适合作为本地记忆检索层，但不应该替代现有 Markdown / JSONL 记忆源文件。**

当前更合理的设计是：

```text
权威记忆源文件
  memory.zh-CN.md
  memory.md
  events/events.jsonl
  summaries/daily/*.md
        |
        v
记忆抽取 / 切片 / embedding
        |
        v
zvec 本地索引
  原文片段 + 向量 + 元数据 + 全文索引
        |
        v
运行时检索
  当前问题 -> 找相关记忆 -> 注入少量上下文
```

## zvec 是什么

zvec 是 Alibaba 开源的本地向量数据库，定位是 in-process vector database，也就是直接嵌入应用进程内使用，不需要单独起一个数据库服务。

它适合做这些事：

- 保存向量和原文片段
- 根据向量相似度做语义检索
- 保存元数据并按元数据过滤
- 使用全文检索，也就是普通关键词搜索
- 做 hybrid retrieval，把向量检索、全文检索和结构化过滤合并起来

它不负责做这些事：

- 自动理解用户人格
- 自动总结长期记忆
- 自动把文字变成向量
- 自动决定哪些聊天值得长期保存

这几个能力需要别的模块配合。

## embedding 是什么

embedding 是把文字转换成数字向量的过程。

例如：

```text
我不喜欢花里胡哨的衣服。
以后给我推荐衣服要简单、素色一点。
```

这两句话字面不同，但语义接近。

普通关键词搜索主要看有没有命中“衣服”“素色”“花哨”这些词；embedding 检索会把两句话映射到接近的语义坐标，因此更容易在用户模糊提问时找回相关记忆。

zvec 负责存储和检索这些向量；embedding 模型负责生成这些向量。

## 当前系统是什么状态

当前记忆系统主要由这些文件和脚本组成：

- `lshbosheth-memory/memory.zh-CN.md`
- `lshbosheth-memory/memory.md`
- `lshbosheth-memory/events/events.jsonl`
- `lshbosheth-memory/summaries/daily/*.md`
- `scripts/memory-context-builder/build-context.mjs`

现有召回逻辑更接近：

```text
当前消息
  -> 抽关键词
  -> 扫 events 和 daily summaries
  -> includes 命中统计
  -> 按重要性、时间、命中位置打分
  -> 选少量内容注入
```

这套方式的优点是简单、透明、可控。

缺点是：

- 依赖关键词，用户换个说法就可能漏召回
- 中文口语、错别字、转写错误时召回不稳定
- 相似含义但字面不同的内容不容易命中
- 后续记忆变多后，全量扫描会越来越粗糙

另外，当前 `build-context.mjs` 里有一批中文规则在 PowerShell 默认读取下显示为乱码。正式接入 zvec 之前，应该先确认文件编码和规则内容，避免旧规则继续影响检索质量。

## 对用户的直接好处

### 更容易想起旧上下文

用户可以用更自然、模糊的方式提问。

例如：

```text
我之前说鞋子有啥要求来着？
```

系统应该能找回：

- 鞋码 42 或 42.5
- 鞋子要好打理
- 不喜欢毛面材质
- 骑车通勤，鞋和裤子都要考虑清洁问题

不需要用户每次把条件重新讲一遍。

### 更省 token

现在为了不丢上下文，容易把稳定记忆、近期摘要和历史片段一起塞进模型。

接入 zvec 后，运行时只注入最相关的几条记忆。

目标不是“记住更多文字”，而是“少塞无关文字”。

### 切 session 损失更小

新 session 不再依赖长会话自然携带大量上下文。

系统可以用当前消息检索旧记忆，把相关背景重新补进来。

### 对模糊说法更友好

例如用户说：

```text
那个我之前吐槽不好洗的鞋是什么问题？
```

关键词搜索未必能命中“NB 毛面难打理”。

embedding 检索更可能通过语义相似找回对应片段。

### 更适合长期生活偏好

对这些信息特别有用：

- 买衣服偏好
- 鞋码和鞋材质偏好
- 骑车通勤限制
- 肩颈、按摩仪、久坐相关偏好
- 订阅、Apple ID、Google Play、礼品卡等反复讨论过的操作背景
- `cc-connect` 项目里的历史技术决策

## 不会带来的好处

zvec 不会让模型自动变聪明。

它只是更会找材料。

如果源文件里没有记，zvec 也搜不出来。

如果 embedding 模型质量差，语义召回也会偏。

如果检索结果注入太多，仍然会浪费 token。

如果总结模型把记忆写错，zvec 会把错误记忆更快地找出来。

## 推荐架构

### 第一层：权威源文件

继续保留现有文件作为事实来源：

```text
lshbosheth-memory/
  memory.zh-CN.md
  memory.md
  events/events.jsonl
  summaries/daily/*.md
```

这些文件仍然可以人工检查、git diff、回滚。

zvec 只作为派生索引，不作为唯一真相。

### 第二层：记忆抽取

从聊天、daily review 或人工记录里抽取结构化记忆。

输出示例：

```json
{
  "id": "pref_shoes_easy_clean_20260615",
  "type": "preference",
  "summary": "用户鞋码 42 或 42.5，偏好易打理鞋面，避免毛面材质。",
  "topics": ["shopping", "shoes", "clothing"],
  "entities": ["鞋码", "NB", "毛面"],
  "importance": 4,
  "time": "2026-06-15T12:00:00+08:00",
  "source_path": "lshbosheth-memory/events/events.jsonl"
}
```

### 第三层：切片

把长文档切成较小的 chunk。

建议切片单位：

- `memory.zh-CN.md`：按二级/三级标题切
- `events.jsonl`：一条 event 一条 chunk
- daily summaries：按用户问题、话题或段落切
- 技术文档：按标题块切

每个 chunk 都要带 metadata：

```json
{
  "id": "event:pref_shoes_easy_clean_20260615",
  "text": "用户鞋码 42 或 42.5，偏好易打理鞋面，避免毛面材质。",
  "type": "preference",
  "time": "2026-06-15T12:00:00+08:00",
  "importance": 4,
  "topics": ["shopping", "shoes"],
  "source_path": "lshbosheth-memory/events/events.jsonl"
}
```

### 第四层：embedding

用 embedding 模型把 `text` 转成向量。

embedding 模型可以换。

可选来源：

- OpenAI embedding
- Qwen embedding
- 本地 embedding 模型

选择标准：

- 中文语义效果要好
- 延迟要低
- 成本可控
- 输出维度稳定
- 后续可批量重建索引

### 第五层：zvec 索引

zvec 中保存：

- chunk id
- 原文 text
- embedding vector
- metadata
- 全文索引字段

检索时组合：

- 向量相似度
- 关键词全文检索
- topics / type / time / importance 过滤
- recency bonus
- 手工规则加权

### 第六层：重排和注入

检索结果不能直接全塞给模型。

还需要做：

- 去重
- 按重要性排序
- 按时间衰减
- 按当前意图过滤
- 控制最大注入字符数

最终注入应该保持短小。

例如：

```text
Retrieved Memory:
- 用户买鞋偏好易打理材质，避免毛面；鞋码 42 或 42.5。
- 用户骑车通勤，裤脚可能蹭链条油，推荐裤子需考虑收脚或绑带。
```

## 安装方案

### Node.js 版本

当前项目主要是 Node.js 脚本，优先使用 Node.js SDK。

在项目根目录或独立工具目录安装：

```bash
npm install @zvec/zvec
```

建议先不要装到主服务依赖里。

更稳的做法是先在 `scripts/memory-context-builder/` 旁边做试验脚本，确认 Windows 下安装、写入、查询、重建索引都正常。

### Python 版本

如果后续 embedding 或数据处理更适合 Python，也可以使用 Python SDK：

```bash
pip install zvec
```

但当前项目主链路是 Node，除非确实需要 Python embedding 或数据处理生态，否则不建议引入第二套运行时。

## 升级方案

zvec 仍在快速发展，升级时不要直接覆盖生产索引。

推荐策略：

```text
zvec-index/
  active/
  builds/
    2026-06-20-v1/
    2026-06-25-v2/
```

升级流程：

1. 保留旧索引
2. 用新版本 zvec 从源文件重建新索引
3. 跑固定测试问题
4. 对比旧检索和新检索
5. 新索引通过后切换 `active`
6. 旧索引保留一段时间便于回滚

因为权威源文件还在 Markdown / JSONL 里，所以即使索引损坏，也可以重新构建。

## 迁移方案

### 阶段 0：不接主链路

只做离线验证。

新建脚本：

```text
scripts/memory-context-builder/zvec-index.mjs
scripts/memory-context-builder/zvec-query.mjs
scripts/memory-context-builder/zvec-eval.mjs
```

功能：

- 从 memory/events/summaries 读取内容
- 切 chunk
- 生成 embedding
- 写入 zvec
- 用测试问题查询
- 输出检索结果 markdown

### 阶段 1：shadow 模式

当前 `build-context.mjs` 继续按旧逻辑工作。

额外跑 zvec 检索，把结果写到 shadow preview。

不注入给模型。

对比这些问题：

```text
我之前说鞋子有什么要求？
我买衣服预算是多少？
那个自动切换 fallback 怎么改的？
我之前说 Pushcut 是什么？
按摩仪我更适合哪个？
```

如果 zvec 结果更准，再进入下一阶段。

### 阶段 2：混合召回

旧关键词召回和 zvec 同时跑。

合并结果：

```text
final_score =
  vector_score * 0.45
  + fts_score * 0.25
  + keyword_rule_score * 0.15
  + importance * 0.10
  + recency_bonus * 0.05
```

这个权重只是初始建议，后续根据实际误召回调整。

### 阶段 3：主链路注入

zvec 检索稳定后，才把结果接入运行时注入。

仍然保留旧召回作为 fallback。

如果 zvec 查询失败：

- 不影响正常聊天
- 回退到现有关键词检索
- 记录错误到日志

## 测试问题集

迁移前要准备固定问题集，避免只凭感觉判断。

建议包含：

### 生活偏好

```text
我鞋子有什么要求？
我买衣服喜欢什么风格？
我骑车对裤子有什么影响？
我之前想买什么包？
```

### 健康和日常

```text
我肩颈之前有什么问题？
按摩仪更适合我哪个？
我晚上适合安排高强度学习吗？
```

### 项目记忆

```text
自动切换 fallback 是怎么做的？
2 点半英语提醒为什么之前没发？
cc-connect 现在默认模型和 fallback 是什么？
```

### 模糊说法

```text
那个不好打理的鞋是咋回事？
之前那个别发 powershell 的问题修了吗？
我上次说的气足饮料是什么？
```

## 是否能扩展

能扩展。

zvec 适合先做本地单用户记忆，后续也可以扩展到：

- 多项目记忆
- 多用户记忆
- 按 namespace 隔离
- 按 topic / type 过滤
- 技术文档检索
- 商品偏好检索
- 聊天原文片段检索
- GUI 里查看和调试记忆命中

推荐 namespace 设计：

```text
project:lshbosheth
user:lshbosheth
memory:stable
memory:events
memory:daily-summary
docs:project
shopping:preference
health:notes
```

后续如果有多用户需求，必须把用户隔离放在 schema 里，不能只靠路径约定。

## 以后有更好的方案，zvec 还有用吗

有用。

只要我们保持这条原则：

**Markdown / JSONL 是权威源，zvec 是可重建索引。**

那么以后换方案时，zvec 不会成为包袱。

可替换的部分：

- zvec 可以换成 LanceDB、SQLite-vec、Qdrant、Milvus、pgvector
- embedding 模型可以从 Qwen 换成 OpenAI 或本地模型
- 重排模型可以单独换
- 记忆抽取模型可以单独换

不应该绑定死的是：

- 记忆源格式
- chunk id 规则
- metadata schema
- 评测问题集

真正长期有价值的是：

- 整理好的记忆源文件
- 结构化 events
- chunk 设计
- metadata 设计
- 评测问题集
- 召回和注入策略

即使未来不用 zvec，这些资产也能迁移。

## 风险和注意事项

### embedding 成本

如果每条聊天都实时 embedding，会增加成本和延迟。

建议：

- stable memory 和 events 写入时生成 embedding
- daily summaries 每天维护时批量生成
- 普通闲聊不实时入库
- 查询时只对当前问题生成一次 embedding

### 隐私

如果使用云端 embedding 模型，记忆文本会发送给模型服务。

敏感内容要么不入库，要么使用本地 embedding 模型。

### 误召回

语义相近不等于真的相关。

必须保留：

- metadata 过滤
- 重要性权重
- 时间权重
- 旧关键词规则
- 注入前去重和裁剪

### 错误记忆会被更快找出来

zvec 提升的是检索能力。

如果源记忆写错，它会更快把错的东西找出来。

所以记忆抽取和人工修正仍然重要。

## 推荐实施顺序

### 第一周：离线验证

- 修复 / 确认 `build-context.mjs` 中文规则编码
- 建立 chunk schema
- 选择 embedding 模型
- 写 zvec index/query 原型
- 建固定测试问题集

### 第二周：shadow 对比

- zvec 检索结果写入 shadow preview
- 不进入主链路
- 每天抽样看命中是否准确
- 调整切片和权重

### 第三周：小流量接入

- 只对明确历史检索问题启用
- 保留旧关键词召回 fallback
- 限制注入字符数
- 记录命中结果和 token 消耗

### 第四周：稳定化

- 添加重建索引脚本
- 添加升级回滚流程
- 添加索引健康检查
- 加入 docs 和运行手册

## 最终建议

对当前项目来说，zvec 值得试。

但不要把目标定成“把记忆搬进 zvec”。

更准确的目标应该是：

```text
保留当前可读、可回滚的记忆源文件；
用 zvec 建一个可重建的本地语义检索层；
让模型每次只拿到真正相关的少量记忆。
```

这样做的收益最大，风险最小。

## 参考资料

- [alibaba/zvec GitHub](https://github.com/alibaba/zvec)
- [zvec 文档站](https://zvec.org/)
- [zvec Quickstart](https://zvec.org/docs/quickstart)
