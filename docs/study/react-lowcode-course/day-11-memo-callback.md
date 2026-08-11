---
title: Day 11 - useCallback + React.memo 性能优化
---

# Day 11：useCallback + React.memo 性能优化

## 今天完成什么

1. 理解 React 的重渲染机制
2. 用 `React.memo` 包裹子组件，避免无效渲染
3. 用 `useCallback` 稳定回调函数引用

今天不追求“把所有组件都包一层 memo”，而是学会先找出真正的重复渲染，再让 `memo` 和 `useCallback` 形成一条完整的数据链。

## 接在昨天哪里

昨天提取了自定义 Hook，代码更简洁了。

但当前每次 `config` 变化，所有子组件都会重新渲染——即使那个子组件的 props 根本没变。

今天优化这个问题。

## 概念解释

### React 的重渲染机制

React 重新渲染的触发条件：

- 组件自己的 state 变了
- 父组件重新渲染了

```text
LowCodeConfigPage（config 变了，重新渲染）
  ↓ 所有子组件都重新渲染
  ├─ ComponentSidebar（没用到 config，也重渲染了）
  ├─ ConfigPanel
  └─ PreviewPanel
```

`ComponentSidebar` 没用 `config`，但父组件重渲染，它也跟着跑了一遍。

### React.memo

用 `React.memo` 包裹组件后，只有 props 真正变化时才重新渲染：

```tsx
import { memo } from 'react';

const ComponentSidebar = memo(function ComponentSidebar() {
  return <div>...</div>;
});
```

或者导出时包裹：

```tsx
function ComponentSidebar() { ... }
export default memo(ComponentSidebar);
```

### React.memo 如何比较 props

默认用 **浅比较**（shallow equal）：

- 基本类型（string、number、boolean）：值相等就认为没变
- 对象 / 函数：引用相等才认为没变

这里有个坑：

```tsx
function LowCodeConfigPage() {
  // ❌ 每次渲染都是新函数，引用不同
  const handleChange = (config) => setConfig(config);

  return <ConfigPanel onChange={handleChange} />;
}
```

`React.memo` 只比较 props。组件自己的 state 变化、读取的 Context 变化，仍然会触发它重新渲染；它也不会阻止父组件本身重新渲染。

即使 `ConfigPanel` 用了 `React.memo`，因为 `handleChange` 每次都是新函数，props 比较时引用不同，还是会重新渲染。

### useCallback

`useCallback` 缓存函数，只在依赖变化时创建新函数：

```tsx
const handleChange = useCallback((config) => {
  setConfig(config);
}, []);  // 空数组：这个函数永远不变
```

这样 `handleChange` 引用稳定，`React.memo` 才真正有效。

### 什么时候用

- 大型组件树（几十上百个组件）：有必要
- 小项目（当前这个配置页）：提升不大，但是必须掌握的概念

本章是**学习用途**，实际工作中要先 profile 再优化，不要一上来就到处加 memo。

## 动手实现

### 第 1 步：用 React.memo 包裹不需要频繁重渲的组件

修改 `src/components/ComponentSidebar.tsx`：

```tsx
import { memo } from 'react';

function ComponentSidebar() {
  return (
    <div style={{
      flex: '0 0 200px',
      backgroundColor: '#f5f5f5',
      padding: '20px',
      borderRight: '1px solid #ddd'
    }}>
      <h3>组件列表</h3>
      <div style={{
        padding: '10px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer'
      }}>
        InfoCard
      </div>
    </div>
  );
}

export default memo(ComponentSidebar);
```

### 第 2 步：用 useCallback 稳定 onChange 回调

修改 `src/components/LowCodeConfigPage.tsx`：

```tsx
import { useCallback, useState } from 'react';
import type { InfoCardConfig } from '../types/config';
import ComponentSidebar from './ComponentSidebar';
import ConfigPanel from './ConfigPanel';
import PreviewPanel from './PreviewPanel';
import { initialInfoCardConfig } from '../types/config';

function LowCodeConfigPage() {
  const [config, setConfig] = useState<InfoCardConfig>(initialInfoCardConfig);

  // useCallback 保证 handleChange 引用稳定
  const handleChange = useCallback((newConfig: InfoCardConfig) => {
    setConfig(newConfig);
  }, []);  // 没有依赖，永远不变

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <ComponentSidebar />
      <ConfigPanel config={config} onChange={handleChange} />
      <PreviewPanel config={config} />
    </div>
  );
}

export default LowCodeConfigPage;
```

