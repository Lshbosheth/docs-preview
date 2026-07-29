---
title: Day 1 - useEffect 入门：配置自动保存
---

# Day 1：useEffect 入门——配置自动保存

## 今天完成什么

1. 搞懂 `useEffect` 是什么、什么时候执行
2. 用 `useEffect` 把配置自动保存到 localStorage
3. 刷新页面后，配置还在（自动恢复）

## 接在昨天哪里

基础课做完，你有一个三栏配置页：左边组件列表，中间配置面板，右边实时预览 + JSON。

但有个尴尬的问题：**刷新页面，辛辛苦苦调的配置全没了。** 因为配置只存在 `useState` 里，一刷新就重置。

今天要解决它：配置一变就自动存起来，刷新后自动读回来。这就要用到基础课没讲过的 `useEffect`。

> 动手前：先把基础课 Day 12 的完整项目复制一份，确认能正常跑起来（三栏页面、改标题预览会变），我们在它上面继续加功能。

## 核心概念

### 1. 什么是"副作用"

React 组件的**主业**是：根据 state/props，返回要渲染的 JSX。这叫"纯渲染"。

但有些事不属于渲染，却又必须做：

- 把数据写进 localStorage
- 发请求拿数据
- 设一个定时器
- 手动改 DOM、订阅事件

这些"渲染之外、跟外部世界打交道"的操作，就叫**副作用（side effect）**。

副作用不能直接写在组件函数体里（那样每次渲染都会执行，还可能在渲染过程中制造混乱）。React 给了个专门的地方放它——`useEffect`。

### 2. useEffect 的基本结构

```typescript
useEffect(() => {
  // 副作用代码写这里（渲染完之后才执行）
}, [依赖1, 依赖2]);
```

- 第一个参数：一个函数，里面放副作用
- 第二个参数：**依赖数组**，告诉 React"这些值变了才重新执行"

### 3. 什么时候执行

关键记住一句话：**effect 在"渲染到屏幕之后"才执行。**

```text
state 变化
  ↓
组件重新渲染（算出新 JSX）
  ↓
浏览器把新画面画到屏幕
  ↓
useEffect 里的函数执行  ← 在这
```

### 4. 依赖数组决定"要不要再跑一次"

```typescript
useEffect(() => {
  console.log('config 变了');
}, [config]);   // 只有 config 变化时，才再执行
```

今天我们就用它：**盯住 config，config 一变就写进 localStorage。**

## 动手前的目录

今天会新增：

```text
src/
└─ utils/
   └─ storage.ts        # localStorage 读写封装 [新增]
```

还会修改：

```text
src/
└─ components/
   └─ LowCodeConfigPage.tsx   # 加自动保存 + 初始化读取 [修改]
```

## 分步实现

### 第 1 步：封装 localStorage 读写

直接用 `localStorage.setItem` 也行，但配置是对象，要 `JSON.stringify` / `JSON.parse`，还得处理出错。封装一下更省心。

新建 `src/utils/storage.ts`：

```typescript
import { Config } from '../types/config';

// 存储用的 key，改个版本号能一键作废旧数据
const STORAGE_KEY = 'lowcode-config-v1';

/**
 * 保存配置到 localStorage
 */
export function saveConfig(config: Config): void {
  try {
    const json = JSON.stringify(config);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

/**
 * 从 localStorage 读取配置
 * 读不到或解析失败时返回 null，让调用方决定用默认值
 */
export function loadConfig(): Config | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json) as Config;
  } catch (error) {
    console.error('读取配置失败:', error);
    return null;
  }
}
```

> `Config` 类型用你基础课 `src/types/config.ts` 里定义的那个，路径按你项目实际调整。

### 第 2 步：初始化时从 localStorage 读

找到基础课里管配置的那个 `useState`（在 `LowCodeConfigPage.tsx` 里，大概长这样）：

```typescript
// 基础课原来的写法
const [config, setConfig] = useState<Config>(defaultConfig);
```

改成**惰性初始化**——`useState` 传一个函数，只在首次渲染时执行一次：

```typescript
import { loadConfig, saveConfig } from '../utils/storage';

// [修改] 首次渲染时，优先读 localStorage，读不到才用默认配置
const [config, setConfig] = useState<Config>(() => {
  return loadConfig() ?? defaultConfig;
});
```

> 为什么传函数而不是 `loadConfig() ?? defaultConfig` 直接当参数？因为直接写的话，**每次渲染都会调用 `loadConfig()`**（虽然只有首次生效），白白读盘。传函数，React 只在首次执行它，更高效。这叫"惰性初始 state"。

### 第 3 步：用 useEffect 自动保存

在同一个组件里，加一个 `useEffect`，盯住 `config`：

