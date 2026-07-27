# React 低代码配置页实战课程设计

> 本文是交给内容生成模型或编码 Agent 的课程施工说明。
> 正式教程应按本文拆成独立章节，放进 `docs/study/react-lowcode-course/`。

## 1. 为什么要这样设计

现有的 `low-code-component-config-page-design.md` 是项目方案，但缺少逐步引导。

初学 React 的人容易卡在：

- 状态怎么传给子组件？
- 数组更新为什么要用 `map` 而不是直接改？
- 表单的 `value` 和 `onChange` 到底怎么配合？
- 组件拆到什么粒度？

新课程采用 **7 天连续项目线**：每天都修改同一个「InfoCard 配置页」，前一天的产出必须成为后一天的输入。

```text
写死的卡片
  → 从 config 读取数据
  → 修改标题实时更新
  → 字段列表可增删改
  → 样式可配置
  → 按钮可配置
  → JSON 预览 + 代码整理
```

## 2. 学习者画像与边界

学习者有前端基础，能理解变量、函数、数组、对象、HTML/CSS，但 React 经验较少。

- **总周期**：7 个学习日，约 1.5 周
- **每天用时**：60～90 分钟
- **开发环境**：Vite + React + TypeScript
- **最终形态**：InfoCard 配置页，三栏布局，实时预览
- **学习策略**：只补完成配置页所需的 React 知识，不扩展成 React 完整教程

暂不展开：

- 拖拽布局
- 多组件画布
- 接口请求
- 路由
- Redux / Zustand
- 单元测试

这些可以作为后续扩展章节，但不放在 7 天主线。

## 3. 最终项目

项目名建议为 `react-lowcode-infocard`，最终支持：

1. 三栏布局：左侧组件列表、中间配置面板、右侧预览区
2. 配置 `InfoCard` 的标题、副标题、状态、边框
3. 增删改字段列表，控制字段显隐
4. 配置布局、尺寸、强调色
5. 增删改操作按钮，控制按钮显隐
6. 右侧实时预览配置效果
7. 查看当前配置的 JSON
8. 组件拆分清晰，职责分明

建议最终目录：

```text
react-lowcode-infocard/
├─ .gitignore
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ index.html
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ types/
│  │  └─ config.ts
│  ├─ components/
│  │  ├─ LowCodeConfigPage.tsx
│  │  ├─ ComponentSidebar.tsx
│  │  ├─ ConfigPanel.tsx
│  │  ├─ PreviewPanel.tsx
│  │  └─ InfoCardPreview.tsx
│  ├─ features/
│  │  └─ infocard-config/
│  │     ├─ BasicConfigForm.tsx
│  │     ├─ FieldConfigList.tsx
│  │     ├─ StyleConfigForm.tsx
│  │     ├─ ActionConfigList.tsx
│  │     └─ ConfigJsonViewer.tsx
│  └─ styles/
│     └─ lowcode.css
└─ README.md
```

前几天不应一次性创建全部文件。目录要随着课程逐步演化，每次新增文件时解释"为什么现在需要拆分"。

## 4. 三个核心概念必须讲清楚

### 4.1 状态在哪、数据怎么流动

React 的核心是 **单向数据流**：

```text
父组件持有 state
  ↓ props
子组件只读 props
  ↑ 回调函数
父组件更新 state
```

课程必须持续强调：

- `config` 状态在 `LowCodeConfigPage`
- 配置面板通过 props 接收 `config`
- 预览面板通过 props 接收 `config`
- 配置面板通过回调函数 `onChange` 通知父组件更新 state

### 4.2 为什么要不可变更新

JavaScript 数组和对象是引用类型，直接修改会导致 React 无法检测变化：

```tsx
// ❌ 错误写法
config.title = 'new title';
setConfig(config);  // React 认为引用没变,不会重新渲染

// ✅ 正确写法
setConfig({ ...config, title: 'new title' });
```

Day 4 必须专门讲解数组的不可变更新：

- 新增：`[...prev, newItem]`
- 删除：`prev.filter(item => item.id !== id)`
- 修改：`prev.map(item => item.id === id ? { ...item, ...updates } : item)`

### 4.3 组件拆分的判断原则

不是"文件越多越好",而是：

- **职责单一**：一个组件只做一件事
- **复用性**：同样的逻辑出现 2 次以上就该抽
- **可读性**：主组件代码不超过 150 行

