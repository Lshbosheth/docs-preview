# React 低代码核心补全课 - 课程设计

> 本文是交给内容生成模型或编码 Agent 的课程施工说明。
> 正式教程应按本文拆成独立章节，放进 `docs/study/react-lowcode-essentials/`。

## 1. 为什么需要这个系列

基础课（`react-lowcode-course`，Day 1～12）教会了学习者用 React 做一个配置驱动的页面：函数组件、`useState`、受控表单、数组不可变更新、`useMemo`、自定义 Hook、`useCallback`、`React.memo`。

但基础课有几个**明显的能力缺口**，而它们都是任何真实 React 项目都绕不开的：

- **完全没讲 `useEffect`**——一旦要请求数据、设定时器、订阅事件、同步 localStorage，就必须用它
- **没讲 `useRef`**——拿 DOM 节点、存不触发渲染的可变值
- **没讲跨层级状态**（`useContext` / `useReducer`）——配置项一多，props 透传就会失控
- **没讲路由**——所有页面都是单页，无法做"列表页→编辑页"这种多页面应用
- **没讲异步数据**——配置只活在浏览器内存里，不能存后端、不能连真实数据
- **没讲错误边界**——组件崩了就整页白屏

这门课的定位：**基础课的直接延续**，把这些缺口用「继续改造 InfoCard 低代码项目」的方式补齐，让学习者从"会写页面"进阶到"能写真实应用"。

## 2. 学习者画像与前置要求

### 前置要求

- **必须**完成基础课 Day 1～12
- 熟练 `useState`、props、受控表单、数组不可变更新
- 会用自定义 Hook（基础课 Day 10 讲过）

### 学习者画像

- 刚学完基础课，想知道"接下来还缺什么"
- 想把玩具项目做成能用的真实应用
- 项目驱动型学习者，不喜欢干背 API

### 不适合的人

- 基础课还没完成
- 只想快速抄一个组件库

## 3. 系列目标

完成本系列后，学习者能：

1. 用 `useEffect` 处理副作用（自动保存、拉取数据、订阅、清理）
2. 讲清楚依赖数组、清理函数、执行时机，避开死循环
3. 用 `useRef` 操作 DOM 和保存可变值
4. 用 `useReducer` 收敛复杂状态变更
5. 用 `useContext` 消灭深层 props 透传
6. 用 React Router 做多页面应用
7. 用 `useEffect + fetch` 处理异步数据的加载/错误/空三态
8. 用错误边界给组件崩溃兜底

最终项目：**在基础课 InfoCard 项目上，扩展出自动保存、全局状态、多页面、连后端、崩溃兜底的完整能力**。

## 4. 系列结构

共 **8 天**，分三个阶段。

### 阶段一：副作用与引用（Day 1～3）

补上基础课最大的窟窿：`useEffect` 和 `useRef`。

### 阶段二：状态升级（Day 4～5）

用 `useReducer + useContext` 重构配置状态，告别 props 透传。

### 阶段三：多页面与数据（Day 6～8）

路由、异步数据、错误边界，把项目做成真实应用。

## 5. 详细课程蓝图

### Day 1：useEffect 入门——配置自动保存

**今日目标：**

- 理解 `useEffect` 是什么、什么时候执行
- 用 `useEffect` 把配置自动保存到 localStorage
- 刷新页面后自动恢复上次的配置

**核心概念：**

- 什么是"副作用"（side effect）
- `useEffect(fn, deps)` 的基本结构
- 依赖数组：`[config]` 表示 config 变化时执行
- 渲染与副作用的先后顺序

**项目变化：**

```text
新增 utils/storage.ts（localStorage 读写封装）
  ↓
LowCodeConfigPage 里用 useEffect 监听 config
  ↓
config 一变 → 写入 localStorage
  ↓
初始化 useState 时从 localStorage 读回来
```

**当天闭环：** 改配置 → 刷新页面 → 配置还在。

**为下一天留下：** 现在每次改动都立刻写盘，频繁输入时写太勤，需要防抖。

---

### Day 2：useEffect 进阶——依赖、清理与防抖保存

**今日目标：**

- 讲透依赖数组的三种写法（不写 / `[]` / `[x]`）
- 理解清理函数（return）的作用和时机
- 用"防抖保存"优化 Day 1 的自动保存

**核心概念：**

- 依赖数组的三种行为
- 清理函数：组件卸载 / 下次 effect 前执行
- 用 `setTimeout` + 清理函数实现防抖
- 常见死循环：effect 改 state 又依赖 state

**项目变化：**

