---
title: Day 2 - useEffect 进阶：依赖、清理与防抖保存
---

# Day 2：useEffect 进阶——依赖、清理与防抖保存

## 今天完成什么

1. 讲透依赖数组的三种写法，知道各自什么行为
2. 理解清理函数（`return`）是干嘛的、什么时候跑
3. 用"防抖保存"优化 Day 1：停止输入 500ms 后才写盘
4. 加一个"未保存 / 已保存"状态提示

## 接在昨天哪里

昨天做了自动保存：`config` 一变就 `saveConfig`。功能是对的，但有个毛病——

**你每敲一个字，就写一次盘。** 输入标题"测试标题"四个字，写了四次 localStorage。数据量小时无所谓，但这是个坏习惯：真实项目里如果每次改动都发一次请求，服务器要哭了。

今天用**防抖**修它：连续输入时不写，等你停下来 500ms 再写一次。要做到这个，得先把 `useEffect` 的依赖数组和清理函数彻底搞明白。

## 核心概念

### 1. 依赖数组的三种写法

这是 `useEffect` 最容易搞混的地方，一次说清：

**① 不写依赖数组**——每次渲染后都执行

```typescript
useEffect(() => {
  console.log('每次渲染后都跑');
}); // 没有第二个参数
```

**② 空数组 `[]`**——只在首次渲染后执行一次

```typescript
useEffect(() => {
  console.log('只在挂载时跑一次');
}, []); // 空数组
```

常用于：初始化、只订阅一次、进页面只拉一次数据。

**③ 有依赖 `[x, y]`**——首次执行 + 依赖变化时执行

```typescript
useEffect(() => {
  console.log('x 或 y 变了就跑');
}, [x, y]);
```

昨天的 `[config]` 就是这种。

> 一句话记：**依赖数组 = "这些东西变了，才需要重新做一次副作用"的清单。**

### 2. 清理函数：effect 的"善后"

`useEffect` 里 `return` 一个函数，这个函数叫**清理函数**：

```typescript
useEffect(() => {
  const timer = setInterval(() => console.log('tick'), 1000);

  // 清理函数：善后
  return () => {
    clearInterval(timer);
  };
}, []);
```

清理函数什么时候跑？两个时机：

1. **组件卸载时**（比如切走了这个页面）
2. **下一次 effect 执行之前**（依赖变了，先清掉上一次的，再跑新的）

不写清理，就会：定时器越堆越多、事件重复订阅、内存泄漏。

### 3. 防抖的原理

防抖（debounce）= "你一直在动，我就一直等；你停下来超过 N 毫秒，我才动手"。

用 `setTimeout` + 清理函数实现，思路：

```text
config 变了 → 起一个 500ms 的定时器，准备保存
  ↓ 还没到 500ms，config 又变了
清理函数先把上一个定时器取消 → 再起一个新的 500ms 定时器
  ↓ 这次 500ms 内没再变
定时器触发 → 真正保存
```

**关键就是"清理函数取消上一个定时器"**——这正是清理函数的经典用法。

### 4. 一个必须避开的坑：死循环

```typescript
// ❌ 死循环！
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(count + 1); // effect 里改了 count
}, [count]);           // count 又是依赖 → 改了就重跑 → 又改 → 无限循环
```

记住：**effect 里改的 state，别再放进它自己的依赖数组**，否则容易转不停。

## 动手前的目录

今天会新增：

```text
src/
└─ hooks/
   └─ useDebouncedEffect.ts    # 防抖版 effect [新增]
```

还会修改：

```text
src/
└─ components/
   └─ LowCodeConfigPage.tsx    # 改用防抖保存 + 状态提示 [修改]
```

## 分步实现

### 第 1 步：写一个防抖 Hook

把"防抖执行副作用"的逻辑抽成自定义 Hook（基础课 Day 10 学过自定义 Hook）。

新建 `src/hooks/useDebouncedEffect.ts`：

```typescript
import { useEffect } from 'react';

/**
 * 防抖版 useEffect
 * 依赖变化后，等待 delay 毫秒；期间若又变化，则重新计时。
 *
 * @param effect 要执行的副作用
 * @param deps   依赖数组
 * @param delay  防抖延迟（毫秒）
 */
export function useDebouncedEffect(
  effect: () => void,
  deps: React.DependencyList,
  delay: number
): void {
  useEffect(() => {
    // 起一个定时器，delay 后执行副作用
    const timer = setTimeout(() => {
      effect();
    }, delay);

    // 清理函数：依赖再次变化时，先取消上一个定时器
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
```

> 注意清理函数 `clearTimeout(timer)`——这就是防抖的灵魂：只要依赖在 delay 内又变了，上一个定时器会被取消，重新计时。

### 第 2 步：用防抖 Hook 替换自动保存

修改 `LowCodeConfigPage.tsx`。先加一个"保存状态"来做提示：

```typescript
import { useState } from 'react';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import { saveConfig, loadConfig } from '../utils/storage';

type SaveStatus = 'idle' | 'saving' | 'saved';
```

在组件里：

```typescript
const [config, setConfig] = useState<Config>(() => loadConfig() ?? defaultConfig);

// [新增] 保存状态
const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

// [修改] 把昨天的 useEffect 换成防抖保存
useDebouncedEffect(
  () => {
    saveConfig(config);
    setSaveStatus('saved');
  },
  [config],
  500 // 停止改动 500ms 后才保存
);
```

### 第 3 步：加"正在保存"的即时反馈

上面只有"已保存"，还缺"正在输入（未保存）"的提示。config 一变就先标记 `saving`，防抖结束再标 `saved`：

```typescript
import { useEffect } from 'react';

// [新增] config 一变，立刻标记"保存中"（这个 effect 不防抖，立即执行）
useEffect(() => {
  setSaveStatus('saving');
}, [config]);
```