Day 7 专门做组件拆分与代码整理，把前 6 天写的冗余代码重构干净。

## 5. 课程总览

整个课程分成 **三个阶段，共 14 天**：

**阶段一：React 基础 + 静态页面（Day 1～3）**

从零搭建项目，理解组件、JSX、基本布局。

**阶段二：状态管理 + 配置驱动（Day 4～9）**

用 `useState` 管状态，让配置驱动预览，完成基础信息、字段、样式、按钮的配置能力。

**阶段三：代码质量 + 扩展能力（Day 10～14）**

代码重构、性能优化、自定义Hook、第二个组件、Schema驱动表单。

---

## 6. 详细课程蓝图

### 阶段一：React 基础 + 静态页面

### Day 1：搭页面骨架 + 写死卡片

**今日目标：**

- 用 Vite 创建 React + TypeScript 项目
- 搭出三栏布局（Flexbox）
- 写死一个 `InfoCardPreview` 组件

**核心概念：**

- JSX 语法
- 函数组件
- CSS 基本布局

**项目变化：**

```text
创建项目
  ↓
App.tsx 中布局三栏
  ↓
右侧写死一个卡片
```

**当天闭环：**

打开 `http://localhost:5173`，能看到三栏布局和一个写死的信息卡片。

**为下一天留下：**

写死的卡片组件 `InfoCardPreview`，标题、字段、按钮都是硬编码。

---

### Day 2：用 config 驱动预览

**今日目标：**

- 定义 `InfoCardConfig` 类型
- 用 `useState` 管理配置状态
- 让预览从 `config` 读数据

**核心概念：**

- TypeScript 类型定义
- `useState` Hook
- props 传递

**项目变化：**

```text
定义 types/config.ts
  ↓
LowCodeConfigPage 持有 config state
  ↓
InfoCardPreview 从 props 读取 config
```

**当天闭环：**

手动修改 `initialConfig`，刷新页面，预览会跟着变。

**为下一天留下：**

`config` 状态和能响应 props 的预览组件。

---

### Day 3：基础信息表单 + 实时更新

**今日目标：**

- 做 `BasicConfigForm` 组件
- 支持修改标题、副标题、状态文案、状态类型、是否显示边框
- 表单一改，预览实时变化

**核心概念：**

- 受控表单（`value` 和 `onChange`）
- `input`、`select`、`checkbox` 的用法
- 回调函数向上传递更新

**项目变化：**

```text
新增 BasicConfigForm.tsx
  ↓
LowCodeConfigPage 传入 config 和 updateConfig 回调
  ↓
表单修改 → 回调 → setConfig → 预览更新
```

**当天闭环：**

在表单里改标题，右侧卡片实时同步。

**为下一天留下：**

一个能修改简单字段的配置表单。

---

### Day 4：字段列表配置

**今日目标：**

- 做 `FieldConfigList` 组件
- 支持新增、删除、修改字段
- 支持显示/隐藏字段

**核心概念：**

- 数组的不可变更新（`map`、`filter`、`spread`）
- 列表渲染（`key` 的作用）
- 增删改操作

**项目变化：**

```text
新增 FieldConfigList.tsx
  ↓
config.fields 数组驱动字段列表
  ↓
新增/删除/修改 → 更新数组 → 预览同步
```

**当天闭环：**

能添加一个新字段"邮箱"，能删除"来源",能修改"联系人"的值,能隐藏"手机号"。

**常见错误：**

- 直接 `push` / `splice` 修改原数组
- `key` 用索引导致删除后渲染错位
- ID 冲突

**为下一天留下：**

一个能管理字段列表的表单。

---

### Day 5：样式配置

**今日目标：**

- 做 `StyleConfigForm` 组件
- 支持布局、尺寸、强调色配置
- 让卡片样式跟着配置变化

**核心概念：**

- 枚举 props
- 动态 `className`
- CSS 变量注入（`style={ { '--accent-color': color } }`）

**项目变化：**

```text
新增 StyleConfigForm.tsx
  ↓
config.layout / size / accentColor 驱动样式
  ↓
InfoCardPreview 根据 props 切换 class 和 style
```

**当天闭环：**

切换布局，卡片从纵向变横向；改强调色,状态标签颜色跟着变。

