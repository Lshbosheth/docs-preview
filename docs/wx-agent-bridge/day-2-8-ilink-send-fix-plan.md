# Day 2.8 iLink 发送接口修正计划

## 背景

Day 2.6 长轮询已经验证：

```text
POST https://ilinkai.weixin.qq.com/ilink/bot/getupdates
```

可以用 cc-connect 现有 `account_id/token` 请求成功。

但当前发送接口按推测实现为：

```text
POST https://ilinkai.weixin.qq.com/ilink/bot/send
```

实测返回：

```text
404 Not Found
```

说明发送 endpoint 或请求 body 不对。

## 目标

Day 2.8 只做一件事：

```text
找出并修正 iLink 文本发送接口
```

最终要实现：

```text
模拟一条 iLink 入站 /status
  -> Pipeline 生成状态文本
  -> ILinkSender 真实发回微信
  -> 微信能收到消息
```

## 不做事项

```text
不做扫码登录
不做图片
不做语音
不做文件
不做数据库
不做管理后台
不做模型链路改造
不做多进程
```

## 已知可用配置

从 cc-connect 现有配置中复用：

```text
base_url = https://ilinkai.weixin.qq.com
cdn_base_url = https://novac2c.cdn.weixin.qq.com/c2c
account_id = xxx@im.bot
token = xxx@im.bot:xxxxx
allow_from = xxx@im.wechat
```

## 当前测试结果

成功：

```text
GET /ilink/auth/status
POST /ilink/poll-once
POST /ilink/bot/getupdates
```

失败：

```text
POST /ilink/bot/send -> 404
```

## 推荐排查方向

### 1. 查 cc-connect 行为

优先通过以下方式确认真实发送接口：

```text
cc-connect 日志
cc-connect 文档
cc-connect 二进制字符串
网络抓包
请求代理日志
```

cc-connect 是 Go 二进制，源码不可直接读，但可以从运行日志和网络请求观察。

### 2. 在 ILinkClient 集中试探

所有发送 endpoint 试探都必须集中在：

```text
src/platform/weixin/ilink/ilink.client.ts
```

不要把试探逻辑散落到 Adapter 或 Controller。

### 3. 添加可配置 endpoint

为避免硬编码，配置中增加：

```yaml
send_endpoint: /ilink/bot/sendmessage
```

或：

```yaml
send_text_endpoint: /ilink/bot/sendtext
```

这样后续可以只改配置。

## 建议实现

### 配置新增

```yaml
ilink:
  send_text_endpoint: /ilink/bot/sendtext
```

如果为空，则使用默认候选列表探测：

```text
/ilink/bot/sendtext
/ilink/bot/sendmessage
/ilink/bot/send_msg
/ilink/bot/message/send
/ilink/bot/send
```

### 发送请求候选 body

因为真实字段未确认，先集中兼容几种 body。

候选 A：

```json
{
  "account_id": "xxx@im.bot",
  "to_user": "xxx@im.wechat",
  "chat_id": "xxx@im.wechat",
  "content": "hello"
}
```

候选 B：

```json
{
  "account_id": "xxx@im.bot",
  "receiver": "xxx@im.wechat",
  "content": "hello",
  "msg_type": "text"
}
```

候选 C：

```json
{
  "account_id": "xxx@im.bot",
  "to": "xxx@im.wechat",
  "text": "hello"
}
```

不要无限爆破。只做有限候选，并把失败原因记录清楚。

## 新增测试接口

为了不依赖真实入站消息，新增：

```text
POST /ilink/send-test
```

请求：

```json
{
  "to_user": "xxx@im.wechat",
  "content": "测试消息"
}
```

流程：

```text
直接调用 ILinkSender.sendText()
```

返回：

```json
{
  "ok": true
}
```

失败时：

```json
{
  "ok": false,
  "error": "status/body"
}
```

## 验收标准

```text
1. npm run build 通过。
2. GET /ilink/auth/status 仍然可用。
3. POST /ilink/poll-once 仍然可用。
4. POST /ilink/send-test 能真实发微信文本。
5. 模拟 /ilink/webhook 入站 /status 后，微信能收到状态回复。
6. token 不打印到日志。
7. 发送 endpoint 和 body 集中在 ILinkClient 管理。
```

## 完成后的状态

Day 2.8 完成后，微信闭环应达到：

```text
iLink 长轮询能收消息
iLink 能发文本回复
Pipeline 能处理命令/聊天/任务
```

这时才算真正进入“微信可用”。
