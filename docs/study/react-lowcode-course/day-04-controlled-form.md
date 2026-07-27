---
title: Day 4 - 受控表单：修改标题实时更新
---

# Day 4：受控表单：修改标题实时更新

## 今天完成什么

1. 做 `BasicConfigForm` 组件
2. 支持修改标题、副标题、状态文案、状态类型、是否显示边框
3. 表单一改，右侧预览实时更新

## 接在昨天哪里

昨天用 `useState` 管理了 `config`，预览能从 `config` 读数据了。

但配置是写死的，用户没法修改。今天要加表单。

## 概念解释

### 受控表单是什么

React 中，表单输入分两种：

**非受控（不推荐）：** 数据由 DOM 自己管理

```tsx
<input />  // React 不管它，你要用 ref 才能取值
```

**受控（推荐）：** 数据由 state 管理

```tsx
<input
  value={config.title}
  onChange={(e) => setConfig({ ...config, title: e.target.value })}
/>
```

受控的好处：数据来源唯一，state 变 → 界面变，始终同步。

### onChange 事件

`onChange` 在每次输入内容改变时触发：

```tsx
<input
  value={title}
  onChange={(e) => {
    console.log(e.target.value);  // 用户输入的新值
    setTitle(e.target.value);
  }}
/>
```

`e.target.value` 就是当前输入框的值。

### 对象的展开更新

每次只改一个字段，要保留其他字段：

```tsx
// 只改 title，其他不变
setConfig({
  ...config,       // 先展开所有旧字段
  title: newTitle  // 再覆盖要改的字段
});
```

这是"浅拷贝 + 覆盖"的模式，React 能检测到新对象，会重新渲染。

## 动手实现

### 第 1 步：新建 BasicConfigForm

新建 `src/features/infocard-config/BasicConfigForm.tsx`：

```tsx
import { InfoCardConfig } from '../../types/config';

type BasicConfigFormProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function BasicConfigForm({ config, onChange }: BasicConfigFormProps) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>基础信息</h3>

      {/* 标题 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          标题
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* 副标题 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          副标题
        </label>
        <input
          type="text"
          value={config.subtitle}
          onChange={(e) => onChange({ ...config, subtitle: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* 状态文案 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          状态文案
        </label>
        <input
          type="text"
          value={config.statusText}
          onChange={(e) => onChange({ ...config, statusText: e.target.value })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* 状态类型 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          状态类型
        </label>
        <select
          value={config.statusType}
          onChange={(e) => onChange({
            ...config,
            statusType: e.target.value as InfoCardConfig['statusType']
          })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="default">默认（灰色）</option>
          <option value="success">成功（绿色）</option>
          <option value="warning">警告（黄色）</option>
          <option value="danger">危险（红色）</option>
        </select>
      </div>

      {/* 是否显示边框 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={config.showBorder}
            onChange={(e) => onChange({ ...config, showBorder: e.target.checked })}
          />
          显示边框
        </label>
      </div>
    </div>
  );
}

export default BasicConfigForm;
```

### 第 2 步：让 ConfigPanel 接收 config 和 onChange

修改 `src/components/ConfigPanel.tsx`：

```tsx
import BasicConfigForm from '../features/infocard-config/BasicConfigForm';
import { InfoCardConfig } from '../types/config';

type ConfigPanelProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  return (
    <div style={{
      flex: '1',
      padding: '20px',
      overflowY: 'auto',
      borderRight: '1px solid #ddd'
    }}>
      <h2 style={{ marginTop: 0 }}>配置面板</h2>
      <BasicConfigForm config={config} onChange={onChange} />
    </div>
  );
}

export default ConfigPanel;
```

### 第 3 步：在 LowCodeConfigPage 里传 onChange

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
      <ConfigPanel config={config} onChange={setConfig} />
      <PreviewPanel config={config} />
    </div>
  );
}

export default LowCodeConfigPage;
```

注意：`onChange={setConfig}` 直接把 `setConfig` 传进去，因为它的签名就是 `(config: InfoCardConfig) => void`，完全匹配。

## 当前目录结构

```text
src/
├─ App.tsx
├─ main.tsx
├─ types/
│  └─ config.ts
├─ components/
│  ├─ LowCodeConfigPage.tsx
│  ├─ ComponentSidebar.tsx
│  ├─ ConfigPanel.tsx
│  ├─ PreviewPanel.tsx
│  └─ InfoCardPreview.tsx
└─ features/
   └─ infocard-config/
      └─ BasicConfigForm.tsx
```

## 运行效果

保存后浏览器刷新，中间配置面板会出现表单。

修改「标题」输入框，右侧卡片标题实时跟着变。

切换状态类型下拉框，右侧状态标签颜色实时变化。

取消「显示边框」复选框，右侧卡片边框消失。

## 常见错误

### 1. 忘记 value 绑定（单向变成非受控）

```tsx
// ❌ 错误：没有 value，输入框不受 state 控制
<input onChange={(e) => onChange({ ...config, title: e.target.value })} />

// ✅ 正确：必须有 value
<input
  value={config.title}
  onChange={(e) => onChange({ ...config, title: e.target.value })}
/>
```

### 2. 忘记 onChange（输入框变成只读）

```tsx
// ❌ 错误：有 value 没有 onChange，输入框不能改
<input value={config.title} />
// 控制台会报警告：You provided a `value` prop without an `onChange` handler

// ✅ 正确
<input value={config.title} onChange={...} />
```

### 3. 直接修改 config 对象

```tsx
// ❌ 错误
onChange({
  ...config,
  title: e.target.value,
  statusType: config.statusType = e.target.value  // 直接赋值！
});

// ✅ 正确
onChange({
  ...config,
  statusType: e.target.value as InfoCardConfig['statusType']
});
```

### 4. select 的类型转换

```tsx
// ❌ 可能类型报错
onChange({ ...config, statusType: e.target.value });

// ✅ 需要类型断言
onChange({ ...config, statusType: e.target.value as InfoCardConfig['statusType'] });
```

`select` 的 `e.target.value` 类型是 `string`，但 `statusType` 是联合类型，需要断言。

## 动手改一改

1. 给表单加一个「公司类型」下拉，可选值：`一般客户 / 重要客户 / VIP`
2. 先在 `InfoCardConfig` 类型里加这个字段
3. 在 `initialInfoCardConfig` 里加默认值
4. 在 `BasicConfigForm` 里加下拉，在 `InfoCardPreview` 里显示出来

## 验收清单

- [ ] 配置面板出现表单
- [ ] 修改标题，右侧卡片实时更新
- [ ] 修改状态文案，卡片状态标签实时更新
- [ ] 切换状态类型，卡片颜色实时变化
- [ ] 取消边框复选框，卡片边框消失
- [ ] 能解释受控表单和非受控表单的区别
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- 受控表单的三种输入：`input`、`select`、`checkbox`
- `onChange` 回调向上更新 state
- 对象展开更新（`{ ...config, field: value }`）

**现在能解释：**
- 受控表单为什么要同时有 `value` 和 `onChange`
- 为什么要用 `{ ...config }` 而不是直接修改 config

**明天先做：**
- 字段列表的增删改
- 数组的不可变更新
- 字段显隐控制

## 留给明天的接口

当前数据流完整了：

```text
LowCodeConfigPage
  ├─ config (state)
  ├─ ConfigPanel（能修改 config.title/subtitle/statusText/statusType/showBorder）
  └─ PreviewPanel（实时展示 config）
```

明天要在 `ConfigPanel` 里加 `FieldConfigList`，处理 `config.fields` 数组的增删改。
