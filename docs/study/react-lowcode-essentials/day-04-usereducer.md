---
title: Day 4 - useReducer：收敛配置变更
---

# Day 4：useReducer——把散落的配置变更收敛到一处

## 今天完成什么

1. 搞懂 `useReducer` 是什么，跟 `useState` 什么关系
2. 把所有配置变更（改标题、增删字段、改样式…）收敛到一个 reducer
3. 组件里不再写一堆 `setConfig(prev => ...)`，全改成 `dispatch(action)`

## 接在昨天哪里

到 Day 3，你的配置变更逻辑长这样，散落在各处：

```typescript
// 改标题
onChange={(e) => setConfig({ ...config, title: e.target.value })}
// 新增字段
setConfig({ ...config, fields: [...config.fields, newField] })
// 删字段
setConfig({ ...config, fields: config.fields.filter(f => f.id !== id) })
// 改字段
setConfig({ ...config, fields: config.fields.map(f => f.id === id ? {...f, label} : f) })
```

配置项才几个就这么乱了。再加"样式配置""操作按钮配置"，这些 `{ ...config, ... }` 会满天飞，而且**每个改动逻辑都黏在 JSX 上**，想复用、想测试都难。

`useReducer` 就是来收拾这个的：把"怎么改配置"全部搬到一个函数里，组件只负责说"我要干什么"。

## 核心概念

### 1. useReducer 是 useState 的"升级版"

`useState` 适合简单状态。当状态**结构复杂**、**变更方式多**时，用 `useReducer` 更清爽。

先看它长啥样：

```typescript
const [state, dispatch] = useReducer(reducer, initialState);
```

- `state`：当前状态（就是你的 config）
- `dispatch`：派发一个 action（"我要干这件事"）
- `reducer`：一个函数，接收 `(旧state, action)`，返回 `新state`

### 2. reducer 是什么

reducer 是一个**纯函数**，签名固定：

```typescript
function reducer(state, action) {
  // 根据 action.type，返回一个新的 state
  return newState;
}
```

它的规矩：

- **只根据输入算输出**，不改外部、不发请求（纯函数）
- **返回新对象**，别改旧 state（不可变更新，跟基础课一样）

### 3. action 是什么

action 就是一个描述"要干什么"的对象，通常有个 `type`：

```typescript
{ type: 'UPDATE_TITLE', payload: '新标题' }
{ type: 'ADD_FIELD' }
{ type: 'DELETE_FIELD', payload: { id: 'xxx' } }
```

`type` 说干什么，`payload` 带需要的数据。

### 4. 三者怎么配合

```text
组件里：dispatch({ type: 'UPDATE_TITLE', payload: '新标题' })
   ↓
React 调用：reducer(当前config, 那个action)
   ↓
reducer 里 switch(action.type)，匹配到 UPDATE_TITLE
   ↓
返回 { ...state, title: action.payload }
   ↓
config 更新 → 组件重渲染
```

一句话：**组件喊话（dispatch），reducer 干活（返回新 state）。**

## 动手前的目录

今天新增两个文件：

```text
src/
└─ state/
   ├─ configActions.ts     # action 类型定义 [新增]
   └─ configReducer.ts     # reducer 函数 [新增]
```

修改：

```text
src/
└─ components/
   └─ LowCodeConfigPage.tsx   # useState → useReducer [修改]
```

## 分步实现

### 第 1 步：定义 action 类型

新建 `src/state/configActions.ts`。用 TS 的联合类型把所有 action 列清楚，这样 reducer 里能获得类型提示和穷尽检查：

```typescript
import { Field } from '../types/config';

// 所有配置变更 action 的联合类型
export type ConfigAction =
  | { type: 'UPDATE_TITLE'; payload: string }
  | { type: 'ADD_FIELD' }
  | { type: 'UPDATE_FIELD'; payload: { id: string; label: string } }
  | { type: 'DELETE_FIELD'; payload: { id: string } }
  | { type: 'RESET'; payload: Config };
```

