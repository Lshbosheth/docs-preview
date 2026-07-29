---
title: Day 4 - 属性面板动态生成
---

# Day 4：属性面板动态生成

## 今天完成什么

1. 根据组件的 `meta.props` 自动生成配置表单
2. 支持基础类型：string, number, boolean, enum
3. 修改配置后实时更新预览

## 接在昨天哪里

昨天实现了组件切换和渲染，但配置面板还是写死的 InfoCard 表单。

点击自定义组件后，中间面板显示的还是"标题、副标题、字段列表"这些 InfoCard 专属的配置项。

今天要做的：**根据当前组件的元数据，动态生成配置表单**。

## 核心概念

### 1. Schema 驱动 UI

Schema（模式）描述数据结构，UI 根据 Schema 自动生成。

```json
// Schema 描述
{
  "text": {
    "type": "string",
    "default": "点击我",
    "label": "按钮文字"
  }
}

// 自动生成 UI
<label>按钮文字</label>
<input type="text" value="点击我" />
```

这就是"低代码"的核心：**用数据驱动界面**。

### 2. 类型映射

不同的 Schema 类型对应不同的表单控件：

| Schema Type | HTML Input | 示例 |
|-------------|------------|------|
| string      | `<input type="text">` | 文本输入框 |
| number      | `<input type="number">` | 数字输入框 |
| boolean     | `<input type="checkbox">` | 复选框 |
| enum        | `<select>` | 下拉选择 |

### 3. 表单受控组件

所有输入框的值都来自 state，修改时触发 `onChange`：

```tsx
<input
  value={props.text}
  onChange={(e) => handleChange('text', e.target.value)}
/>
```

## 动手前的目录

今天会新增这个文件：

```text
src/
└─ components/
   └─ DynamicConfigForm.tsx     # 动态配置表单 [新增]
```

还会修改：

```text
src/
└─ components/
   ├─ LowCodeConfigPage.tsx     # 使用动态表单 [修改]
   └─ ConfigPanel.tsx           # 切换表单 [修改]
```

## 分步实现

### 第 1 步：实现动态配置表单

新建 `src/components/DynamicConfigForm.tsx`：

```typescript
import React from 'react';
import { ComponentMeta, PropMeta } from '../types/componentMeta';

interface Props {
  meta: ComponentMeta;
  props: Record<string, any>;
  onChange: (newProps: Record<string, any>) => void;
}

export function DynamicConfigForm({ meta, props, onChange }: Props) {
  // 处理单个字段的变化
  const handleFieldChange = (propName: string, value: any) => {
    onChange({
      ...props,
      [propName]: value
    });
  };

  // 根据类型渲染不同的输入控件
  const renderInput = (propName: string, propMeta: PropMeta) => {
    const value = props[propName] ?? propMeta.default;

    switch (propMeta.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(propName, e.target.value)}
            style={{
              width: '100%',
              padding: '6px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(propName, Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        );

      case 'boolean':
        return (
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleFieldChange(propName, e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontSize: '14px' }}>
              {value ? '是' : '否'}
            </span>
          </label>
        );

      case 'enum':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(propName, e.target.value)}
            style={{
              width: '100%',
              padding: '6px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {propMeta.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <div style={{ color: '#999', fontSize: '12px' }}>
            不支持的类型: {propMeta.type}
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* 组件信息 */}
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
          {meta.icon} {meta.displayName}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {meta.description}
        </div>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
          版本: {meta.version}
        </div>
      </div>

      {/* 属性配置 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
          组件配置
        </div>

        {Object.entries(meta.props).map(([propName, propMeta]) => (
          <div key={propName} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#333' }}>
              {propMeta.label}
            </label>
            
            {propMeta.description && (
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>
                {propMeta.description}
              </div>
            )}

            {renderInput(propName, propMeta)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 第 2 步：修改配置面板

修改 `src/components/ConfigPanel.tsx`，根据当前组件类型切换表单：

```typescript
import React from 'react';
import { InfoCardConfig } from '../types/config';
import { ComponentMeta } from '../types/componentMeta';
import { BasicConfigForm } from '../features/infocard-config/BasicConfigForm';
import { FieldConfigList } from '../features/infocard-config/FieldConfigList';
import { StyleConfigForm } from '../features/infocard-config/StyleConfigForm';
import { ActionConfigList } from '../features/infocard-config/ActionConfigList';
import { DynamicConfigForm } from './DynamicConfigForm';

interface Props {
  // InfoCard 配置（向后兼容）
  config?: InfoCardConfig;
  onChange?: (config: InfoCardConfig) => void;
  
  // 动态组件配置
  componentMeta?: ComponentMeta;
  componentProps?: Record<string, any>;
  onPropsChange?: (props: Record<string, any>) => void;
}

