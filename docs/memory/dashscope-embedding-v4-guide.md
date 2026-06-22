# 阿里 text-embedding-v4 记忆检索接入指南

这份文档教你自己把阿里百炼 `text-embedding-v4` 接到当前记忆系统里。

目标不是一次性做完生产级系统，而是先跑通这条链路：

```text
记忆源文件
  -> 切成 chunk
  -> 调 text-embedding-v4 生成向量
  -> 保存向量结果
  -> 用固定测试问题验证召回效果
  -> 后续再接 zvec
```

## 先记住几个结论

第一版不要转原始会话。

先转整理后的源文件：

```text
lshbosheth-memory/memory.zh-CN.md
lshbosheth-memory/memory.md
lshbosheth-memory/events/events.jsonl
lshbosheth-memory/summaries/daily/*.md
lshbosheth-memory/daily-reviews/*.md
```

不要先转这些：

```text
session 原始文件
shadow-previews
canary-injections
zvec 派生索引
配置文件里的 API key
```

原因很简单：原始会话太吵，先把整理好的记忆跑通，检索质量会更稳。

## text-embedding-v4 是什么

`text-embedding-v4` 是阿里百炼的文本向量模型。

它的作用是把文字变成向量。

例如：

```text
用户鞋码 42 或 42.5，鞋子要好打理，不要毛面。
```

会被转换成一组数字向量。

后续你问：

```text
我之前说鞋子有什么要求？
```

系统也会把这个问题转换成向量，再去找相似的记忆向量。

## 官方限制和建议

当前用于这套方案的关键参数：

| 项 | 建议 |
| --- | --- |
| 模型 | `text-embedding-v4` |
| 维度 | 先用默认 `1024` |
| output_type | 先用 `dense` |
| 入库文本 text_type | `document` |
| 查询文本 text_type | `query` |
| 单次 batch | 最多 10 条文本 |
| 单条文本长度 | 最多 8192 tokens |

阿里官方建议：检索类任务最好区分查询文本和底库文本。

也就是：

```text
记忆 chunk 入库：document
用户问题查询：query
```

如果后续做更高质量检索，可以再看 `instruct`、`sparse` 或 `dense&sparse`。

第一版不要复杂化。

## API Key 怎么放

不要把 API Key 发到聊天里。

不要写进 git。

建议放到本机环境变量。

PowerShell 临时设置：

```powershell
$env:DASHSCOPE_API_KEY = "你的 key"
```

只在当前 PowerShell 窗口有效。

如果要长期设置：

```powershell
[Environment]::SetEnvironmentVariable("DASHSCOPE_API_KEY", "你的 key", "User")
```

设置完以后重新打开 PowerShell。

检查是否存在，不要打印值：

```powershell
[bool]$env:DASHSCOPE_API_KEY
```

输出 `True` 就行。

## 当前已有的准备工作

当前已经有一个 chunk 导出脚本：

```text
D:\lshbosheth\cc-connect-weixin-codex\scripts\memory-context-builder\zvec-build-corpus.mjs
```

运行：

```powershell
cd D:\lshbosheth\cc-connect-weixin-codex
node scripts/memory-context-builder/zvec-build-corpus.mjs
```

它会生成：

```text
D:\lshbosheth\cc-connect-weixin-codex\workspace\lshbosheth-memory\context-builder\zvec\chunks.jsonl
D:\lshbosheth\cc-connect-weixin-codex\workspace\lshbosheth-memory\context-builder\zvec\manifest.json
```

`chunks.jsonl` 里每一行是一条待向量化的记忆 chunk。

示例结构：

```json
{
  "id": "event:xxx",
  "text": "用户鞋码 42 或 42.5，鞋子要好打理，不要毛面。",
  "type": "preference",
  "title": "xxx",
  "time": "2026-06-15T12:00:00+08:00",
  "importance": 4,
  "topics": ["shopping", "shoes"],
  "entities": ["鞋码", "NB", "毛面"],
  "source_path": "lshbosheth-memory/events/events.jsonl",
  "embedding_status": "pending"
}
```

## 第一版要新增什么脚本

建议新增两个脚本。

### 1. 生成 document embedding

建议路径：

```text
scripts/memory-context-builder/dashscope-embed-corpus.mjs
```

功能：

- 读取 `chunks.jsonl`
- 每次取最多 10 条
- 调用 `text-embedding-v4`
- `text_type` 使用 `document`
- `dimension` 使用 `1024`
- `output_type` 使用 `dense`
- 输出到 `embeddings.jsonl`

输出路径建议：

```text
workspace/lshbosheth-memory/context-builder/zvec/embeddings.dashscope-v4-1024.jsonl
```

注意：这个文件是派生文件，不是源文件，不要提交到 GitHub 私有库。

### 2. 生成 query embedding 并测试检索

建议路径：

```text
scripts/memory-context-builder/dashscope-query-eval.mjs
```

功能：

- 读取固定测试问题
- 对每个问题调用 `text-embedding-v4`
- `text_type` 使用 `query`
- 和 document embeddings 做相似度计算
- 输出 Top 5 结果

