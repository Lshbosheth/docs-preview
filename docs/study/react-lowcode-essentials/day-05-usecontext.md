---
title: Day 5 - useContext：消灭 props 透传
---

# Day 5：useContext——消灭 props 透传

## 今天完成什么

1. 搞懂 `useContext` 解决什么问题（props 透传地狱）
2. 建一个 `ConfigContext`，把 Day 4 的 `config` 和 `dispatch` 装进去
3. 任意深的子组件用 `useConfig()` 直接拿，不再一层层传

## 接在昨天哪里

Day 4 把配置变更收敛进了 reducer，很爽。但 `dispatch` 现在得从 `LowCodeConfigPage` 一路往下传：

```text
LowCodeConfigPage  (有 config、dispatch)
   ↓ 传 dispatch
FieldConfigList
   ↓ 又传 dispatch
FieldItem
   ↓ 还要传 dispatch
FieldTypeSelector  ← 真正用到的在这儿
```

中间那几层根本不用 `dispatch`，只是**帮忙传递**。这就是"props 透传（prop drilling）"——层级一深就烦，加个新数据要改一路组件。

`useContext` 就是给这个问题准备的：在顶层放一个"共享仓库"，深层组件直接伸手拿，中间层不用管。

## 核心概念

### 1. Context 是什么

Context 让你把数据"广播"给一整棵子树，跳过中间层。三个角色：

```text
createContext()  → 创建一个 Context 对象
<Context.Provider value={...}>  → 在顶层提供数据
useContext(Context)  → 在任意子组件消费数据
```

### 2. 类比

把 Context 想成"班级的公告栏"：

- `Provider` = 把公告贴上去（顶层贴一次）
- `useContext` = 任何同学随时来看（不用一个个口头传话）

没有 Context 时，一条通知得组长传给小组长、小组长传给每个人（props 透传）。有了公告栏，谁想看谁看。

### 3. 基本用法

```tsx
// 1. 创建
const ThemeContext = createContext('light');

// 2. 顶层提供
<ThemeContext.Provider value="dark">
  <App />
</ThemeContext.Provider>

// 3. 深层消费
function Button() {
  const theme = useContext(ThemeContext); // 直接拿到 'dark'
  return <button className={theme}>按钮</button>;
}
```

### 4. Context 不是万能药

别拿它当全局状态库滥用。它适合：

- **变化不频繁**的全局数据：主题、语言、当前用户、**我们这种配置状态**

不适合：每秒变几十次的高频状态（会引起消费组件频繁重渲染）。我们的 config 改动频率低，正合适。

## 动手前的目录

今天新增：

```text
src/
└─ context/
   └─ ConfigContext.tsx    # Context + Provider + useConfig hook [新增]
```

修改：

```text
src/
├─ components/
│  └─ LowCodeConfigPage.tsx   # 用 Provider 包住，去掉透传 [修改]
└─ features/infocard-config/
   └─ FieldConfigList.tsx     # 改用 useConfig()，不再收 props [修改]
```

## 分步实现

### 第 1 步：创建 ConfigContext

新建 `src/context/ConfigContext.tsx`。我们把 Day 4 的 `useReducer` 逻辑搬进来，让 Provider 自己管理状态：

```tsx
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Config } from '../types/config';
import { ConfigAction } from '../state/configActions';
import { configReducer } from '../state/configReducer';
import { loadConfig } from '../utils/storage';

// Context 里要共享的东西：当前配置 + 派发函数
interface ConfigContextValue {
  config: Config;
  dispatch: React.Dispatch<ConfigAction>;
}

// 创建 Context，初始值给 null（用来检测"忘了套 Provider"）
const ConfigContext = createContext<ConfigContextValue | null>(null);

// Provider 组件：管理 reducer，向下广播 config + dispatch
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, dispatch] = useReducer(
    configReducer,
    undefined,
    () => loadConfig() ?? defaultConfig
  );

  return (
    <ConfigContext.Provider value={{ config, dispatch }}>
      {children}
    </ConfigContext.Provider>
  );
}

// 自定义 hook：子组件用它消费，顺便做"忘套 Provider"的报错保护
export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useConfig 必须在 <ConfigProvider> 内部使用');
  }
  return ctx;
}
```

> 这里有个好习惯：**不直接导出 Context，而是导出 `useConfig()` hook**。好处是可以在里面加"忘了套 Provider 就报错"的检查，用起来也更简洁（`const { config, dispatch } = useConfig()`）。

### 第 2 步：顶层套上 Provider

修改 `LowCodeConfigPage.tsx`。原来它自己 `useReducer`，现在状态搬到 Provider 里了，它只需负责套 Provider + 渲染内容：

```tsx
import { ConfigProvider, useConfig } from '../context/ConfigContext';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import { saveConfig } from '../utils/storage';

// 外层：只负责套 Provider
export function LowCodeConfigPage() {
  return (
    <ConfigProvider>
      <ConfigPageInner />
    </ConfigProvider>
  );
}

// 内层：消费 config 做自动保存 + 渲染三栏
function ConfigPageInner() {
  const { config } = useConfig();

  // 自动保存照旧，只是 config 来自 useConfig 了
  useDebouncedEffect(() => saveConfig(config), [config], 500);

  return (
    <div>
      <TitleEditor />
      <FieldConfigList />
      <PreviewPanel />
    </div>
  );
}
```

> 注意：要 `useConfig()` 的组件必须在 `<ConfigProvider>` **里面**。所以拆成外层套 Provider、内层消费的两个组件——内层才能用 `useConfig()`。

