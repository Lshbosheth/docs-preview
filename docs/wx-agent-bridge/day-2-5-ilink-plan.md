# Day 2.5 iLink 微信接入计划

## 放在什么时候做

iLink 接入放在 Day 2 之后，Day 3 之前。

原因：

```text
Day 1：先证明 Pipeline 能跑
Day 2：先证明 WeixinClient / WeixinAdapter 抽象成立
Day 2.5：把微信入口实现替换成 iLink
Day 3：再接模型 Provider 和 Chat Layer
```

不要一开始就把 iLink、模型、Planner、Guard 混在一起做。

## 目标

Day 2.5 只做一件事：

```text
通过 iLink 收微信文本消息
通过 iLink 发微信文本回复
复用 Day 2 已有 Pipeline
```

核心链路：

```text
iLink 收消息
  -> ILinkClient
  -> ILinkMessageMapper
  -> NormalizedMessage
  -> PipelineService.handleNormalizedMessage()
  -> PipelineResult.replyText
  -> ILinkSender
  -> 微信回复
```

## 不做事项

```text
不接大模型
不做 Planner
不做 TaskSchema
不做 Guard
不做 Executor
不做数据库
不做 Redis
不做多进程
不做图片、语音、文件
不做群复杂权限
```

## 推荐模块

如果 Day 2 已经有：

```text
src/platform/weixin/
  weixin.client.ts
  weixin.adapter.ts
  weixin.sender.ts
```

Day 2.5 建议新增 iLink 实现，不要直接把逻辑写死在 WeixinClient 里：

```text
src/platform/weixin/ilink/
  ilink.module.ts
  ilink.client.ts
  ilink.adapter.ts
  ilink.sender.ts
  ilink-message.mapper.ts
  types.ts
```

后续可以通过配置选择：

```yaml
platform:
  type: weixin
  driver: ilink
```

## 配置建议

`config.yaml` 增加：

```yaml
projects:
  - name: default
    platform:
      type: weixin
      driver: ilink
      ilink:
        base_url: ${ILINK_BASE_URL}
        token: ${ILINK_TOKEN}
        bot_id: ${ILINK_BOT_ID}
        poll_interval_ms: 3000
```

如果 iLink 是 Webhook 模式，则增加：

```yaml
        mode: webhook
        webhook_path: /ilink/webhook
```

如果 iLink 是轮询模式，则增加：

```yaml
        mode: polling
```

## 两种接入方式

### 方式 1：Webhook

适合 iLink 主动推送消息给本服务。

新增接口：

```text
POST /ilink/webhook
```

流程：

```text
iLink -> /ilink/webhook -> Pipeline -> iLink send message
```

优点：

```text
实时
不用轮询
资源占用低
```

### 方式 2：Polling

适合 iLink 需要我们主动拉取消息。

新增方法：

```ts
ILinkAdapter.pollOnce()
```

流程：

```text
定时 getUpdates -> Pipeline -> sendText
```

优点：

```text
本地调试简单
跟 Day 2 的抽象一致
```

## Day 2.5 验收标准

必须满足：

```text
1. iLink 文本消息能进入系统。
2. iLink 消息能转成 NormalizedMessage。
3. iLink 发送 /help，可以收到帮助。
4. iLink 发送 /status，可以收到状态。
5. iLink 发送普通文本，可以收到固定回复。
6. 重复 message_id 不重复处理。
7. Day 1 的 /mock/message 仍然可用。
8. Day 2 的通用 Weixin 抽象没有被破坏。
```

## 完成后的状态

Day 2.5 完成后，项目就具备真实微信通道：

```text
mock 消息可测
iLink 微信可收
iLink 微信可回
Pipeline 统一
命令系统可用
```

然后再进入 Day 3：模型 Provider 和 Chat Layer。
