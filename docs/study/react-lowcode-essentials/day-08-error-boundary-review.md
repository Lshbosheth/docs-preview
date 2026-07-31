---
title: Day 8 - 错误边界与课程收尾
---

# Day 8：错误边界——组件崩了只崩一小块 + 全课复盘

## 今天完成什么

1. 搞懂"错误边界（Error Boundary）"是什么、为什么必须用 class 组件写
2. 给预览区包一个错误边界：里面的组件崩了，只崩那一小块，还能"重试"
3. 全课程复盘：8 天你到底补齐了哪些能力

## 接在昨天哪里

到 Day 7，你的预览区会实时渲染用户配的组件。但只要那段配置/组件代码有 bug（比如访问了 `undefined.xxx`），React 默认行为是——**整个应用白屏崩溃**。

低代码平台里这特别致命：用户在预览区随便配点东西就可能触发渲染错误，总不能一崩就整站白屏。我们要的是：**预览区崩了，就那一块显示"这里出错了 + 重试"，左边配置面板、顶部导航全都照常用。**

这就是**错误边界**的活儿。

## 核心概念

### 1. 错误边界是什么

错误边界是一种特殊组件，它能**捕获子组件树渲染时抛出的错误**，然后显示一个"备用 UI"，而不是让错误冒泡上去炸掉整个应用。

类比：它像电路里的**保险丝**。某个电器短路，跳的是那一路的闸，不会把整栋楼的电全掐了。

### 2. 为什么必须用 class 组件

这是全课唯一要写 class 组件的地方。因为捕获错误依赖两个**生命周期方法**，目前**没有等价的 Hook**：

- `static getDerivedStateFromError(error)`：捕获到错误后，返回新 state（用来切到"出错 UI"）
- `componentDidCatch(error, info)`：拿到错误详情，适合上报日志

函数组件 + Hook 暂时做不了这件事，所以错误边界只能是 class。**记住这一个例外就行，其它照样全用函数组件。**

### 3. 它能抓什么、不能抓什么

**能抓**：子组件**渲染期间**、生命周期里、构造函数里抛的错。

**抓不到**：

- 事件处理函数里的错（那个用普通 `try/catch`）
- 异步代码里的错（`setTimeout`、Promise —— 用 Day 7 的 error 态处理）
- 服务端渲染的错
- 错误边界**自己**抛的错

一句话：它专治"渲染时炸了"，其它类型的错各有各的招。

## 动手前的目录

今天新增：

```text
src/
└─ components/
   └─ ErrorBoundary.tsx    # 错误边界组件（class） [新增]
```

修改：

```text
src/
└─ components/
   └─ PreviewPanel.tsx     # 用错误边界包住预览内容 [修改]
```

## 分步实现

### 第 1 步：写错误边界组件

新建 `src/components/ErrorBoundary.tsx`：

```tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  // 允许自定义出错时显示什么；不传就用默认 UI
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  // 子树渲染抛错时被调用，返回值合并进 state → 触发重渲染切到出错 UI
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // 适合在这里做错误上报
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('预览区渲染出错:', error, info.componentStack);
    // 真实项目里这里可以上报到监控平台（Sentry 等）
  }

  // 重置：清掉错误状态，重新尝试渲染子树
  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 有自定义 fallback 就用它，否则用默认出错 UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div style={{ padding: 16, border: '1px solid #f5c2c7', background: '#fff5f5', borderRadius: 8 }}>
          <p style={{ color: '#d32f2f', margin: 0 }}>⚠️ 这块组件渲染出错了</p>
          <pre style={{ fontSize: 12, color: '#a94442', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <button onClick={this.reset}>重试</button>
        </div>
      );
    }

    // 没出错：正常渲染子树
    return this.props.children;
  }
}
```

> 三个要点：`getDerivedStateFromError` 负责"切到出错状态"，`componentDidCatch` 负责"记录/上报"，`reset` 负责"清错重试"。这就是错误边界的全部套路。

### 第 2 步：用它包住预览区

改 `PreviewPanel.tsx`（或你渲染预览的地方），把真正渲染用户组件的部分包进 `ErrorBoundary`：