### 第 3 步：子组件改用 useConfig，删掉 props

现在 `FieldConfigList` 不用别人传 `dispatch` 了，自己拿：

```tsx
import { useConfig } from '../../context/ConfigContext';

// [修改] 不再接收任何 props！
export function FieldConfigList() {
  const { config, dispatch } = useConfig();

  return (
    <div>
      {config.fields.map((field) => (
        <div key={field.id}>
          <input
            value={field.label}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_FIELD',
                payload: { id: field.id, label: e.target.value },
              })
            }
          />
          <button
            onClick={() =>
              dispatch({ type: 'DELETE_FIELD', payload: { id: field.id } })
            }
          >
            删除
          </button>
        </div>
      ))}
      <button onClick={() => dispatch({ type: 'ADD_FIELD' })}>
        + 新增字段
      </button>
    </div>
  );
}
```

标题编辑器同理：

```tsx
function TitleEditor() {
  const { config, dispatch } = useConfig();
  return (
    <input
      value={config.title}
      onChange={(e) =>
        dispatch({ type: 'UPDATE_TITLE', payload: e.target.value })
      }
    />
  );
}
```

**看，`LowCodeConfigPage` 里再也没有 `dispatch={dispatch}`、`config={config}` 这些透传了。** 每个组件自己取自己要的。

## 完整代码

今天文件清单：

1. **新增** `src/context/ConfigContext.tsx`（第 1 步完整代码）
2. **修改** `src/components/LowCodeConfigPage.tsx`（第 2 步，拆内外两层）
3. **修改** 各子组件，改用 `useConfig()`（第 3 步）

## 运行效果

功能又是**一模一样**——但代码结构大变样：

1. 改标题、增删字段全部正常，自动保存也在
2. 组件之间不再传 `config` / `dispatch` 这两个 props
3. 新加一个用到配置的子组件？直接 `useConfig()`，不用改任何中间层

> 到这里你应该体会到：Day 4 的 reducer + Day 5 的 context，是一对黄金搭档。reducer 管"怎么改"，context 管"谁能拿到"。很多人用 Redux、Zustand，本质就是这套的加强版。

## 常见错误

### 错误 1：`useConfig 必须在 Provider 内部使用`

**原因**：某个用了 `useConfig()` 的组件，没被 `<ConfigProvider>` 包住。

**解决**：确认它在 Provider 子树内。常见于把消费组件放到了 Provider 外面（比如和 Provider 平级）。

### 错误 2：改了配置，某个组件不更新

**原因**：那个组件没通过 `useConfig()` 拿数据，还在用旧的 props，或者 Provider 的 `value` 传的是过期引用。

**解决**：统一走 `useConfig()`；Provider 的 value 用当前的 `{ config, dispatch }`。

### 错误 3：性能问题——config 一变，整棵树重渲染

**原因**：Context 的 value 变了，所有消费组件都会重渲染。config 改动频率低，通常没事。

**解决**：今天不用管。真遇到性能问题（Day 后续/进阶课），可以拆分 Context（把 dispatch 和 config 分成两个 Context，dispatch 引用稳定）或上 `useMemo`。

### 错误 4：`createContext` 初始值给错

**原因**：初始值给了个假对象，导致忘套 Provider 时不报错、静默出 bug。

**解决**：像第 1 步那样初始值给 `null`，配合 `useConfig()` 里的抛错检查，问题立刻暴露。

## 动手改一改

1. **抽出 dispatch Context**：把 `dispatch` 单独放一个 Context，体会"只订阅 dispatch 的组件不会因 config 变化而重渲染"
2. **加一个主题 Context**：再建一个 `ThemeContext`（明/暗），练习多个 Context 并存
3. **DevTools 观察**：用 React DevTools 的 Components 面板，看 Context 的 value 变化和哪些组件重渲染

## 验收清单

- [ ] 新建了 `ConfigContext.tsx`，导出 `ConfigProvider` 和 `useConfig`
- [ ] `LowCodeConfigPage` 拆成"外层套 Provider + 内层消费"
- [ ] 子组件改用 `useConfig()`，删掉了 config/dispatch 的 props
- [ ] 功能与之前完全一致
- [ ] 能说清 Context 的三个角色（create / Provider / useContext）
- [ ] 理解"导出 hook 而非 Context"的好处

## 今日总结

### 学到了什么

1. **props 透传地狱**：中间层被迫帮忙传数据
2. **Context 三角色**：`createContext` / `Provider` / `useContext`
3. **自定义 hook 封装**：`useConfig()` + 忘套 Provider 的报错保护
4. **reducer + context 组合**：状态管理的经典搭配
5. **Context 的适用场景**：低频全局数据（主题/语言/用户/配置）

### 关键代码

```tsx
const ConfigContext = createContext<Value | null>(null);

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('必须在 Provider 内使用');
  return ctx;
}
```

### 今天的限制

- 现在整个应用只有"一个配置页"这一个界面
- 真实低代码平台是：先有一个"组件列表页"，点某个进"编辑页"——这需要**路由**

### 明天做什么

Day 6 引入 React Router：做"组件列表页 → 配置编辑页"两个页面，URL 能直达、能后退。

---

**阶段二（状态升级）完成！reducer + context 这对组合拳，是你从"玩具项目"迈向"真实应用"的关键一跳。**

<ProgressButton courseId="react-lowcode-essentials" dayId="day-05-usecontext" />
