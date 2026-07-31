---
title: Day 3 - useState 入门：用 config 驱动预览
---

# Day 3：useState 入门：用 config 驱动预览

## 今天完成什么

1. 定义 `InfoCardConfig` 类型
2. 用 `useState` 管理配置状态
3. 让 `InfoCardPreview` 从 props 读配置，而不是写死数据

## 接在昨天哪里

昨天把布局拆成了 5 个组件：

```text
LowCodeConfigPage
├─ ComponentSidebar
├─ ConfigPanel
└─ PreviewPanel
   └─ InfoCardPreview
```

但 `InfoCardPreview` 里的数据还是写死的。今天要让它从配置读数据。

## 概念解释

### 什么是 state

state 是组件的"记忆"，用来存会变化的数据。

```tsx
const [count, setCount] = useState(0);
```

- `count` 是当前值
- `setCount` 是更新函数
- `0` 是初始值

### 为什么不用普通变量

```tsx
// ❌ 错误写法
let count = 0;
count = count + 1;  // 改了也不会重新渲染
```

普通变量改了，React 不知道，界面不会更新。

```tsx
// ✅ 正确写法
const [count, setCount] = useState(0);
setCount(count + 1);  // React 知道了，会重新渲染
```

调用 `setCount` 后，React 会重新运行组件函数，拿到新的 JSX，更新界面。

### state 在哪个组件

原则：**state 放在需要它的组件的最近公共父组件**。

当前场景：

- `ConfigPanel` 要修改配置
- `PreviewPanel` 要显示配置

所以 state 放在它们的父组件 `LowCodeConfigPage`。

## 动手实现

### 第 1 步：定义配置类型

新建 `src/types/config.ts`：

```tsx
export type InfoCardConfig = {
  title: string;
  subtitle: string;
  statusText: string;
  statusType: 'default' | 'success' | 'warning' | 'danger';
  showBorder: boolean;
  layout: 'vertical' | 'compact';
  size: 'small' | 'medium';
  accentColor: string;
  fields: InfoCardField[];
  actions: InfoCardAction[];
};

export type InfoCardField = {
  id: string;
  label: string;
  value: string;
  visible: boolean;
};

export type InfoCardAction = {
  id: string;
  text: string;
  type: 'primary' | 'default';
  visible: boolean;
};
```

### 第 2 步：定义初始配置

在 `src/types/config.ts` 继续添加：

```tsx
export const initialInfoCardConfig: InfoCardConfig = {
  title: '客户资料',
  subtitle: '郑州某某科技有限公司',
  statusText: '跟进中',
  statusType: 'success',
  showBorder: true,
  layout: 'vertical',
  size: 'medium',
  accentColor: '#52c41a',
  fields: [
    { id: 'contact', label: '联系人', value: '张三', visible: true },
    { id: 'phone', label: '手机号', value: '138****8888', visible: true },
    { id: 'source', label: '来源', value: '官网表单', visible: true }
  ],
  actions: [
    { id: 'detail', text: '查看详情', type: 'primary', visible: true },
    { id: 'follow', text: '新建跟进', type: 'default', visible: true }
  ]
};
```

### 第 3 步：在 LowCodeConfigPage 里用 useState

修改 `src/components/LowCodeConfigPage.tsx`：

```tsx
import { useState } from 'react';
import ComponentSidebar from './ComponentSidebar';
import ConfigPanel from './ConfigPanel';
import PreviewPanel from './PreviewPanel';
import { InfoCardConfig, initialInfoCardConfig } from '../types/config';

function LowCodeConfigPage() {
  const [config, setConfig] = useState<InfoCardConfig>(initialInfoCardConfig);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <ComponentSidebar />
      <ConfigPanel />
      <PreviewPanel config={config} />
    </div>
  );
}

export default LowCodeConfigPage;
```

### 第 4 步：PreviewPanel 接收并传递 config

修改 `src/components/PreviewPanel.tsx`：

```tsx
import InfoCardPreview from './InfoCardPreview';
import { InfoCardConfig } from '../types/config';

type PreviewPanelProps = {
  config: InfoCardConfig;
};

function PreviewPanel({ config }: PreviewPanelProps) {
  return (
    <div style={{
      flex: '1',
      padding: '20px',
      backgroundColor: '#fafafa',
      overflowY: 'auto'
    }}>
      <h2 style={{ marginTop: 0 }}>实时预览</h2>
      <InfoCardPreview config={config} />
    </div>
  );
}

export default PreviewPanel;
```

### 第 5 步：InfoCardPreview 从 config 读数据

修改 `src/components/InfoCardPreview.tsx`：