固定测试问题已经有：

```text
scripts/memory-context-builder/zvec-eval-questions.jsonl
```

## 为什么先不用 zvec

第一版可以先不接 zvec。

因为我们要先验证两个问题：

1. 阿里 embedding 能不能正常调用
2. 生成的向量能不能把测试问题召回准

所以第一版可以直接在 Node 里用余弦相似度算 Top K。

等测试问题结果稳定，再把向量写进 zvec。

这样排查更简单。

## 余弦相似度是什么

余弦相似度就是比较两个向量方向像不像。

简单理解：

```text
越接近 1，越相似
越接近 0，越不相关
```

记忆检索时：

```text
用户问题向量
  vs
每条记忆 chunk 向量
```

分数最高的几条就是最可能相关的记忆。

## 推荐实验流程

### Step 1：准备 API Key

```powershell
[Environment]::SetEnvironmentVariable("DASHSCOPE_API_KEY", "你的 key", "User")
```

重开 PowerShell 后检查：

```powershell
[bool]$env:DASHSCOPE_API_KEY
```

### Step 2：重新导出 chunk

```powershell
cd D:\lshbosheth\cc-connect-weixin-codex
node scripts/memory-context-builder/zvec-build-corpus.mjs
```

确认看到类似：

```json
{
  "status": "corpus_only_embedding_pending",
  "chunk_count": 285
}
```

### Step 3：跑 document embedding

```powershell
node scripts/memory-context-builder/dashscope-embed-corpus.mjs
```

预期输出：

```text
embedded 10/285
embedded 20/285
...
done
```

### Step 4：跑测试问题

```powershell
node scripts/memory-context-builder/dashscope-query-eval.mjs
```

重点看这些问题能不能命中：

```text
我之前说鞋子有什么要求？
Mac 最后配置是什么？
自动切换 fallback 是怎么做的？
按摩仪我更适合哪个？
```

### Step 5：人工判断结果

不要只看分数。

要看 Top 5 里有没有真正相关的记忆。

例如：

```text
Query: 我之前说鞋子有什么要求？
Top 1:
  用户鞋码 42 或 42.5，鞋子要好打理，不要毛面...
```

这种就是好结果。

如果 Top 1 是“回复偏好”“人设风格”，那就是召回偏了。

## 什么时候接 zvec

等这些条件满足再接：

- API 能稳定调用
- 10 个测试问题大部分能命中
- 不相关结果少
- 生成文件结构稳定
- 你能看懂脚本在做什么

然后再做：

```text
embeddings.jsonl
  -> 写入 zvec index
  -> 查询时用 zvec Top K
  -> 注入 build-context
```

## 常见坑

### 不要混用模型

同一个索引里，document 和 query 必须使用同一个 embedding 模型。

不能：

```text
入库用 text-embedding-v4
查询用本地 0.6B
```

也不能：

```text
入库用 8B
查询用 4B
```

这会变成两套不同坐标系。

### 不要随便换维度

同一个索引里维度必须一致。

如果一开始用 1024 维，后面改成 2048 维，需要重建索引。

### 不要提交 embedding 结果

`embeddings.jsonl` 和 zvec index 都是派生文件。

它们可以重建，不应该进 GitHub 私有库。

应该只备份源文件：

```text
memory.zh-CN.md
events.jsonl
summaries
daily-reviews
```

### 不要把原始会话全部入库

第一版先不要做。

原始会话可以以后作为冷备或追溯来源，但不应该直接参与第一版语义检索。

### 不要把 key 写进脚本

脚本里只读：

```text
process.env.DASHSCOPE_API_KEY
```

没有 key 就报错退出。

## 额度够不够

你现在有 100 万 token 额度。

当前只有几百个 chunk，足够测试。

第一轮实验消耗通常不会大。

真正要注意的是：

- 不要反复全量跑
- 支持断点续跑
- 已经 embedding 的 chunk 不重复调用

后续脚本应该通过 `id` 和 `model/dimension` 判断是否已有结果。

## 第一版成功标准

不要追求完美。

第一版只要做到：

- 能从 chunk 生成 embedding
- 能把 query 也生成 embedding
- 能用余弦相似度找 Top 5
- 10 个测试问题里 7 个以上命中相关记忆

就算成功。

成功后再接 zvec。

## 推荐顺序

下午如果要试，按这个顺序：

```text
1. 配 DASHSCOPE_API_KEY
2. 重新跑 zvec-build-corpus.mjs
3. 写 dashscope-embed-corpus.mjs
4. 写 dashscope-query-eval.mjs
5. 跑 10 个测试问题
6. 看结果
7. 再决定要不要接 zvec
```

不要一口气把 cron、zvec、自动注入都接上。

先把最小闭环跑通。

## 参考资料

- [阿里云百炼：向量化 Embedding](https://help.aliyun.com/zh/model-studio/embedding)
- [阿里云百炼：通用文本向量同步接口 API](https://help.aliyun.com/zh/model-studio/text-embedding-synchronous-api)
- [Alibaba Cloud Model Studio: Embedding](https://www.alibabacloud.com/help/en/model-studio/embedding)