### 第 3 步：验证优化效果（用 React DevTools）

安装 React DevTools 浏览器扩展，打开「Profiler」面板，操作配置，观察哪些组件在重渲染。

优化前：每次输入，所有组件都渲染。

优化后：`ComponentSidebar` 不再跟着渲染。

验证时要注意：开发环境的 Strict Mode 可能让初次渲染出现两次日志，这不是 `memo` 失效。真正要观察的是修改配置后，`ComponentSidebar` 是否还会重复输出。

### 为什么这里没有给所有组件加 memo

`memo` 不是“组件更高级”的标记。只有当组件经常因为父组件更新而重复渲染、同时 props 又大多保持不变时，它才可能带来收益。表单本身需要跟着输入变化，强行包上 `memo` 不会让它停止更新。

### 什么时候用 useCallback 的简化版

如果只是 `setConfig` 的直接包裹，其实可以更简单：

```tsx
// 直接传 setConfig 也行，因为 setConfig 引用本来就是稳定的
<ConfigPanel config={config} onChange={setConfig} />
```

React 的 `setXxx` 函数引用是稳定的，不需要额外包 `useCallback`。

本章的例子是为了演示 `useCallback` 的用法，实际上传 `setConfig` 更简洁。

## 常见错误

### 1. useCallback 依赖数组漏掉 state

```tsx
// ❌ 错误：handler 里用了 config，但没写进依赖
const handler = useCallback((field) => {
  doSomething(config, field);  // config 是 stale（过期）的
}, []);

// ✅ 正确
const handler = useCallback((field) => {
  doSomething(config, field);
}, [config]);
```

### 2. 把 useCallback 当成“让函数更快”

`useCallback` 主要稳定的是函数引用，不会自动让函数执行更快。只有当这个函数作为 props 传给 `memo` 子组件，或者作为其他 Hook 的依赖时，稳定引用才有实际意义。

### 3. 到处加 React.memo 反而更慢

每次渲染都需要做 props 浅比较，如果 props 每次都变（比如传了新对象），比较本身也有开销。

原则：**先测量，再优化**。

### 4. 误以为 React.memo 解决了所有重渲染

```tsx
// ❌ 误区：用了 memo 就一定不重渲染
const Child = memo(function Child({ onClick }) { ... });

// 父组件每次渲染都传新的 onClick
<Child onClick={() => doSomething()} />
// ↑ 即使有 memo，onClick 每次都是新函数，子组件还是会重渲染
```

`React.memo` + `useCallback` 要配合用。

## 动手改一改

1. 打开浏览器控制台，在 `ComponentSidebar` 组件里加 `console.log('ComponentSidebar render')`
2. 修改一下配置表单，观察控制台输出
3. 用 `memo` 包裹后再试，验证它真的不重渲染了

再做一个小实验：给 `ComponentSidebar` 增加一个普通字符串 prop，并在父组件中每次渲染时拼出相同内容。观察它仍然可以跳过渲染；然后把这个 prop 改成每次新建的对象，再观察浅比较为什么失效。

## 验收清单

- [ ] `ComponentSidebar` 用了 `memo` 包裹
- [ ] `handleChange` 用了 `useCallback`
- [ ] 在控制台验证了 `ComponentSidebar` 不再频繁重渲染
- [ ] 能解释 `React.memo` 如何比较 props
- [ ] 能解释为什么 `useCallback` 要配合 `React.memo` 使用
- [ ] 能说出什么时候不需要 `useCallback`

## 今天真正要记住的一条链

```text
父组件重新渲染
→ memo 检查子组件 props
→ 基本值相同可以跳过
→ 对象 / 函数要先保证引用稳定
→ useCallback 只解决函数引用，不负责业务状态
```

## 今日记录

**今天跑通：**
- React.memo 避免无效重渲染
- useCallback 稳定回调引用
- 用 DevTools 验证优化效果

**现在能解释：**
- 浅比较是什么
- useCallback 的依赖数组
- 什么时候值得优化，什么时候不值得

**明天先做：**
- 代码整理和最终验收
- 整理组件树，确保每个组件职责清晰

## 留给明天的接口

功能全部完成，明天做最后的代码整理：

- 检查每个组件的职责是否清晰
- 提取重复的 inline style 到常量
- 最终验收项目

<ProgressButton courseId="react-lowcode-course" dayId="day-11-memo-callback" />