```text
新增 hooks/useDebouncedEffect.ts（防抖版 effect）
  ↓
自动保存改成"停止输入 500ms 后才写盘"
  ↓
加一个"未保存 / 已保存"状态提示
```

**当天闭环：** 连续打字时不频繁写盘，停下 500ms 后提示"已保存"。

**为下一天留下：** 新增字段时输入框没有自动聚焦，体验不好，需要 `useRef`。

---

### Day 3：useRef——DOM 引用与可变值

**今日目标：**

- 用 `useRef` 拿到 DOM 节点，新增字段时自动聚焦
- 用 `useRef` 存不触发渲染的值（上一次的配置 / 定时器 id）
- 讲清楚 `useRef` vs `useState` 的区别

**核心概念：**

- `ref` 挂到 DOM：`<input ref={inputRef} />`
- `ref.current` 读写不触发渲染
- 存"上一次的值"做对比
- 为什么定时器 id 该放 ref 不放 state

**项目变化：**

```text
新增字段/按钮时，输入框自动聚焦（useRef + useEffect 配合）
  ↓
用 ref 保存 debounce 定时器 id
  ↓
用 ref 记录上一次保存的配置，对比是否真的变了
```

**当天闭环：** 点"新增字段"，光标自动落到新字段的输入框。

**为下一天留下：** 配置变更逻辑散落在各处，`setConfig` 到处都是，该收敛了。

---

### Day 4：useReducer——收敛配置变更

**今日目标：**

- 把散落的 `setConfig` 收敛成一个 reducer
- 理解 action / dispatch / reducer 三件套
- 所有配置操作走统一的 dispatch

**核心概念：**

- `useReducer(reducer, initialState)`
- action：描述"发生了什么"（`ADD_FIELD` / `UPDATE_TITLE`）
- reducer：纯函数，根据 action 算出新 state
- 相比 `useState` 的优势：逻辑集中、可测试

**项目变化：**

```text
新增 state/configReducer.ts
  ↓
定义 action 类型（增删改字段、改标题、改样式…）
  ↓
LowCodeConfigPage 用 useReducer 替换多个 useState
  ↓
子组件调用 dispatch 而不是各种 setXxx
```

**当天闭环：** 所有配置操作都通过 `dispatch(action)`，reducer 一处管理。

**为下一天留下：** dispatch 还是靠 props 一层层往下传，透传太深。

---

### Day 5：useContext——消灭 props 透传

**今日目标：**

- 用 `useContext` 把 config 和 dispatch 提供给整棵组件树
- 子组件直接取用，不再层层透传
- 封装一个自定义 Hook `useConfig()` 简化取用

**核心概念：**

- `createContext` 创建上下文
- `<Context.Provider>` 提供值
- `useContext` 消费值
- Context + Reducer = 不引外部库的状态管理标准解法

**项目变化：**

```text
新增 context/ConfigContext.tsx
  ↓
Provider 里放 useReducer 的 state + dispatch
  ↓
包裹在 LowCodeConfigPage 外层
  ↓
各配置表单用 useConfig() 直接拿 state / dispatch
```

**当天闭环：** 删掉一堆 props 透传，子组件自己 `useConfig()` 取数据。

**为下一天留下：** 项目还是单页，想做"组件列表页 → 编辑页"就需要路由。

---

### Day 6：React Router——多页面应用

**今日目标：**

- 引入 React Router
- 做两个页面：组件列表页、配置编辑页
- 用 URL 参数决定编辑哪个组件

**核心概念：**

- `<BrowserRouter>` / `<Routes>` / `<Route>`
- `useNavigate` 编程式跳转
- `useParams` 读 URL 参数
- 路由懒加载（`lazy` + `Suspense`）

**项目变化：**

```text
安装 react-router-dom
  ↓
新增 pages/ComponentListPage.tsx（组件列表）
  ↓
新增 pages/EditorPage.tsx（配置编辑，读 :id 参数）
  ↓
配置路由表，列表点击跳转到 /editor/:id
```

**当天闭环：** 列表页点一个组件，跳到对应的编辑页，URL 带 id。

**为下一天留下：** 配置还是存 localStorage，该连"后端"了。

---

### Day 7：异步数据——加载/错误/空三态

**今日目标：**

- 写一个 mock API（模拟后端延迟）
- 用 `useEffect + fetch/异步` 拉取和保存配置
- 正确处理加载中、出错、空数据三种状态

**核心概念：**

- 异步函数在 `useEffect` 里的正确写法
- 加载/错误/空/成功四种 UI 状态
- 竞态问题与清理（快速切换时的旧请求）
- （可选）介绍 React Query 的价值

**项目变化：**