**为下一天留下：**

一个能配置样式的表单。

---

### Day 6：操作按钮配置

**今日目标：**

- 做 `ActionConfigList` 组件
- 支持新增、删除、修改按钮
- 支持按钮显隐和类型切换

**核心概念：**

- 复用组件模式（和 Day 4 的字段列表类似）
- 按钮点击事件

**项目变化：**

```text
新增 ActionConfigList.tsx
  ↓
config.actions 数组驱动按钮列表
  ↓
InfoCardPreview 渲染按钮并响应点击
```

**当天闭环：**

能添加一个"编辑"按钮，能修改"查看详情"按钮文案,能隐藏"新建跟进"。

**为下一天留下：**

完整的配置能力,但代码还比较乱。

---

### Day 7：JSON 预览 + 代码整理

**今日目标：**

- 做 `ConfigJsonViewer` 组件
- 用 `useMemo` 避免重复计算
- 提取重复逻辑到自定义 Hook
- 整理组件职责

**核心概念：**

- `useMemo` Hook
- 自定义 Hook（如 `useConfigUpdater`）
- 组件拆分与职责划分

**项目变化：**

```text
新增 ConfigJsonViewer.tsx
  ↓
PreviewPanel 分成上下两块：预览 + JSON
  ↓
提取 useConfigUpdater Hook
  ↓
清理重复代码
```

**当天闭环：**

- 右侧下方能看到格式化的 JSON
- 主组件代码不超过 150 行
- 每个子组件职责清晰

**最终验收：**

完成项目设计文档中的第一版完成标准。

## 6. 每章必须采用的写作结构

正式教程的每个 Day 都必须独立成文,并严格包含：

1. **今天完成什么**：2～3 个可验证目标
2. **接在昨天哪里**：展示上一章留下的文件或状态
3. **概念解释**：讲清楚本章引入的 React 概念
4. **动手前的目录**：本章开始时的文件结构
5. **分步实现**：每次只增加一小块代码
6. **完整代码**：本章结束时所有新增或修改文件的完整内容
7. **运行效果**：截图或文字描述预期效果
8. **常见错误**：初学者高概率遇到的问题
9. **动手改一改**：10～15 分钟的小练习
10. **验收清单**：Markdown checkbox，可实际验证
11. **今日记录**：三行总结模板
12. **留给明天的接口**：下一章会用到什么

每章正文建议 1,800～2,800 个中文字。

## 7. 代码规范

- 所有代码使用 TypeScript
- 函数组件优先，不用 Class 组件
- Props 类型单独定义，不用内联类型
- 每个代码块注明文件路径
- 完整文件不得用 `...` 省略关键代码
- CSS 用简单的 class，不引入 Tailwind / CSS-in-JS
- 变量命名清晰，不用 `a`、`b`、`temp` 这种无意义名字

## 8. 文档站落地结构

应创建以下文件：

```text
docs/study/react-lowcode-course/
├─ index.md
├─ day-01-layout-skeleton.md
├─ day-02-config-state.md
├─ day-03-basic-form.md
├─ day-04-field-list.md
├─ day-05-style-config.md
├─ day-06-action-buttons.md
└─ day-07-json-refactor.md
```

`index.md` 应包含：课程说明、环境要求、7 天计划、最终目录、各章节链接。

生成完课程后，要把课程首页和 7 章加入 VitePress 侧边栏。

建议分批生成和验收：

1. 先生成 `index.md`、Day 1～3，执行文档构建
2. 再生成 Day 4～5，重点检查数组操作和样式注入
3. 最后生成 Day 6～7，重点检查代码整理质量
4. 全部完成后运行 `npm run docs:build`，修复死链和构建错误

## 9. 内容验收标准

每批生成后，应从学习者视角检查：

- 能否解释本章数据从哪来、传给谁
- 只复制本章完整代码，能否得到描述的结果
- 是否使用了尚未讲解的 React 特性
- 相比上一章，是否只增加了有限的新复杂度
- 是否明确区分 state、props、回调函数
- 是否能在 60～90 分钟内完成正文学习与练习
- 所有页面是否能从课程首页或侧边栏访问
- 文档站能否通过 `npm run docs:build`

课程不是以"讲完 7 个标题"为完成，而是以学习者能够独立运行、解释和小幅修改最终项目为完成。
