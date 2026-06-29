# Day 2 微信入口计划

## 目标

Day 2 只做真实微信入口闭环。

```text
微信消息进来
转成 NormalizedMessage
进入 Day 1 已有 Pipeline
拿到 PipelineResult
把 replyText 发回微信
重复 message_id 不重复处理
```

## 前置条件

Day 1 已完成：

```text
NestJS 服务能启动
config.yaml 能读取
POST /mock/message 可用
/help、/status、/model、/mode、/dir 可用
普通文本返回固定回复
```

## Day 2 不做事项

```text
不接大模型
不做 Planner
不做 TaskSchema
不做 Guard
不做 Executor
不做数据库
不做 Redis
不做多进程
不做 Web 管理后台
不支持图片、语音、文件
```

## 新增模块

```text
src/platform/
  platform.module.ts

src/platform/weixin/
  weixin.module.ts
  weixin.client.ts
  weixin.adapter.ts
  weixin.sender.ts
  weixin-message.mapper.ts
  types.ts
```

## 核心流程

```text
WeixinAdapter.poll()
  -> WeixinClient.getUpdates()
  -> message_id 去重
  -> WeixinMessageMapper.toNormalizedMessage()
  -> PipelineService.handleNormalizedMessage()
  -> WeixinSender.sendText()
```

如果 Day 1 的 `PipelineService` 只有 `handle(rawMessage)`，Day 2 建议增加：

```ts
handleNormalizedMessage(message: NormalizedMessage): Promise<PipelineResult>
```

这样 mock 和微信都能复用同一条主流程。

## 配置扩展

继续使用 `config.yaml` 里的平台配置：

```yaml
platform:
  type: weixin
  token: ${WEIXIN_TOKEN}
  base_url: ${WEIXIN_BASE_URL}
```

Day 2 不要求真正兼容所有微信协议，只需要按当前可用接口封装：

```text
GET /updates 或 POST /updates
POST /send
```

如果真实微信桥接接口还没确定，先保留 `WeixinClient` 抽象，并支持手动调用测试接口模拟微信。

## 去重策略

Day 2 先用内存 Set：

```ts
private readonly processedMessageIds = new Set<string>();
```

规则：

```text
message_id 已存在 -> 跳过
message_id 不存在 -> 处理并加入 Set
```

后续再换 SQLite 或 Redis。

## 验收标准

必须满足：

```text
1. 微信文本消息能进入系统。
2. 微信发送 /help，能收到帮助回复。
3. 微信发送 /status，能收到状态回复。
4. 微信发送普通文本，能收到固定回复。
5. 重复 message_id 只处理一次。
6. 控制台能看到微信消息进入、处理、发送回复的日志。
7. Day 1 的 /mock/message 仍然可用。
```

## 测试用例

### 用例 1：微信帮助命令

输入：

```text
/help
```

期望：

```text
微信收到可用命令列表。
```

### 用例 2：微信状态命令

输入：

```text
/status
```

期望：

```text
微信收到当前项目、模型、模式、工作目录。
```

### 用例 3：微信普通消息

输入：

```text
你好
```

期望：

```text
微信收到：收到：你的消息已进入 wx-agent-bridge。
```

### 用例 4：重复消息

输入：

```text
同一个 message_id 进入两次。
```

期望：

```text
只回复一次。
日志记录 duplicate message。
```

## 完成后的状态

Day 2 完成后，项目已经具备：

```text
真实平台入口
统一 Pipeline
命令回复
文本回复
消息去重
```

下一步再进入 Day 3：模型 Provider 和 Chat Layer。