于是两个 effect 配合：

```text
config 变 → 立即 setSaveStatus('saving')  （immediate effect）
         → 500ms 后 saveConfig + setSaveStatus('saved')  （debounced effect）
```

> 注意：初次挂载时这个 effect 也会跑一次，把状态设成 `saving`。想更严谨可以用 Day 3 的 `useRef` 跳过首次，今天先接受这个小瑕疵。

### 第 4 步：把状态显示到界面

在三栏页面顶部（或 JSON 预览区附近）加个小提示：

```tsx
{/* [新增] 保存状态提示 */}
<div style={{ fontSize: 12, color: '#999', padding: '4px 8px' }}>
  {saveStatus === 'saving' && '● 正在输入…'}
  {saveStatus === 'saved' && '✓ 已保存'}
  {saveStatus === 'idle' && ''}
</div>
```

## 完整代码

今天的文件：

1. **新增** `src/hooks/useDebouncedEffect.ts`（完整见第 1 步）
2. **修改** `src/components/LowCodeConfigPage.tsx`（关键片段）：

```typescript
import React, { useState, useEffect } from 'react';
import { Config } from '../types/config';
import { loadConfig, saveConfig } from '../utils/storage';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';

type SaveStatus = 'idle' | 'saving' | 'saved';

export function LowCodeConfigPage() {
  const [config, setConfig] = useState<Config>(() => loadConfig() ?? defaultConfig);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // config 一变，立即标记"保存中"
  useEffect(() => {
    setSaveStatus('saving');
  }, [config]);

  // 停止改动 500ms 后才真正写盘
  useDebouncedEffect(
    () => {
      saveConfig(config);
      setSaveStatus('saved');
    },
    [config],
    500
  );

  return (
    <div>
      <div style={{ fontSize: 12, color: '#999', padding: '4px 8px' }}>
        {saveStatus === 'saving' && '● 正在输入…'}
        {saveStatus === 'saved' && '✓ 已保存'}
      </div>
      {/* ...三栏 JSX 保持原样 */}
    </div>
  );
}
```

## 运行效果

1. 启动项目
2. 在标题输入框**连续快速打字**
3. **预期**：
   - 打字过程中，顶部显示"● 正在输入…"
   - 停手约 500ms 后，变成"✓ 已保存"
4. 打开 DevTools 的 Local Storage，观察写入次数——现在是"停手才写一次"，不再是每个字符写一次
5. 刷新页面，配置照样恢复（Day 1 的能力还在）

## 常见错误

### 错误 1：防抖没生效，还是每次都保存

**原因**：清理函数没写，或者没 `clearTimeout`。

**解决**：确认 `useDebouncedEffect` 里 `return () => clearTimeout(timer)`。没有它，旧定时器不会被取消，等于没防抖。

### 错误 2：一直显示"正在输入"，不变"已保存"

**原因**：防抖那个 effect 没执行到 `setSaveStatus('saved')`，可能 delay 依赖没对。

**解决**：检查 `useDebouncedEffect` 的依赖是 `[...deps, delay]`，effect 内部确实调了 `setSaveStatus('saved')`。

### 错误 3：页面疯狂重渲染 / 卡死

**原因**：effect 里改的 state 又进了依赖，死循环。

**解决**：回顾核心概念第 4 点。`setSaveStatus` 改的是 `saveStatus`，依赖里**不能**放 `saveStatus`，只放 `config`。

### 错误 4：ESLint 报 `exhaustive-deps` 警告

**原因**：`effect` 函数作为参数，ESLint 追踪不到内部依赖。

**解决**：`useDebouncedEffect` 里加了 `// eslint-disable-next-line`。理解它为什么被禁用，别养成到处禁用的习惯——这里是有意为之。

## 动手改一改

1. **可调延迟**：把 500ms 做成可配置，试试 200ms 和 2000ms 的手感差别
2. **保存失败态**：给 `SaveStatus` 加一个 `'error'`，`saveConfig` 抛错时显示"保存失败"
3. **离开提醒**：正在输入（`saving`）时，用 `beforeunload` 事件提醒"有未保存的更改"（提前体验一下事件订阅 + 清理）

## 验收清单

- [ ] 新建了 `useDebouncedEffect`，内部有 `setTimeout` + `clearTimeout`
- [ ] 自动保存改成了防抖，连续输入不频繁写盘
- [ ] 界面能显示"正在输入 / 已保存"
- [ ] 能说清依赖数组三种写法的区别
- [ ] 能说清清理函数的两个执行时机
- [ ] 知道"effect 里改的 state 别进依赖"这个死循环坑

## 今日总结

### 学到了什么

1. **依赖数组三种写法**：不写（每次）/ `[]`（一次）/ `[x]`（x 变时）
2. **清理函数**：卸载时、下次 effect 前执行，用来善后
3. **防抖**：`setTimeout` + 清理函数取消旧定时器
4. **死循环坑**：effect 改的 state 不要放进自己的依赖

### 关键代码

```typescript
useEffect(() => {
  const timer = setTimeout(effect, delay);
  return () => clearTimeout(timer); // 灵魂：取消上一个
}, [...deps, delay]);
```

### 今天的限制

- 新增字段/按钮时，输入框不会自动聚焦，得手动点
- "正在输入"提示首次挂载会误触发一下

### 明天做什么

Day 3 学 `useRef`：新增字段时自动聚焦到新输入框，还能优雅地跳过 effect 首次执行、保存定时器 id。

---

**`useEffect` 的核心（依赖 + 清理）今天啃完了。这是整门课最硬的地基，后面都建在它上面。**

<ProgressButton courseId="react-lowcode-essentials" dayId="day-02-useeffect-cleanup-debounce" />