```typescript
import { useEffect } from 'react';

// [新增] config 每次变化，自动写进 localStorage
useEffect(() => {
  saveConfig(config);
}, [config]); // 依赖 config：config 变了才重新保存
```

就这么简单。逻辑是：

```text
用户改配置 → setConfig → config 变化 → 组件重渲染
  → 渲染后 useEffect 检测到 config 变了 → saveConfig 写盘
```

## 完整代码

`src/components/LowCodeConfigPage.tsx` 顶部关键部分（其余基础课的代码保持不变）：

```typescript
import React, { useState, useEffect } from 'react';
import { Config } from '../types/config';
import { loadConfig, saveConfig } from '../utils/storage';
// ...其余 import 保持基础课原样

const defaultConfig: Config = {
  // ...基础课里原本的默认配置
};

export function LowCodeConfigPage() {
  // [修改] 惰性初始化：优先读本地存储
  const [config, setConfig] = useState<Config>(() => {
    return loadConfig() ?? defaultConfig;
  });

  // [新增] 自动保存：config 变了就写盘
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // ...下面渲染三栏的 JSX 保持基础课原样，
  //    把 config / setConfig 照旧传给子组件
  return (
    // ...
  );
}
```

外加新增文件 `src/utils/storage.ts`（见第 1 步完整代码）。

## 运行效果

1. 启动项目 `npm run dev`
2. 改一下配置：比如把卡片标题改成"测试标题"，加两个字段
3. **刷新页面**（F5）
4. **预期**：标题还是"测试标题"，字段也还在——配置被恢复了 ✅
5. 打开浏览器 DevTools → Application → Local Storage，能看到一条 `lowcode-config-v1`，值就是你的配置 JSON

## 常见错误

### 错误 1：刷新后配置没恢复

**原因**：`useState` 还是写死 `defaultConfig`，没走惰性初始化。

**解决**：确认写的是 `useState(() => loadConfig() ?? defaultConfig)`，注意是**传函数**。

### 错误 2：控制台警告 `useEffect` 缺少依赖

**原因**：依赖数组没把用到的值写全。

**解决**：effect 里用到了 `config`，依赖数组就得有 `[config]`。这门课后面会反复强调"依赖要写全"。

### 错误 3：localStorage 里存进去的是 `[object Object]`

**原因**：没 `JSON.stringify` 直接存了对象。

**解决**：用第 1 步封装好的 `saveConfig`，它内部做了 `stringify`。

### 错误 4：`JSON.parse` 报错，页面崩了

**原因**：localStorage 里有旧的、格式不对的数据。

**解决**：`loadConfig` 里用 try-catch 兜住（第 1 步已处理），出错返回 null 用默认配置。实在乱了就手动清 localStorage。

## 动手改一改

1. **清空按钮**：加一个"重置配置"按钮，点了清空 localStorage 并恢复默认配置
2. **保存时间**：每次保存时，在 localStorage 里也存一个 `savedAt` 时间戳，页面上显示"上次保存：xx:xx"
3. **多份配置**：试着用不同的 key 存两套配置，加个下拉切换（为后面多组件埋伏笔）

## 验收清单

- [ ] 新建了 `utils/storage.ts`，有 `saveConfig` / `loadConfig`
- [ ] `useState` 用了惰性初始化，从 localStorage 读初始值
- [ ] 加了 `useEffect(() => saveConfig(config), [config])`
- [ ] 改配置后刷新页面，配置能恢复
- [ ] Local Storage 里能看到 `lowcode-config-v1`
- [ ] 能讲清楚"effect 在渲染之后执行"

## 今日总结

### 学到了什么

1. **副作用**：渲染之外、跟外部世界打交道的操作
2. **`useEffect` 结构**：`useEffect(fn, deps)`
3. **执行时机**：渲染到屏幕之后
4. **依赖数组**：`[config]` 表示 config 变化才重新执行
5. **惰性初始 state**：`useState(() => ...)` 首次才执行

### 关键代码

```typescript
// 读：惰性初始化
const [config, setConfig] = useState(() => loadConfig() ?? defaultConfig);

// 写：副作用自动保存
useEffect(() => {
  saveConfig(config);
}, [config]);
```

### 今天的限制

- 每次改动**立刻**写盘，连续打字时写太频繁（性能浪费）
- 没有"正在保存 / 已保存"的反馈

### 明天做什么

Day 2 讲透依赖数组和清理函数，用"防抖"优化自动保存——停止输入 500ms 后才写盘，并加上"已保存"提示。

---

**基础课最大的窟窿开始补了！`useEffect` 是 React 的分水岭，今天只是开胃，明天更关键。**
