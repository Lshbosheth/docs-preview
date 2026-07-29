---
title: Day 3 - 组件注册与实例化
---

# Day 3：组件注册与实例化

## 今天完成什么

1. 在左侧组件列表支持选中自定义组件
2. 选中后在右侧预览区实例化并渲染
3. 用 `React.createElement()` 动态创建组件实例

## 接在昨天哪里

昨天完成了组件编译，`component` 字段已经是一个可执行的函数。

但现在点击左侧的自定义组件，预览区还是显示 `InfoCard`，因为没有实现组件切换逻辑。

今天要做的：让平台支持渲染任意组件（内置 + 自定义）。

## 核心概念

### 1. 组件类型与实例

React 组件有两个概念：

- **组件类型**（Component Type）：函数或类，如 `InfoCard`
- **组件实例**（Element）：调用 `React.createElement()` 的结果

```typescript
// 组件类型
const InfoCard: React.ComponentType<InfoCardProps> = ...;

// 组件实例
const element = <InfoCard title="测试" />;
// 等价于
const element = React.createElement(InfoCard, { title: "测试" });
```

### 2. 动态组件渲染

在 JSX 里，组件名必须是大写变量：

```tsx
// ✅ 正确
const CurrentComponent = InfoCard;
return <CurrentComponent title="测试" />;

// ❌ 错误
const currentComponent = InfoCard;
return <currentComponent title="测试" />; // 会被当成 HTML 标签
```

### 3. 当前组件状态

需要一个 state 记录"当前选中的是哪个组件"：

```typescript
const [currentComponentName, setCurrentComponentName] = useState('InfoCard');
```

然后根据名称从注册表取组件：

```typescript
const definition = componentRegistry.get(currentComponentName);
const Component = definition?.component;
```

## 动手前的目录

今天会修改这些文件：

```text
src/
├─ components/
│  ├─ LowCodeConfigPage.tsx      # 增加当前组件状态 [修改]
│  ├─ ComponentSidebar.tsx       # 支持点击切换组件 [修改]
│  └─ PreviewPanel.tsx           # 动态渲染当前组件 [修改]
└─ types/
   └─ config.ts                  # 扩展 config 类型 [修改]
```

## 分步实现

### 第 1 步：扩展配置类型

修改 `src/types/config.ts`，增加"当前组件"字段：

```typescript
// 原有的 InfoCardConfig 保持不变
export interface InfoCardConfig {
  title: string;
  subtitle: string;
  status: string;
  statusType: 'info' | 'success' | 'warning' | 'error';
  showBorder: boolean;
  fields: Field[];
  actions: Action[];
  layout: 'vertical' | 'compact';
  size: 'small' | 'medium';
  accentColor: string;
}

// [新增] 通用组件配置
export interface ComponentConfig {
  /** 当前选中的组件名 */
  componentName: string;
  
  /** 当前组件的 props */
  props: Record<string, any>;
}

// [新增] 页面配置（包含所有组件的配置）
export interface PageConfig {
  /** 当前选中的组件 */
  current: ComponentConfig;
  
  /** InfoCard 的配置（保留向后兼容） */
  infoCard: InfoCardConfig;
}
```

### 第 2 步：修改主配置页

修改 `src/components/LowCodeConfigPage.tsx`，增加当前组件状态：

```typescript
import React, { useState } from 'react';
import { ComponentSidebar } from './ComponentSidebar';
import { ConfigPanel } from './ConfigPanel';
import { PreviewPanel } from './PreviewPanel';
import { PageConfig, InfoCardConfig } from '../types/config';

export function LowCodeConfigPage() {
  // 原有的 InfoCard 配置（保留向后兼容）
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

  // [新增] 当前选中的组件
  const [currentComponent, setCurrentComponent] = useState<{
    name: string;
    props: Record<string, any>;
  }>({
    name: 'InfoCard',
    props: {} // 会用 infoCardConfig 填充
  });

  // [新增] 切换组件
  const handleComponentSelect = (componentName: string, defaultProps: Record<string, any>) => {
    setCurrentComponent({
      name: componentName,
      props: defaultProps
    });
  };

  // [新增] 更新当前组件的 props
  const handlePropsChange = (newProps: Record<string, any>) => {
    setCurrentComponent(prev => ({
      ...prev,
      props: newProps
    }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 左侧：组件列表 */}
      <ComponentSidebar 
        onComponentSelect={handleComponentSelect}
        currentComponentName={currentComponent.name}
      />

      {/* 中间：配置面板 */}
      <ConfigPanel
        config={infoCardConfig}
        onChange={setInfoCardConfig}
      />

      {/* 右侧：预览区 */}
      <PreviewPanel
        componentName={currentComponent.name}
        componentProps={currentComponent.name === 'InfoCard' ? infoCardConfig : currentComponent.props}
      />
    </div>
  );
}
```