> 用联合类型的好处：`dispatch` 传错 type 或漏了 payload，TS 直接报红。比字符串常量安全得多。（`Config`、`Field` 用你基础课 `types/config.ts` 里的定义。）

### 第 2 步：写 reducer

新建 `src/state/configReducer.ts`：

```typescript
import { Config } from '../types/config';
import { ConfigAction } from './configActions';

export function configReducer(state: Config, action: ConfigAction): Config {
  switch (action.type) {
    case 'UPDATE_TITLE':
      return { ...state, title: action.payload };

    case 'ADD_FIELD':
      return {
        ...state,
        fields: [
          ...state.fields,
          { id: crypto.randomUUID(), label: '', type: 'text' },
        ],
      };

    case 'UPDATE_FIELD':
      return {
        ...state,
        fields: state.fields.map((f) =>
          f.id === action.payload.id
            ? { ...f, label: action.payload.label }
            : f
        ),
      };

    case 'DELETE_FIELD':
      return {
        ...state,
        fields: state.fields.filter((f) => f.id !== action.payload.id),
      };

    case 'RESET':
      return action.payload;

    default:
      // 穷尽检查：漏了某个 case，TS 会在这报错
      return state;
  }
}
```

> 看到没——**所有"怎么改配置"的逻辑，现在集中在这一个文件里**。以后加配置项，就在这加一个 case，组件那边一行不用动逻辑。

### 第 3 步：组件里 useState 换成 useReducer

修改 `LowCodeConfigPage.tsx`：

```typescript
import { useReducer } from 'react';
import { configReducer } from '../state/configReducer';
import { loadConfig } from '../utils/storage';

// [修改] 原来的 useState 换成 useReducer
// 第三个参数是"惰性初始化函数"，作用跟 Day 1 的惰性 useState 一样
const [config, dispatch] = useReducer(
  configReducer,
  undefined,
  () => loadConfig() ?? defaultConfig
);
```

> `useReducer(reducer, 初始值, 初始化函数)`：传了第三个参数时，第二个参数当它的入参（这里用不到，传 `undefined`），初始 state = `初始化函数(第二个参数)`。这样就复用了 Day 1 的"优先读 localStorage"。

### 第 4 步：把所有 setConfig 改成 dispatch

原来散落各处的 `setConfig(...)`，现在全部改成 `dispatch(...)`：

```typescript
// 改标题
onChange={(e) => dispatch({ type: 'UPDATE_TITLE', payload: e.target.value })}

// 新增字段
onClick={() => dispatch({ type: 'ADD_FIELD' })}

// 改字段
onChange={(e) =>
  dispatch({ type: 'UPDATE_FIELD', payload: { id: field.id, label: e.target.value } })
}

// 删字段
onClick={() => dispatch({ type: 'DELETE_FIELD', payload: { id: field.id } })}
```

子组件（比如 `FieldConfigList`）原来收 `onChange` 回调，现在可以直接收 `dispatch`，或者继续收窄成具体回调——今天先统一传 `dispatch` 最省事。

### 第 5 步：自动保存照旧

Day 1/2 的自动保存不用改，因为 `config` 还是那个 config，只是变更方式换了：

```typescript
useDebouncedEffect(
  () => saveConfig(config),
  [config],
  500
);
```

## 完整代码

今天文件清单：

1. **新增** `src/state/configActions.ts`（第 1 步）
2. **新增** `src/state/configReducer.ts`（第 2 步）
3. **修改** `src/components/LowCodeConfigPage.tsx`：

```typescript
import React, { useReducer } from 'react';
import { configReducer } from '../state/configReducer';
import { loadConfig, saveConfig } from '../utils/storage';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';

export function LowCodeConfigPage() {
  const [config, dispatch] = useReducer(
    configReducer,
    undefined,
    () => loadConfig() ?? defaultConfig
  );

  useDebouncedEffect(() => saveConfig(config), [config], 500);

  return (
    <div>
      <input
        value={config.title}
        onChange={(e) =>
          dispatch({ type: 'UPDATE_TITLE', payload: e.target.value })
        }
      />
      {/* 把 dispatch 传给字段列表子组件 */}
      <FieldConfigList fields={config.fields} dispatch={dispatch} />
      {/* ...预览、JSON 区照旧读 config */}
    </div>
  );
}
```

