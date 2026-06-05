# Go 学习启动计划

> 目标：先用 Go 写出能跑的小工具，再慢慢补语言细节。
> 当前节奏：2026-06-05 到 2026-06-07 先预习，2026-06-08 周一开始写代码。

## 结论

现在先学 Go，不急着碰 Rust。

Go 更适合当前的微信桥、`cc-connect`、本地服务、CLI 工具、定时任务和小型后端能力建设。第一阶段不要追求“系统学完”，只追求写出一个能运行、能被自己继续改的小工具。

## 推荐资料

### 1. 官方 Getting Started

链接：<https://go.dev/doc/tutorial/getting-started>

用途：安装 Go、创建项目、运行第一个程序。

先把这一步跑通，不要跳过。能在本地执行 `go run .`，才算真正开始。

### 2. A Tour of Go

链接：<https://go.dev/tour/>

用途：快速熟悉 Go 的基础语法。

优先看这些：

- 变量、函数、流程控制
- slice、map
- struct
- interface
- error
- package 和 import

并发部分可以先看个大概，不用第一轮硬啃。

### 3. Go by Example

链接：<https://gobyexample.com/>

用途：写代码时查具体例子。

优先翻这些主题：

- variables
- functions
- structs
- errors
- json
- files
- command-line flags
- http clients

### 4. Learn Go with Tests

链接：<https://quii.gitbook.io/learn-go-with-tests>

用途：下周真正写代码时，用测试带着学。

这份资料适合边写边验证，尤其适合以后写 CLI、任务调度、消息发送这类小工具。

### 5. Effective Go

链接：<https://go.dev/doc/effective_go>

用途：写了几天之后再看，学习更像 Go 的写法。

不要第一天就硬读完。它更像风格和工程经验，不是入门第一课。

## 周末预习安排

### 2026-06-05 周五

只做一件事：

- 安装 Go
- 跑通官方 Getting Started
- 确认能执行 `go version` 和 `go run .`

如果只完成这一步，也算赢。

### 2026-06-06 周六

看 A Tour of Go 前半部分：

- basics
- functions
- methods
- structs
- interfaces
- errors

不要追求全记住。目标只是让语法眼熟。

### 2026-06-07 周日

翻 Go by Example：

- json
- files
- command-line flags
- errors

顺手想一下下周要写的小工具长什么样，但不要写宏伟计划。

## 下周一开始写代码

从 2026-06-08 周一开始，写一个很小的项目：

## Go 版提醒小工具 MVP

第一版只做三件事：

1. 从命令行接收一句提醒文案
2. 打印出来，或者写进 JSON 文件
3. 后续再接 `cc-connect send`

第一版不做：

- GUI
- 数据库
- 多用户
- 完整调度系统
- 复杂配置

## 第一周目标

第一周只证明一件事：

> 可以用 Go 写出一个能跑、能改、能继续扩展的小工具。

建议每天 20 到 30 分钟：

- 第 1 天：创建项目，接收命令行参数
- 第 2 天：写 JSON 文件
- 第 3 天：读取 JSON 文件
- 第 4 天：封装成函数，补一个测试
- 第 5 天：预留 `cc-connect send` 调用接口

## 保底规则

如果当天状态不好，只做保底：

```powershell
go version
go run .
```

或者只看一个 Go by Example 小例子。

学习不要靠热血，靠不断线。