```text
新增 api/mockApi.ts（Promise + setTimeout 模拟）
  ↓
编辑页加载时：显示"加载中" → 拉到配置 → 渲染
  ↓
保存按钮：调用 mock 保存，显示保存中/成功/失败
  ↓
封装 useAsync / useConfigData Hook
```

**当天闭环：** 打开编辑页有加载态，保存有反馈，断网/出错有错误提示。

**为下一天留下：** 用户上传的自定义组件（进阶课）如果崩了，会拖垮整页，需要错误边界。

---

### Day 8：错误边界与收尾

**今日目标：**

- 用类组件实现 Error Boundary
- 给预览区套错误边界，组件崩了只崩局部
- 整门课回顾与验收

**核心概念：**

- 为什么错误边界必须是类组件
- `componentDidCatch` / `getDerivedStateFromError`
- 错误边界的边界（拦不住事件处理器/异步里的错误）
- 兜底 UI 与"重试"

**项目变化：**

```text
新增 components/ErrorBoundary.tsx（类组件）
  ↓
包裹预览区 PreviewPanel
  ↓
预览组件抛错时，显示"预览出错，点击重试"而非白屏
```

**当天闭环：** 故意让预览组件抛错，只有预览区显示错误卡片，其余照常。

**最终验收：** 项目具备自动保存、全局状态、多页面、连后端、崩溃兜底五大能力。

---

## 6. 每章写作规范

与基础课、进阶课保持一致：

1. **今天完成什么**：2～3 个可验证目标
2. **接在昨天哪里**：展示上一章产出
3. **概念解释**：结合项目场景讲清核心技术点
4. **动手前的目录**：当前文件结构
5. **分步实现**：每次只加一小块
6. **完整代码**：新增/修改文件的完整内容，不用 `...` 省略关键代码
7. **运行效果**：文字描述预期
8. **常见错误**：调试与排错
9. **动手改一改**：10～15 分钟练习
10. **验收清单**：Markdown checkbox
11. **今日总结**：学到什么 / 关键代码 / 今天的限制 / 明天做什么

每章正文建议 2,500～3,500 个中文字。

## 7. 代码规范

- TypeScript 严格模式
- 每个代码块注明文件路径
- Hook 的依赖数组必须写正确（这门课重点就是讲清楚它）
- 复杂逻辑加注释
- 只用已讲过的知识（前几天没讲的 Hook 不提前用）

## 8. 文档站落地结构

```text
docs/study/react-lowcode-essentials/
├─ index.md                          # 系列首页
├─ day-01-useeffect-autosave.md      # Day 1
├─ day-02-useeffect-cleanup-debounce.md
├─ day-03-useref.md
├─ day-04-usereducer.md
├─ day-05-usecontext.md
├─ day-06-router.md
├─ day-07-async-data.md
└─ day-08-error-boundary-review.md
```

## 9. 验收标准

每章完成后检查：

- 代码能复制粘贴后直接跑
- 只用了已讲解的知识
- Hook 依赖数组正确，没有隐藏的死循环
- 讲清楚了"为什么这样写"
- 学习者能在 90～120 分钟内完成

## 10. 与基础课的衔接

Day 1 开头必须明确：

- 这是基础课的**直接延续**，不是独立课程
- 必须先完成基础课 Day 1～12
- 在基础课 Day 12 的项目代码基础上继续开发

Day 1 第一步：

```text
复制基础课 Day 12 的完整项目
  ↓
确认能正常跑（三栏配置页）
  ↓
开始加"自动保存"功能
```

## 11. 与其他系列的关系

```text
基础课（12 天）
  ↓
本课 · 核心补全（8 天）   ← 补 useEffect/useRef/Context/路由/数据/错误边界
  ↓
进阶课 · 自定义组件动态加载（8 天）
  ↓
低代码进阶系列（状态管理 / Schema / 数据源 / 拖拽 / 部署）
```

> 本课与进阶课可以并行或先后：进阶课偏"动态加载技术"，本课偏"React 核心能力"。建议先上本课，把 React 基本功补牢，再啃进阶课。

## 12. 注意事项

### useEffect 是重点

Day 1、2 是全课地基。必须把"执行时机、依赖数组、清理函数、死循环"讲到学习者能自己判断，而不是背规则。

### 不要提前引入外部库

- 状态管理只用 `useReducer + useContext`，不引 Redux/Zustand（那是进阶系列的事）
- 异步数据先手写三态，再"提一嘴"React Query，不强制引入

### mock 后端要简单

Day 7 的"后端"就是 `Promise + setTimeout`，不要求学习者真起一个服务端。

---

课程设计完成。下一步生成正式教程内容。
