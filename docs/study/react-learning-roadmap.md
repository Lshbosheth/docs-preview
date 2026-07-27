# React 学习路线

日期：2026-07-27

基于「低代码组件配置页」项目驱动的 React 学习路线。

不是从头背 API，是先有项目目标，再把需要的知识点填进去。

## 1. 整体思路

用项目驱动学习，文档当字典用。

遇到需要什么就查什么，不要先通读再动手。

这份路线分三层：

```text
第一层：本项目（低代码配置页）涉及的核心概念
第二层：第一版完成后的自然延伸方向
第三层：进阶能力（按需学，不强制）
```

## 2. 本项目知识点地图

每天做的功能，对应需要掌握的 React 概念：

| Day | 功能 | 核心概念 |
| --- | --- | --- |
| Day 1 | 搭页面骨架 | JSX、函数组件、基础布局 |
| Day 2 | 接入配置状态 | `useState`、props 传递、受控数据流 |
| Day 3 | 基础信息表单 | 受控表单（`input`、`select`、`checkbox`）、事件处理 |
| Day 4 | 字段列表配置 | 数组状态不可变更新、列表渲染（`key`）、增删改 |
| Day 5 | 样式配置 | 枚举 props、动态 `className`、CSS 变量注入 |
| Day 6 | 操作按钮配置 | 复用组件模式、回调函数、条件渲染 |
| Day 7 | JSON 预览与整理 | `useMemo`、组件职责拆分、自定义 Hook 提取 |

## 3. 推荐掌握顺序

这几块有依赖关系，按顺序走效率最高：

```text
函数组件 + JSX
  ↓
useState 基本用法（单个值、对象、数组）
  ↓
props 向下传递 + 回调函数向上更新
  ↓
受控表单（input / select / checkbox）
  ↓
数组状态不可变更新（map / filter / spread）
  ↓
useMemo（避免重复计算，预览组件用得上）
  ↓
自定义 Hook（把重复逻辑提取出来）
```

前四步是基础，不稳就会卡在 Day 3、Day 4。

`useMemo` 和自定义 Hook 是 Day 7 之后的事，先做完前面再管。

## 4. 常见边界情况

Day 4 和 Day 6 都涉及数组操作，这几个点容易踩坑：

**删除最后一个元素**

字段或按钮被全部删除后，预览区要有空状态展示，不能崩或白屏。

**ID 冲突**

新增字段/按钮时，ID 生成要保证唯一，推荐用 `Date.now()` 或 `crypto.randomUUID()`，不要用数组索引做 ID。

**空数组状态**

字段列表为空时，配置面板和预览区都要正常渲染，不能只考虑有数据的情况。

**对象浅拷贝陷阱**

更新嵌套对象时要注意深度：

```ts
// 错误写法 — 直接修改 prev 里的对象引用
setConfig(prev => {
  prev.fields[0].label = 'new';  // 不可变原则被破坏
  return { ...prev };
});

// 正确写法 — 始终创建新对象
setConfig(prev => ({
  ...prev,
  fields: prev.fields.map(f =>
    f.id === id ? { ...f, label: 'new' } : f
  )
}));
```

## 5. 第一版完成后的扩展路线

### 阶段二：引入状态管理

第一版所有状态在 `LowCodeConfigPage` 里，配置项一多就会感受到"状态透传太深"。

这时候学：

- `useContext` + `useReducer`：中型组件树的标准解法，不引入外部库
- `Zustand`：轻量全局状态，实际项目里用得比 Redux 多，上手快

### 阶段三：Schema 驱动表单

手写每个配置项输入框太累，低代码的核心能力是"给一份 schema，自动渲染对应表单"。

这一步要学：

- 根据 `type` 字段动态渲染不同输入组件（`string` → `input`，`enum` → `select`，`boolean` → `checkbox`）
- 递归渲染嵌套配置
- JSON Schema 基本规范（`$schema`、`type`、`enum`、`required`）

### 阶段四：性能与副作用

加了更多组件后开始关注性能：

- `useEffect`：处理副作用（同步外部状态、订阅事件、接口请求）
- `useCallback`：稳定回调引用，避免子组件因回调变化导致不必要的重渲染
- `React.memo`：组件级记忆化，配合 `useCallback` 使用

### 阶段五：接入真实数据

- `fetch` / `axios` 拉取真实字段配置
- `React Query` / `SWR`：异步数据状态管理，处理加载、缓存、错误、重试
- 配置保存到后端，支持草稿与发布

### 阶段六（进阶）：拖拽与多组件画布

- `dnd-kit`：现代 React 拖拽方案，替代老的 `react-dnd`
- 多组件画布：组件选中、层级管理、画布缩放
- 撤销/重做：基于 `useReducer` + 历史栈

## 6. 参考文档

| 文档 | 用途 |
| --- | --- |
| [React 官方文档](https://react.dev/learn) | 所有基础概念的权威来源，直接查 |
| [状态管理](https://react.dev/learn/managing-state) | 状态提升、Context 用法 |
| [列表渲染](https://react.dev/learn/rendering-lists) | `key`、`map`、数组操作 |
| [响应表单输入](https://react.dev/learn/reacting-to-input-with-state) | 受控表单完整例子 |
| [更新状态中的对象](https://react.dev/learn/updating-objects-in-state) | 不可变更新，必读 |
| [更新状态中的数组](https://react.dev/learn/updating-arrays-in-state) | 数组增删改，Day 4 前看 |
| [Zustand 文档](https://zustand-demo.pmnd.rs) | 阶段二用到时查 |
| [dnd-kit 文档](https://dndkit.com) | 阶段六拖拽用 |

遇到问题优先查官方文档，比搜博客靠谱得多。
