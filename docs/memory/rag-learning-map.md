# RAG 常用技术路线和名词地图

这篇是给你看简历、视频、技术方案时对照用的。先别把所有词都当成必须掌握的东西，RAG 里面有一部分是基础流程，有一部分是效果优化，还有一部分是项目包装。

## 先给结论

图里那些词大部分是常见的，但不是同一层级。

真正的 RAG 主线是：

```text
文档处理 -> 切分 -> 向量化 -> 检索 -> 重排 -> 拼上下文 -> 大模型生成 -> 评估优化
```

如果你只是刚开始学，先抓住这 6 个就够：

- `chunking`: 文档切分
- `embedding`: 向量化
- `retrieval`: 检索/召回
- `reranking`: 重排
- `context`: 拼给模型的原文上下文
- `evaluation`: 评估回答和检索效果

## 一张表看懂常见程度

| 名词 | 中文理解 | 常用程度 | 你现在要不要优先学 |
| --- | --- | --- | --- |
| `chunking` | 把文档切成小块 | 非常常用 | 要 |
| `sliding window` | 滑动窗口切分，有重叠 | 非常常用 | 要 |
| `embedding` | 把文本转成向量 | 非常常用 | 要 |
| `vector database` | 存向量和原文 chunk 的库 | 非常常用 | 要 |
| `retrieval / recall` | 先找一批候选内容 | 非常常用 | 要 |
| `top-k` | 取最相似的前 K 条 | 非常常用 | 要 |
| `reranking` | 对候选结果重新排序 | 很常用 | 要 |
| `BM25` | 关键词检索算法 | 很常用 | 要知道 |
| `hybrid search` | 关键词 + 向量混合检索 | 很常用 | 要知道 |
| `query rewrite` | 改写用户问题，让它更好检索 | 很常用 | 要知道 |
| `HyDE` | 先生成假设答案，再拿它去检索 | 进阶常用 | 后面学 |
| `Cross-Encoder` | 常见重排模型结构 | 进阶常用 | 后面学 |
| `MRR / Recall@K / TopK accuracy` | 检索评估指标 | 进阶常用 | 后面学 |
| `OCR` | 图片/PDF 文字识别 | 场景相关 | 看文档类型 |
| `Text2SQL` | 自然语言转 SQL 查结构化数据 | 场景相关 | 暂时不用急 |
| `Agentic RAG` | Agent 自己决定查什么、怎么查 | 进阶方向 | 后面学 |
| `GRPO / RLHF / DPO` | 用偏好数据优化模型或策略 | 高阶优化 | 先不用学 |

## 基础 RAG：必须会的主线

基础 RAG 解决的是一个问题：

> 模型不知道你的私有资料，所以先从资料里找相关片段，再让模型基于这些片段回答。

基础流程是：

```text
1. 加载文档
2. 清洗文档
3. 切成 chunk
4. 对 chunk 做 embedding
5. 存进向量库
6. 用户提问
7. 问题也做 embedding
8. 向量相似度检索
9. 取 top-k 个 chunk
10. 把 chunk 原文塞进 prompt
11. 大模型生成回答
```

这里最容易误解的一点是：传给大模型的不是向量，而是检索出来的原文 chunk。向量只是用来找内容。

## 切分方向：让知识库别从源头就烂掉

切分不是随便按字数切。切坏了，后面检索和生成都会难受。

常见方向：

- 固定长度切分：比如每 800 tokens 一块。
- 滑动窗口切分：每块之间保留一部分重叠，避免上下文断开。
- 按标题/段落切分：保留文档结构，适合 Markdown、制度文件、产品手册。
- 语义切分：尽量按意思完整的一段切，不把一个概念从中间切断。
- 父子 chunk：小 chunk 用来检索，大 chunk 或父段落用来给模型回答。

你现在先记：

```text
chunk 太小：容易丢上下文
chunk 太大：检索不精准，还浪费 token
有 overlap：能减少上下文断裂
```

## 检索方向：先把可能相关的东西捞出来

检索不是只有向量搜索。

常见组合：

- 向量检索：靠语义相似度，适合“说法不同但意思接近”的问题。
- BM25：靠关键词匹配，适合专有名词、编号、制度条款、精确词。
- 混合检索：向量 + BM25 一起用，实际项目很常见。
- 元数据过滤：先按时间、文档类型、部门、标签过滤，再检索。
- 多路召回：用几种方式各捞一批，再合并。

所以图里写 `BM25 + 向量混合检索` 是常见工程做法，不是乱写。

## 重排方向：从“可能相关”变成“更对题”

向量检索的 top-k 只是“看起来相似”，不保证最能回答问题。

重排一般这样做：

```text
先召回 top 20 或 top 50
再用 reranker 对这批候选重新打分
最后取 top 3 或 top 5 给大模型
```

常见重排方式：

- Cross-Encoder rerank：把“问题 + chunk”一起输入模型，输出相关性分数。
- LLM rerank：让大模型判断候选片段是否能回答问题。
- 规则重排：比如优先官方文档、最新文档、标题命中的文档。

你可以这样理解：

```text
检索负责召回率：别漏掉
重排负责精确率：别把没用的放前面
```

## Query 方向：让问题更适合检索

用户问的问题经常不适合直接搜。

比如用户问：

```text
这个怎么报销？
```

系统可能需要改写成：

```text
差旅费报销流程、发票要求、审批规则
```

常见做法：

- query rewrite：改写用户问题。
- query expansion：扩展关键词和同义词。
- multi-query：生成多个检索问题，多路搜索。
- HyDE：先让模型生成一个“假设答案”，再用这个假设答案去检索。