### 第 3 步：修改组件侧边栏

修改 `src/components/ComponentSidebar.tsx`，支持点击切换组件：

```typescript
import React, { useState, useEffect } from 'react';
import { ComponentUploader } from './ComponentUploader';
import { componentRegistry } from '../services/componentRegistry';
import { ComponentDefinition } from '../types/componentMeta';

interface Props {
  onComponentSelect: (componentName: string, defaultProps: Record<string, any>) => void;
  currentComponentName: string;
}

export function ComponentSidebar({ onComponentSelect, currentComponentName }: Props) {
  const [customComponents, setCustomComponents] = useState<ComponentDefinition[]>([]);

  const loadCustomComponents = () => {
    setCustomComponents(componentRegistry.getCustomComponents());
  };

  useEffect(() => {
    loadCustomComponents();
  }, []);

  // [新增] 获取组件的默认 props
  const getDefaultProps = (definition: ComponentDefinition): Record<string, any> => {
    const props: Record<string, any> = {};
    Object.entries(definition.meta.props).forEach(([key, propMeta]) => {
      props[key] = propMeta.default;
    });
    return props;
  };

  // [新增] 处理组件点击
  const handleComponentClick = (definition: ComponentDefinition) => {
    const defaultProps = getDefaultProps(definition);
    onComponentSelect(definition.meta.name, defaultProps);
  };

  return (
    <div style={{
      width: '240px',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fafafa',
      overflowY: 'auto'
    }}>
      <ComponentUploader onUploadSuccess={loadCustomComponents} />

      {/* 内置组件 */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
          内置组件
        </div>
        <div
          onClick={() => onComponentSelect('InfoCard', {})}
          style={{
            padding: '12px',
            backgroundColor: currentComponentName === 'InfoCard' ? '#e6f7ff' : 'white',
            border: `1px solid ${currentComponentName === 'InfoCard' ? '#1890ff' : '#e0e0e0'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          📇 InfoCard
        </div>
      </div>

      {/* 自定义组件 */}
      <div style={{ padding: '16px', paddingTop: 0 }}>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
          自定义组件 ({customComponents.length})
        </div>
        
        {customComponents.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', padding: '20px' }}>
            暂无自定义组件
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customComponents.map(def => (
              <div
                key={def.meta.name}
                onClick={() => handleComponentClick(def)}
                style={{
                  padding: '12px',
                  backgroundColor: currentComponentName === def.meta.name ? '#e6f7ff' : 'white',
                  border: `1px solid ${currentComponentName === def.meta.name ? '#1890ff' : '#e0e0e0'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{def.meta.icon || '🧩'}</span>
                  <span>{def.meta.displayName}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  {def.meta.description}
                </div>
                <div style={{ fontSize: '10px', color: '#ccc', marginTop: '4px' }}>
                  v{def.meta.version}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 第 4 步：修改预览面板

修改 `src/components/PreviewPanel.tsx`，动态渲染当前组件：

```typescript
import React, { useMemo } from 'react';
import { InfoCardPreview } from './InfoCardPreview';
import { ConfigJsonViewer } from '../features/infocard-config/ConfigJsonViewer';
import { componentRegistry } from '../services/componentRegistry';
import { InfoCardConfig } from '../types/config';

interface Props {
  componentName: string;
  componentProps: Record<string, any>;
}

export function PreviewPanel({ componentName, componentProps }: Props) {
  // [新增] 动态获取组件
  const CurrentComponent = useMemo(() => {
    // 如果是 InfoCard，用内置组件
    if (componentName === 'InfoCard') {
      return InfoCardPreview;
    }

    // 否则从注册表获取
    const definition = componentRegistry.get(componentName);
    if (!definition || !definition.component) {
      return null;
    }

    return definition.component;
  }, [componentName]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      overflow: 'auto'
    }}>
      {/* 预览区 */}
      <div style={{
        flex: 1,
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {CurrentComponent ? (
          <CurrentComponent {...componentProps} />
        ) : (
          <div style={{ color: '#999', fontSize: '14px' }}>
            组件加载失败或不存在
          </div>
        )}
      </div>

      {/* JSON 预览 */}
      <div style={{
        height: '300px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: 'white',
        overflow: 'auto'
      }}>
        <ConfigJsonViewer config={componentProps} />
      </div>
    </div>
  );
}
```

## 完整代码

今天修改的文件：

1. **修改** `src/types/config.ts`（增加 ComponentConfig 和 PageConfig）
2. **修改** `src/components/LowCodeConfigPage.tsx`（增加当前组件状态）
3. **修改** `src/components/ComponentSidebar.tsx`（支持点击切换）
4. **修改** `src/components/PreviewPanel.tsx`（动态渲染组件）

## 运行效果

启动项目：

```bash
npm run dev
```

### 验证功能

1. **上传自定义组件**（用 Day 1 的 `CustomButton`）

2. **点击 InfoCard**：
   - 左侧 InfoCard 高亮（蓝色边框）
   - 右侧显示 InfoCard 预览

3. **点击自定义按钮**：
   - 左侧自定义按钮高亮
   - 右侧显示自定义按钮（用默认 props）
   - 应该能看到一个蓝色按钮，文字是"点击我"

4. **JSON 预览**：
   - 右侧下方显示当前组件的 props
   - 切换组件时 JSON 也跟着变

### 预期效果

点击"自定义按钮"后，右侧应该显示：

```
┌──────────────┐
│   点击我     │  ← 蓝色按钮
└──────────────┘
```

下方 JSON 显示：

```json
{
  "text": "点击我",
  "variant": "primary",
  "disabled": false
}
```

## 常见错误

### 错误 1：点击自定义组件后，预览区显示"组件加载失败或不存在"

**原因**：组件没有编译成功，或者注册表里找不到。

**排查**：
- 打开控制台，输入 `componentRegistry.get('CustomButton')`
- 检查返回的 `component` 字段是否是函数
- 检查 `componentName` 是否拼写正确

### 错误 2：渲染时报错 `Cannot read property 'text' of undefined`

**原因**：组件没有收到 props。

**排查**：
- 检查 `getDefaultProps` 是否正确生成了默认值
- 在 `PreviewPanel` 里打印 `componentProps`

### 错误 3：自定义组件渲染出来，但样式不对

**原因**：组件的样式可能依赖外部 CSS。

**解决**：
- Day 5 会支持上传 CSS 文件
- 现在暂时把样式写在组件的 inline style 里

### 错误 4：切换组件后，配置面板还是 InfoCard 的表单

**原因**：Day 4 才会做动态配置面板，现在中间面板还是写死的。

**预期**：这是正常的，Day 4 会解决。

## 调试技巧

### 1. 在控制台测试组件

```javascript
// 获取组件
const def = componentRegistry.get('CustomButton');

// 手动创建元素
const element = React.createElement(def.component, {
  text: '测试',
  variant: 'danger',
  disabled: false
});

console.log(element);
```

### 2. 检查组件是否正确传递

在 `PreviewPanel` 的 `return` 前加：

```typescript
console.log('当前组件:', componentName);
console.log('组件 props:', componentProps);
console.log('组件函数:', CurrentComponent);
```

### 3. 检查默认 props

在 `ComponentSidebar` 的 `handleComponentClick` 里加：

```typescript
console.log('默认 props:', defaultProps);
```

## 动手改一改

1. **显示组件类型**：在预览区上方显示"当前组件：CustomButton"
2. **支持快捷键切换**：按上/下箭头键切换组件
3. **记住上次选中的组件**：刷新页面后还是上次选中的组件（localStorage）

## 验收清单

- [ ] 点击左侧组件卡片，右侧预览区能切换
- [ ] 选中的组件卡片有蓝色高亮边框
- [ ] 自定义组件能正确渲染（用默认 props）
- [ ] JSON 预览显示当前组件的 props
- [ ] 切换组件时 JSON 同步更新
- [ ] InfoCard 和自定义组件都能正常显示

## 今日总结

### 学到了什么

1. **动态组件渲染**：用变量存储组件类型，然后 `<Component {...props} />`
2. **从注册表获取组件**：`componentRegistry.get(name)`
3. **默认 props 生成**：根据 meta.props 的 default 字段
4. **组件状态管理**：当前选中哪个组件

### 关键代码

```typescript
// 动态获取组件
const definition = componentRegistry.get(componentName);
const Component = definition?.component;

// 动态渲染
return <Component {...props} />;
```

### 今天的限制

- 配置面板还是写死的 InfoCard 表单（Day 4 会做动态表单）
- 自定义组件只能用默认 props，不能修改配置
- 还不支持多文件组件（Day 5）

### 明天做什么

Day 4 会根据组件的 meta.props 自动生成配置表单，这样就能修改自定义组件的 props 了。

---

**自定义组件已经能渲染了！明天加上动态配置表单，就彻底打通了。**