```tsx
import { InfoCardConfig } from '../types/config';

type InfoCardPreviewProps = {
  config: InfoCardConfig;
};

function InfoCardPreview({ config }: InfoCardPreviewProps) {
  // 根据 statusType 决定背景色
  const statusColors = {
    default: '#d9d9d9',
    success: '#52c41a',
    warning: '#faad14',
    danger: '#f5222d'
  };

  const statusBgColor = statusColors[config.statusType];

  return (
    <div style={{
      backgroundColor: '#fff',
      border: config.showBorder ? '1px solid #e0e0e0' : 'none',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '400px'
    }}>
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{config.title}</h3>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            {config.subtitle}
          </p>
        </div>
        <span style={{
          padding: '4px 12px',
          backgroundColor: statusBgColor,
          color: '#fff',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {config.statusText}
        </span>
      </div>

      {/* 字段列表 */}
      <div style={{
        borderTop: '1px solid #f0f0f0',
        paddingTop: '12px',
        marginBottom: '12px'
      }}>
        {config.fields
          .filter(field => field.visible)
          .map(field => (
            <div key={field.id} style={{ marginBottom: '8px' }}>
              <span style={{ color: '#999', fontSize: '14px' }}>{field.label}：</span>
              <span style={{ fontSize: '14px' }}>{field.value}</span>
            </div>
          ))}
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {config.actions
          .filter(action => action.visible)
          .map(action => (
            <button
              key={action.id}
              style={{
                padding: '6px 16px',
                backgroundColor: action.type === 'primary' ? '#1890ff' : '#fff',
                color: action.type === 'primary' ? '#fff' : '#333',
                border: action.type === 'primary' ? 'none' : '1px solid #d9d9d9',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => alert(`点击了：${action.text}`)}
            >
              {action.text}
            </button>
          ))}
      </div>
    </div>
  );
}

export default InfoCardPreview;
```

## 当前目录结构

```text
src/
├─ App.tsx
├─ main.tsx
├─ types/
│  └─ config.ts
└─ components/
   ├─ LowCodeConfigPage.tsx
   ├─ ComponentSidebar.tsx
   ├─ ConfigPanel.tsx
   ├─ PreviewPanel.tsx
   └─ InfoCardPreview.tsx
```

## 运行效果

保存后浏览器自动刷新，界面和之前一样。

但现在数据不是写死的，而是从 `config` 读的。

### 验证 config 生效

修改 `src/types/config.ts` 中的 `initialInfoCardConfig`：

```tsx
export const initialInfoCardConfig: InfoCardConfig = {
  title: '项目信息',  // 改这里
  subtitle: '低代码配置页项目',  // 改这里
  statusText: '进行中',  // 改这里
  statusType: 'warning',  // 改这里
  // ... 其他不变
};
```

保存后刷新，右侧卡片会立刻变化。

## 常见错误

### 1. 忘记 import useState

```tsx
// ❌ 错误
const [config, setConfig] = useState(initialInfoCardConfig);
// ReferenceError: useState is not defined

// ✅ 正确
import { useState } from 'react';
```

### 2. 没给 useState 加类型

```tsx
// ❌ 类型推断可能不准确
const [config, setConfig] = useState(initialInfoCardConfig);

// ✅ 明确指定类型
const [config, setConfig] = useState<InfoCardConfig>(initialInfoCardConfig);
```

### 3. 直接修改 state

```tsx
// ❌ 错误
config.title = '新标题';
setConfig(config);  // React 认为引用没变，不会重新渲染

// ✅ 正确（明天会详细讲）
setConfig({ ...config, title: '新标题' });
```

### 4. map 忘记加 key

```tsx
// ❌ 控制台会警告
{config.fields.map(field => <div>{field.label}</div>)}

// ✅ 正确
{config.fields.map(field => <div key={field.id}>{field.label}</div>)}
```

`key` 帮助 React 识别哪个元素变了，提高渲染效率。

## 动手改一改

1. 在 `initialInfoCardConfig` 里新增一个字段「邮箱」，值是 `user@example.com`
2. 把「跟进中」状态改成「已完成」，`statusType` 改成 `success`
3. 把第二个按钮「新建跟进」的 `visible` 改成 `false`，看看按钮会不会消失

## 验收清单

- [ ] 项目能正常启动
- [ ] 右侧卡片从 `config` 读数据，不是写死的
- [ ] 修改 `initialInfoCardConfig`，刷新后卡片会变化
- [ ] 字段和按钮用 `map` 渲染，每个都有 `key`
- [ ] 能解释什么是 state，为什么不用普通变量
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- 定义 `InfoCardConfig` 类型
- 用 `useState` 管理配置状态
- `InfoCardPreview` 从 props 读配置

**现在能解释：**
- 什么是 state
- `useState` 的用法
- state 放在哪个组件
- 为什么 `map` 需要 `key`

**明天先做：**
- 做 `BasicConfigForm` 组件
- 让表单能修改标题、副标题、状态
- 表单一改，预览实时更新

## 留给明天的接口

当前数据流：

```text
LowCodeConfigPage
  ├─ config (state)
  └─ PreviewPanel
     └─ InfoCardPreview（从 props 读 config）
```

明天要在 `ConfigPanel` 里加表单，让表单能修改 `config`：

```text
LowCodeConfigPage
  ├─ config (state)
  ├─ setConfig (更新函数)
  ├─ ConfigPanel（接收 config 和 setConfig）
  └─ PreviewPanel（接收 config）
```

<ProgressButton courseId="react-lowcode-course" dayId="day-03-config-state" />