```tsx
import { ErrorBoundary } from './ErrorBoundary';
import { useConfig } from '../context/ConfigContext';

export function PreviewPanel() {
  const { config } = useConfig();

  return (
    <div className="preview-panel">
      <h3>实时预览</h3>
      <ErrorBoundary>
        {/* 这里面是可能出错的渲染 */}
        <InfoCardPreview config={config} />
      </ErrorBoundary>
    </div>
  );
}
```

现在 `InfoCardPreview` 里哪怕抛错，也只有 `ErrorBoundary` 那一小块变成出错 UI，外面的 `<h3>实时预览</h3>`、以及页面其它区域全都不受影响。

### 第 3 步：让重试真的有用（key 强制重挂载）

有个细节：点"重试"清了错误状态，但如果**导致出错的配置没变**，重新渲染还是会立刻再崩。

一个实用技巧：给错误边界一个随配置变化的 `key`。配置一变，React 会把错误边界整个**重新挂载**（key 变 = 新组件），错误状态自然重置——相当于"改对了配置就自动恢复"：

```tsx
import { useMemo } from 'react';

export function PreviewPanel() {
  const { config } = useConfig();

  // 用配置的 JSON 当 key：配置变了，错误边界重新挂载
  const configKey = useMemo(() => JSON.stringify(config), [config]);

  return (
    <div className="preview-panel">
      <h3>实时预览</h3>
      <ErrorBoundary key={configKey}>
        <InfoCardPreview config={config} />
      </ErrorBoundary>
    </div>
  );
}
```

> 手动"重试"按钮 + 配置变化自动重挂载，两条恢复路径都有了，体验就完整了。

### 第 4 步：造个错误验证一下

临时在 `InfoCardPreview` 里加一段"故意崩溃"，确认边界真的兜住了：

```tsx
function InfoCardPreview({ config }: { config: Config }) {
  // 临时测试：标题写成 "boom" 时故意抛错
  if (config.title === 'boom') {
    throw new Error('测试：预览渲染崩溃');
  }
  // ...正常渲染
}
```

把标题改成 `boom`，预览区应该显示出错 UI，而不是整页白屏。验证完删掉这段测试代码。

## 完整代码

今天文件清单：

1. **新增** `src/components/ErrorBoundary.tsx`（第 1 步完整代码）
2. **修改** `src/components/PreviewPanel.tsx`（第 2、3 步）

## 运行效果

1. 正常配置，预览区正常渲染
2. 把标题改成 `boom`（第 4 步的测试）→ **只有预览区**变成"⚠️ 这块组件渲染出错了 + 重试"，配置面板和顶部导航照常
3. 把标题改回正常 → 预览区自动恢复（key 重挂载）
4. 打开控制台，能看到 `componentDidCatch` 打的错误日志
5. 删掉测试代码，收工

## 常见错误

### 错误 1：错误边界没生效，还是整页崩

**原因**：把错误边界写成了函数组件，或者出错的代码不在它的子树里。

**解决**：错误边界**必须是 class 组件**（有那两个生命周期）；确认可能出错的组件确实被它 `children` 包住。

### 错误 2：事件里的错没被抓到

**原因**：错误边界抓不到事件处理函数里的错（核心概念第 3 点）。

**解决**：事件里的错用普通 `try/catch`；异步错用 Day 7 的 error 态。别指望错误边界包打天下。

### 错误 3：点了重试立刻又崩

**原因**：导致崩溃的配置没变，重新渲染又走到出错代码。

**解决**：用第 3 步的 `key={configKey}`，让配置变化自动重挂载；或在重试前先引导用户改配置。

### 错误 4：`getDerivedStateFromError` 写成了实例方法

**原因**：漏了 `static`。它必须是**静态**方法。

**解决**：写成 `static getDerivedStateFromError(error) {...}`。

## 动手改一改

1. **全局兜底边界**：在 `App` 最外层再套一个 `ErrorBoundary`，作为"整站最后一道防线"（页面级出错时显示"应用出错了"）
2. **错误上报**：在 `componentDidCatch` 里把错误信息存进 localStorage 或打到一个数组，做个简单的"错误日志"面板
3. **react-error-boundary 库**：了解 `react-error-boundary` 这个库，它用 Hook 友好的 API 封装了错误边界（但底层还是 class），看看它比手写方便在哪

