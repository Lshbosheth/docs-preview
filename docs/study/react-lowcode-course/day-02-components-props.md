---
title: Day 2 - 组件拆分 + props 传递
---

# Day 2：组件拆分 + props 传递

## 今天完成什么

1. 把三栏布局拆成独立组件
2. 理解 props 怎么传递数据
3. 让每个组件职责更清晰

## 接在昨天哪里

昨天所有代码都在 `App.tsx` 里，现在有：

- 三栏布局（写死的 div）
- `InfoCardPreview` 组件（写死的数据）

今天要把布局拆出来，为明天引入状态做准备。

## 概念解释

### 为什么要拆组件

当前 `App.tsx` 有 70 多行，还没加配置表单就已经很长了。

拆组件的好处：

- **职责单一**：一个组件只做一件事
- **可读性**：主组件只负责组织，不关心细节
- **复用性**：相同逻辑可以复用

### 什么是 props

props 是父组件传给子组件的数据：

```tsx
// 父组件
<InfoCardPreview title="客户资料" />

// 子组件
function InfoCardPreview(props: { title: string }) {
  return <h3>{props.title}</h3>;
}
```

props 是**只读**的，子组件不能修改 props。

### Props 解构

可以直接解构 props：

```tsx
function InfoCardPreview({ title }: { title: string }) {
  return <h3>{title}</h3>;
}
```

这样更简洁，不用每次写 `props.title`。

## 动手实现

### 第 1 步：拆出组件列表侧边栏

新建 `src/components/ComponentSidebar.tsx`：

```tsx
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

export default ComponentSidebar;
```

### 第 2 步：拆出配置面板

新建 `src/components/ConfigPanel.tsx`：

```tsx
function ConfigPanel() {
  return (
    <div style={{
      flex: '1',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <h2>配置面板</h2>
      <p style={{ color: '#999' }}>后续章节会在这里加表单</p>
    </div>
  );
}

export default ConfigPanel;
```

### 第 3 步：拆出预览面板

新建 `src/components/PreviewPanel.tsx`：

```tsx
import InfoCardPreview from './InfoCardPreview';

function PreviewPanel() {
  return (
    <div style={{
      flex: '1',
      padding: '20px',
      backgroundColor: '#fafafa',
      overflowY: 'auto'
    }}>
      <h2 style={{ marginTop: 0 }}>预览</h2>
      <InfoCardPreview />
    </div>
  );
}

export default PreviewPanel;
```

### 第 4 步：创建主配置页组件

新建 `src/components/LowCodeConfigPage.tsx`：

```tsx
import ComponentSidebar from './ComponentSidebar';
import ConfigPanel from './ConfigPanel';
import PreviewPanel from './PreviewPanel';

function LowCodeConfigPage() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <ComponentSidebar />
      <ConfigPanel />
      <PreviewPanel />
    </div>
  );
}

export default LowCodeConfigPage;
```

### 第 5 步：简化 App.tsx

修改 `src/App.tsx`：

```tsx
import LowCodeConfigPage from './components/LowCodeConfigPage';

function App() {
  return <LowCodeConfigPage />;
}

export default App;
```

现在 `App.tsx` 只有 7 行，清爽多了。

### 第 6 步：给 PreviewPanel 加 props

修改 `src/components/PreviewPanel.tsx`，让它能接收一个标题：

```tsx
import InfoCardPreview from './InfoCardPreview';

type PreviewPanelProps = {
  title?: string;
};

function PreviewPanel({ title = '预览' }: PreviewPanelProps) {
  return (
    <div style={{
      flex: '1',
      padding: '20px',
      backgroundColor: '#fafafa',
      overflowY: 'auto'
    }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <InfoCardPreview />
    </div>
  );
}

export default PreviewPanel;
```

### 第 7 步：从父组件传 props

修改 `src/components/LowCodeConfigPage.tsx`：

```tsx
import ComponentSidebar from './ComponentSidebar';
import ConfigPanel from './ConfigPanel';
import PreviewPanel from './PreviewPanel';

function LowCodeConfigPage() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <ComponentSidebar />
      <ConfigPanel />
      <PreviewPanel title="实时预览" />
    </div>
  );
}

export default LowCodeConfigPage;
```

## 当前目录结构

```text
src/
├─ App.tsx
├─ main.tsx
└─ components/
   ├─ LowCodeConfigPage.tsx
   ├─ ComponentSidebar.tsx
   ├─ ConfigPanel.tsx
   ├─ PreviewPanel.tsx
   └─ InfoCardPreview.tsx
```

## 运行效果

保存后浏览器自动刷新，界面和昨天一模一样，但代码结构更清晰了。

右侧标题从「预览」变成了「实时预览」，这是 props 传递的效果。

## 常见错误

### 1. 忘记定义 props 类型

```tsx
// ❌ 错误
function PreviewPanel({ title }) { ... }

// ✅ 正确
function PreviewPanel({ title }: { title: string }) { ... }
```

TypeScript 项目必须给 props 加类型。

### 2. 在子组件里修改 props

```tsx
// ❌ 错误
function PreviewPanel({ title }: { title: string }) {
  title = '新标题';  // props 是只读的
  return <h2>{title}</h2>;
}

// ✅ 正确
// props 只能读，不能改
```

如果想改数据，要用 state（明天会讲）。

### 3. 解构时漏掉类型

```tsx
// ❌ 错误
type Props = { title: string };
function PreviewPanel({ title }) { ... }  // 没关联上类型

// ✅ 正确
type Props = { title: string };
function PreviewPanel({ title }: Props) { ... }
```

### 4. 可选 props 没给默认值

```tsx
// ❌ 可能出错
function PreviewPanel({ title }: { title?: string }) {
  return <h2>{title}</h2>;  // title 可能是 undefined
}

// ✅ 正确
function PreviewPanel({ title = '预览' }: { title?: string }) {
  return <h2>{title}</h2>;
}
```

## 动手改一改

1. 给 `ComponentSidebar` 加一个 props `components`，类型是 `string[]`，用来显示组件列表
2. 在 `LowCodeConfigPage` 里传 `components={['InfoCard', 'StatCard']}`
3. 用 `map` 把数组渲染成列表

提示：

```tsx
{components.map(name => (
  <div key={name}>...</div>
))}
```

## 验收清单

- [ ] 项目能正常启动，界面和昨天一样
- [ ] `App.tsx` 只有一行 `<LowCodeConfigPage />`
- [ ] `src/components/` 下有 5 个组件文件
- [ ] 右侧预览区标题显示「实时预览」
- [ ] 能解释什么是 props，props 是只读的
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- 把三栏布局拆成 4 个独立组件
- props 传递数据
- TypeScript 定义 props 类型

**现在能解释：**
- 为什么要拆组件
- props 怎么传递
- 解构 props 的写法
- 可选 props 的默认值

**明天先做：**
- 定义 `InfoCardConfig` 类型
- 用 `useState` 管理配置状态
- 让 `InfoCardPreview` 从 props 读配置，而不是写死数据

## 留给明天的接口

当前组件结构：

```text
LowCodeConfigPage（主组件）
├─ ComponentSidebar
├─ ConfigPanel
└─ PreviewPanel
   └─ InfoCardPreview（数据还是写死的）
```

明天要在 `LowCodeConfigPage` 里用 `useState` 管理一个 `config` 对象，传给 `InfoCardPreview`。

<ProgressButton courseId="react-lowcode-course" dayId="day-02-components-props" />