export function ConfigPanel({ 
  config, 
  onChange, 
  componentMeta, 
  componentProps, 
  onPropsChange 
}: Props) {
  // 如果有 componentMeta，说明是自定义组件，用动态表单
  if (componentMeta && componentProps && onPropsChange) {
    return (
      <div style={{
        width: '320px',
        borderRight: '1px solid #e0e0e0',
        overflowY: 'auto',
        backgroundColor: 'white'
      }}>
        <DynamicConfigForm
          meta={componentMeta}
          props={componentProps}
          onChange={onPropsChange}
        />
      </div>
    );
  }

  // 否则用 InfoCard 的专属表单
  if (!config || !onChange) {
    return null;
  }

  return (
    <div style={{
      width: '320px',
      borderRight: '1px solid #e0e0e0',
      overflowY: 'auto',
      backgroundColor: 'white'
    }}>
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>配置面板</h3>
        
        {/* 基础信息 */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>基础信息</h4>
          <BasicConfigForm config={config} onChange={onChange} />
        </div>

        {/* 字段列表 */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>字段列表</h4>
          <FieldConfigList config={config} onChange={onChange} />
        </div>

        {/* 样式配置 */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>样式配置</h4>
          <StyleConfigForm config={config} onChange={onChange} />
        </div>

        {/* 操作按钮 */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>操作按钮</h4>
          <ActionConfigList config={config} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}
```

### 第 3 步：修改主配置页

修改 `src/components/LowCodeConfigPage.tsx`，传递正确的 props 给配置面板：

```typescript
import React, { useState } from 'react';
import { ComponentSidebar } from './ComponentSidebar';
import { ConfigPanel } from './ConfigPanel';
import { PreviewPanel } from './PreviewPanel';
import { InfoCardConfig } from '../types/config';
import { componentRegistry } from '../services/componentRegistry';

export function LowCodeConfigPage() {
  const [infoCardConfig, setInfoCardConfig] = useState<InfoCardConfig>({
    title: '客户信息',
    subtitle: '张三 - VIP客户',
    status: '已激活',
    statusType: 'success',
    showBorder: true,
    fields: [
      { id: '1', label: '手机号', value: '13800138000', visible: true },
      { id: '2', label: '邮箱', value: 'zhang@example.com', visible: true }
    ],
    actions: [
      { id: '1', label: '查看详情', type: 'primary', visible: true }
    ],
    layout: 'vertical',
    size: 'medium',
    accentColor: '#1890ff'
  });

  const [currentComponent, setCurrentComponent] = useState<{
    name: string;
    props: Record<string, any>;
  }>({
    name: 'InfoCard',
    props: {}
  });

  const handleComponentSelect = (componentName: string, defaultProps: Record<string, any>) => {
    setCurrentComponent({
      name: componentName,
      props: defaultProps
    });
  };

  const handlePropsChange = (newProps: Record<string, any>) => {
    setCurrentComponent(prev => ({
      ...prev,
      props: newProps
    }));
  };

  // [新增] 获取当前组件的元数据
  const currentComponentMeta = currentComponent.name !== 'InfoCard'
    ? componentRegistry.get(currentComponent.name)?.meta
    : undefined;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <ComponentSidebar 
        onComponentSelect={handleComponentSelect}
        currentComponentName={currentComponent.name}
      />

      <ConfigPanel
        // InfoCard 配置
        config={currentComponent.name === 'InfoCard' ? infoCardConfig : undefined}
        onChange={currentComponent.name === 'InfoCard' ? setInfoCardConfig : undefined}
        
        // 自定义组件配置
        componentMeta={currentComponentMeta}
        componentProps={currentComponent.name !== 'InfoCard' ? currentComponent.props : undefined}
        onPropsChange={currentComponent.name !== 'InfoCard' ? handlePropsChange : undefined}
      />

      <PreviewPanel
        componentName={currentComponent.name}
        componentProps={currentComponent.name === 'InfoCard' ? infoCardConfig : currentComponent.props}
      />
    </div>
  );
}
```

## 完整代码

今天的文件：

1. **新增** `src/components/DynamicConfigForm.tsx`（动态配置表单）
2. **修改** `src/components/ConfigPanel.tsx`（支持动态表单）
3. **修改** `src/components/LowCodeConfigPage.tsx`（传递元数据）

## 运行效果

启动项目：

```bash
npm run dev
```

### 验证功能

1. **点击 InfoCard**：
   - 中间配置面板显示原来的表单（基础信息、字段列表、样式、按钮）

2. **点击自定义按钮**：
   - 中间配置面板自动切换成动态表单
   - 显示组件信息：图标、名称、描述、版本
   - 显示三个配置项：
     - 按钮文字（文本框）
     - 按钮类型（下拉框：primary / secondary / danger）
     - 是否禁用（复选框）

3. **修改配置**：
   - 把"按钮文字"改成"提交"
   - 右侧预览立即更新，按钮文字变成"提交"
   - 切换"按钮类型"为 danger
   - 右侧按钮变红色

4. **JSON 预览**：
   - 右侧下方显示当前 props
   - 修改配置时 JSON 同步更新

### 预期效果

选中"自定义按钮"，修改配置后：

**中间配置面板**：
```
🔘 自定义按钮
一个支持多种样式的按钮组件
版本: 1.0.0

── 组件配置 ──

按钮文字
[提交____________]

按钮类型
[danger ▼]

是否禁用
☐ 否
```

**右侧预览**：
```
┌──────────┐
│   提交   │  ← 红色按钮
└──────────┘
```

**JSON**：
```json
{
  "text": "提交",
  "variant": "danger",
  "disabled": false
}
```

## 常见错误

### 错误 1：修改配置后预览没更新

**原因**：props 没有正确传递，或者组件没有用 props。

**排查**：
- 在 `handlePropsChange` 里打印 `newProps`
- 检查 `PreviewPanel` 收到的 `componentProps`
- 确认自定义组件用了 props（不是写死的值）

### 错误 2：下拉框没有选项

**原因**：meta.json 里 `options` 字段缺失或为空。

**解决**：
```json
{
  "variant": {
    "type": "enum",
    "options": ["primary", "secondary", "danger"],  // 必须有
    "default": "primary",
    "label": "按钮类型"
  }
}
```

### 错误 3：复选框点击后没反应

**原因**：`checked` 和 `onChange` 没有正确绑定。

**检查**：
```typescript
<input
  type="checkbox"
  checked={value}  // 必须用 checked，不是 value
  onChange={(e) => handleFieldChange(propName, e.target.checked)}  // 用 checked，不是 value
/>
```

### 错误 4：数字输入框输入小数时被截断

**原因**：`Number(e.target.value)` 会把空字符串变成 `0`。

**优化**：
```typescript
onChange={(e) => {
  const val = e.target.value;
  handleFieldChange(propName, val === '' ? '' : Number(val));
}}
```

## 调试技巧

### 1. 打印当前组件元数据

在 `DynamicConfigForm` 开头加：

```typescript
console.log('当前组件元数据:', meta);
console.log('当前 props:', props);
```

### 2. 检查表单变化

在 `handleFieldChange` 里加：

```typescript
console.log('字段变化:', propName, '→', value);
```

### 3. 模拟不同类型的字段

创建一个测试组件，包含所有类型：

```json
{
  "props": {
    "name": { "type": "string", "default": "张三", "label": "姓名" },
    "age": { "type": "number", "default": 25, "label": "年龄" },
    "active": { "type": "boolean", "default": true, "label": "激活" },
    "role": { 
      "type": "enum", 
      "options": ["admin", "user", "guest"], 
      "default": "user", 
      "label": "角色" 
    }
  }
}
```

## 动手改一改

1. **支持颜色选择器**：新增 `color` 类型，用 `<input type="color">`
2. **支持文本域**：新增 `textarea` 类型，用 `<textarea>`
3. **支持数字范围**：扩展 `number` 类型，支持 `min`、`max`、`step`
4. **必填校验**：meta 里加 `required` 字段，空值时显示红色边框

## 验收清单

- [ ] 选中自定义组件后，配置面板自动切换成动态表单
- [ ] 显示组件名称、描述、版本
- [ ] string 类型显示文本框
- [ ] number 类型显示数字输入框
- [ ] boolean 类型显示复选框
- [ ] enum 类型显示下拉框
- [ ] 修改配置后，右侧预览实时更新
- [ ] JSON 预览同步显示当前 props

## 今日总结

### 学到了什么

1. **Schema 驱动 UI**：根据数据结构自动生成界面
2. **类型映射**：不同的 schema type 对应不同的输入控件
3. **动态表单渲染**：遍历 meta.props，渲染对应控件
4. **受控组件模式**：所有输入值来自 state，修改触发 onChange

### 关键代码

```typescript
// 根据类型渲染输入控件
switch (propMeta.type) {
  case 'string':
    return <input type="text" value={value} onChange={...} />;
  case 'number':
    return <input type="number" value={value} onChange={...} />;
  case 'boolean':
    return <input type="checkbox" checked={value} onChange={...} />;
  case 'enum':
    return <select value={value} onChange={...}>...</select>;
}
```

### 今天的突破

**自定义组件的闭环已经打通**：

上传 → 编译 → 注册 → 渲染 → 配置 → 实时预览

用户可以完整地使用自定义组件了！

### 今天的限制

- 只支持单文件组件（Day 5 会支持多文件）
- 不能引用外部库（Day 6 会支持）
- 没有沙箱隔离（Day 7）

### 明天做什么

Day 5 会支持上传整个文件夹，让自定义组件可以拆分成多个文件（主组件 + 子组件 + 工具函数 + 样式）。

---

**核心功能全部打通！接下来是扩展能力。**
