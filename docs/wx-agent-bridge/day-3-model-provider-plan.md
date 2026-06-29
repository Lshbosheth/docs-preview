# Day 3 模型 Provider 和 Chat Layer 计划

## 目标

Day 3 做模型接入，但只接 Chat Layer。

```text
配置读取模型
ProviderFactory 创建模型客户端
普通文本进入 Chat Layer
Chat Layer 调模型返回回复
命令仍然不调用模型
```

## 不做事项

```text
不做 Planner
不做 TaskSchema
不做 Guard
不做 Executor
不做工具调用
不执行 Shell
不读写文件
不接数据库
```

## 新增模块

```text
src/llm/
  llm.module.ts
  types.ts
  base-llm.provider.ts
  openai-compatible.provider.ts
  provider-factory.service.ts

src/chat/
  chat.module.ts
  chat.service.ts
```

## 核心流程

```text
普通文本
  -> PipelineService.handleNormalizedMessage()
  -> CommandRouter 判断不是命令
  -> ChatService.reply()
  -> chatModel.chat()
  -> ResponseBuilder / PipelineResult
```

## Provider 接口

统一接口：

```ts
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export interface LLMProvider {
  chat(messages: ChatMessage[], options: ChatOptions): Promise<string>;
}
```

## 配置要求

继续使用：

```yaml
providers:
  qwen:
    type: openai_compatible
    api_key: ${QWEN_API_KEY}
    base_url: https://dashscope.aliyuncs.com/compatible-mode/v1

projects:
  - name: default
    models:
      chat:
        provider: qwen
        model: qwen-plus
        temperature: 0.7
        max_tokens: 2000
```

## Chat Layer Prompt

第一版系统提示词：

```text
你是微信 AI Agent Bridge 的聊天层。
你只负责普通聊天、简单问答、命令说明和状态说明。
你不能执行任务。
你不能调用工具。
你不能访问文件。
你不能访问网络。
如果用户请求明显是开发任务、代码生成、SQL 生成、复杂计划，请提示该请求应交给后续任务流程处理。
```

## 验收标准

```text
1. /status 仍然走 CommandRouter，不调用模型。
2. 普通文本会调用 chatModel。
3. 只改 config.yaml 可以切换 chat provider/model。
4. QWEN_API_KEY 缺失时，普通聊天返回清晰错误，不影响 /status。
5. Day 1 mock、Day 2 微信、Day 2.5 iLink 入口仍然可用。
```

## 完成后的状态

Day 3 完成后，系统具备：

```text
命令走本地
普通聊天走模型
模型供应商可配置
业务流程不写死具体模型
```