## 运行效果

功能和之前**一模一样**——改标题、增删字段都正常，自动保存也在。区别是内部：

1. 改标题、增删字段，功能全部正常
2. 打开 React DevTools，能看到 hook 从 `State` 变成了 `Reducer`
3. 代码上：组件里再也没有 `{ ...config, fields: [...] }` 这种繁琐拼装

> 重构的价值不在"功能变了"，而在"以后改起来更省事"。这一点今天先记住，Day 5 加 Context 时会更明显。

## 常见错误

### 错误 1：dispatch 后 state 没变

**原因**：reducer 里直接改了 `state`（比如 `state.title = xxx`）而不是返回新对象。

**解决**：reducer 必须**返回新对象**，用 `{ ...state, ... }`，绝不改旧 state。

### 错误 2：某个 action 不生效

**原因**：`action.type` 字符串拼错，或 reducer 里漏了对应 case，走了 `default`。

**解决**：用第 1 步的联合类型，TS 会帮你查拼写；再检查 reducer 里 case 齐不齐。

### 错误 3：TS 报 "payload 不存在"

**原因**：某些 action（如 `ADD_FIELD`）没有 payload，你却访问了 `action.payload`。

**解决**：这正是联合类型的保护——`switch(action.type)` 进了对应 case，TS 才让你访问那个 case 该有的 payload。别在 case 外访问 payload。

### 错误 4：初始化又每次读盘

**原因**：`useReducer` 第三个参数写成了 `loadConfig() ?? defaultConfig`（直接调用）。

**解决**：传**函数** `() => loadConfig() ?? defaultConfig`，跟 Day 1 惰性初始化同理。

## 动手改一改

1. **加样式 action**：把基础课的样式配置（颜色、圆角）也搬进 reducer，加 `UPDATE_STYLE` action
2. **字段排序**：加 `MOVE_FIELD` action，payload 带 `{ id, direction: 'up' | 'down' }`，实现字段上移下移
3. **撤销准备**：想想如果要做"撤销/重做"，reducer 模式比 useState 好在哪（提示：state 变更集中，容易记历史）

## 验收清单

- [ ] 新建了 `configActions.ts`（联合类型）和 `configReducer.ts`
- [ ] `LowCodeConfigPage` 用 `useReducer` 替换了 `useState`
- [ ] 所有 `setConfig` 改成了 `dispatch(action)`
- [ ] 功能和重构前完全一致
- [ ] 能说清 reducer 是纯函数、要返回新对象
- [ ] 能说清 action 的 `type` / `payload` 作用

## 今日总结

### 学到了什么

1. **useReducer**：复杂状态的管理方式，`[state, dispatch]`
2. **reducer**：纯函数 `(state, action) => newState`，逻辑集中一处
3. **action**：`{ type, payload }`，描述"要干什么"
4. **联合类型**：给 action 上类型保险
5. **惰性初始化**：`useReducer` 第三个参数

### 关键代码

```typescript
const [config, dispatch] = useReducer(configReducer, undefined,
  () => loadConfig() ?? defaultConfig);

dispatch({ type: 'UPDATE_TITLE', payload: '新标题' });
```

### 今天的限制

- `dispatch` 现在得从顶层一路传给子组件、孙组件
- 层级一深，`dispatch` 又变成新的"props 透传地狱"

### 明天做什么

Day 5 用 `useContext`：把 `config` 和 `dispatch` 放进 Context，任意深的子组件直接取用，彻底告别透传。

---

**状态管理升级第一步完成。你现在写的是"能扩展"的代码，不是"能跑就行"的代码。**

<ProgressButton courseId="react-lowcode-essentials" dayId="day-04-usereducer" />