---

## 全课程复盘

八天走完，回头看看你补齐了什么。

### 三个阶段回顾

**阶段一：副作用与引用（Day 1–3）**

| Day | 学了 | 项目里的体现 |
|-----|------|-------------|
| 1 | `useEffect` 入门、惰性初始化 | 配置自动保存到 localStorage |
| 2 | 依赖数组、清理函数、防抖 | 防抖保存 + "已保存"提示 |
| 3 | `useRef`（DOM + 可变值） | 新增字段自动聚焦、跳过首次 effect |

**阶段二：状态升级（Day 4–5）**

| Day | 学了 | 项目里的体现 |
|-----|------|-------------|
| 4 | `useReducer` | 配置变更收敛进 reducer |
| 5 | `useContext` | 干掉 props 透传，任意组件取配置 |

**阶段三：多页面与数据（Day 6–8）**

| Day | 学了 | 项目里的体现 |
|-----|------|-------------|
| 6 | React Router | 列表页 + 编辑页，URL 直达 |
| 7 | 异步数据四态 + 竞态 | 列表从 mock API 拉，四态齐全 |
| 8 | Error Boundary | 预览区崩溃隔离 |

### 你现在掌握的完整 Hook 地图

```text
基础课已会：useState、useMemo、useCallback、自定义 Hook
本课补齐：  useEffect、useRef、useReducer、useContext
配套能力：  React Router、异步数据处理、错误边界
```

这套组合，已经足够你独立写一个**结构清晰的真实中小型 React 应用**了。

### 从"会写页面"到"能写应用"

回头对比一下心态的变化：

- 学前：只会"数据 → 渲染"，一遇到副作用/多页面/异步就卡住
- 学后：会管副作用、会组织状态、会做多页面、会处理异步的各种状态、会隔离错误

**这正是从"会用 React 语法"到"会用 React 做事"的跨越。**

### 接下来去哪

参考你文档站里的两份规划：

1. **《React 低代码进阶系列总规划》**——状态管理库、Schema 驱动、数据源、拖拽、部署，一步步把低代码平台做深
2. **《React 低代码进阶 · 自定义组件设计》**——动态编译、沙箱、版本管理，那门更硬核，等这门消化透了再上

短期建议：把这 8 天的功能，在你自己的 InfoCard 项目里**真的都跑通一遍**，别只看不写。哪天能不看文档、凭手感把这套搭出来，你就出师了。

## 验收清单（本课）

- [ ] 写了 class 版 `ErrorBoundary`，含两个生命周期方法
- [ ] 预览区被错误边界包住，崩溃只影响局部
- [ ] 有"重试"按钮，且配置变化能自动恢复
- [ ] 能说清错误边界"能抓渲染错、抓不到事件/异步错"
- [ ] 明白"错误边界为什么只能用 class"
- [ ] （回顾）能说出 8 天补齐的 4 个核心 Hook

## 今日总结

### 学到了什么

1. **错误边界**：捕获子树渲染错误，显示备用 UI，隔离崩溃
2. **两个生命周期**：`getDerivedStateFromError`（切状态）、`componentDidCatch`（上报）
3. **class 组件的唯一场景**：错误边界（其余全用函数组件）
4. **能抓/抓不到**：渲染错能抓，事件/异步错另想办法
5. **key 重挂载**：配置变化自动恢复的实用技巧

### 关键代码

```tsx
static getDerivedStateFromError(error) {
  return { hasError: true, error };
}
componentDidCatch(error, info) {
  console.error(error, info.componentStack);
}
```

---

**🎉 恭喜，笨蛋！《React 低代码核心补全课》全部学完。基础课那几个大窟窿，你亲手补上了。现在的你，已经能写像样的真实 React 应用了——去把 InfoCard 项目跑通，然后骄傲地开下一门课。**

<ProgressButton courseId="react-lowcode-essentials" dayId="day-08-error-boundary-review" />