这些都是为了提高召回质量。

## 生成方向：不是把 chunk 塞进去就完了

检索到 chunk 后，还要控制模型怎么回答。

常见要求：

- 只基于检索内容回答。
- 找不到依据时拒答。
- 引用来源文档。
- 不要编造条款。
- 多个 chunk 有冲突时说明冲突。
- 回答时保留关键数字、日期、规则。

一个 RAG prompt 通常会长这样：

```text
你只能根据以下资料回答。
如果资料不足，请说“当前知识库没有足够信息”。

资料：
{retrieved_context}

用户问题：
{question}
```

## 评估方向：知道哪里坏了

RAG 的问题通常不是一句“模型不行”能解释的。

要拆开看：

- 检索有没有找对？
- 重排有没有排对？
- 上下文够不够？
- 模型有没有按上下文回答？
- 答案有没有幻觉？
- 有没有引用错来源？

常见指标：

- `Recall@K`: 正确片段有没有出现在前 K 个结果里。
- `MRR`: 正确结果排得靠不靠前。
- `Hit Rate`: 有没有命中正确资料。
- `Faithfulness`: 回答是否忠于资料。
- `Answer Correctness`: 答案是否正确。

如果你看到简历写 `Recall@10`、`MRR`、`Top5`，它大概是在说“我不只是搭了 RAG，还做了检索质量评估”。

## 数据方向：脏数据会毁掉 RAG

RAG 很吃数据质量。

常见数据处理：

- 去掉页眉页脚、水印、目录噪声。
- 合并被 PDF 换行切碎的句子。
- 保留标题层级。
- 保留表格结构。
- 给 chunk 加元数据，比如文档名、章节、日期、来源。
- 对重复文档去重。
- 对过期文档标记版本。

你之前问“清洗”其实就在这里。清洗不是玄学，就是让进向量库的东西更像“可回答问题的知识片段”。

## Agentic RAG：让 Agent 自己多轮查资料

普通 RAG 通常是：

```text
用户问一次 -> 检索一次 -> 回答一次
```

Agentic RAG 更像：

```text
用户问题
-> Agent 判断要查哪些资料
-> 第一次检索
-> 发现不够
-> 改写问题再检索
-> 调工具查数据库
-> 汇总
-> 回答
```

图里上半段的 `ReAct + Reflection + Memory + Tools` 就是偏 Agentic RAG / 多 Agent 系统的包装。

常见组件：

- `ReAct`: 边推理边调用工具。
- `Reflection`: 对中间结果做反思和修正。
- `Memory`: 保存历史任务、偏好、上下文。
- `Tools`: 搜索、数据库、代码执行、Text2SQL。
- `State`: 保存当前任务的中间状态。

这个方向更像“RAG + 工具调用 + 工作流编排”。

## 图里哪些是包装，哪些是真东西

比较实在、常见：

- 结构化切分
- OCR
- Milvus / 向量库
- BM25 + 向量混合检索
- Query rewrite
- Rerank
- Recall@K / MRR
- 引用来源
- 拒答策略
- 日志样本沉淀

偏项目包装，但也有实际意义：

- 多 Agent 角色名，比如 `ChiefArchitect`、`DataAnalyst`
- `ResearchState`
- `Checkpoint`
- `Reflection`
- `智能路由`

更高阶，不是基础 RAG 必需：

- GRPO
- 偏好数据训练
- LoRA 微调
- 用强化学习优化答案

这些不是假的，但对于刚学 RAG 来说顺序靠后。你先会搭一条稳定的检索链路，比一上来啃 GRPO 更值。

## 建议学习路线

### 第一阶段：会解释

目标：看到名词不懵。

要掌握：

- RAG 全称
- chunk / embedding / vector database
- retrieval / top-k / context
- reranking 是干什么的

### 第二阶段：会搭基础版

目标：能做一个本地知识库问答。

要掌握：

- 文档读取
- 文本切分
- embedding
- 向量库
- 检索 top-k
- prompt 拼接
- 找不到就拒答

### 第三阶段：会优化检索

目标：回答不准时知道从哪里调。

要掌握：

- chunk size 和 overlap
- BM25 + vector hybrid search
- query rewrite
- metadata filter
- rerank
- top-k / top-n 调参

### 第四阶段：会评估

目标：不是凭感觉说“好像准了”。

要掌握：

- 构造测试问题集
- 标注正确 chunk
- 看 Recall@K
- 看 MRR
- 看答案是否忠于资料
- 记录失败案例

### 第五阶段：再碰 Agent 和训练

目标：做更复杂的研究助手、企业助手。

要掌握：

- ReAct
- tool calling
- workflow / graph
- memory
- reflection
- preference data
- fine-tuning / GRPO / DPO

## 你现在最适合看的方向

按你现在的理解程度，先看这条线：

```text
文档清洗
-> chunking
-> embedding
-> vector search
-> BM25 hybrid search
-> reranking
-> prompt with context
-> refusal when no evidence
-> evaluation
```

先别急着学多 Agent 和 GRPO。那些可以等你把基础 RAG 跑通以后再加。

## 参考资料

- OpenAI Retrieval guide: https://developers.openai.com/api/docs/guides/retrieval
- OpenAI Prompt engineering, RAG context: https://developers.openai.com/api/docs/guides/prompt-engineering
- LangChain Retrieval docs: https://docs.langchain.com/oss/python/langchain/retrieval
- LlamaIndex RAG introduction: https://developers.llamaindex.ai/python/framework/understanding/rag/
- Pinecone Rerankers and two-stage retrieval: https://www.pinecone.io/learn/series/rag/rerankers/
