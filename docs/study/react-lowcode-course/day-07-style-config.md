---
title: Day 7 - 样式配置：动态 className + CSS 变量
---

# Day 7：样式配置：动态 className + CSS 变量

## 今天完成什么

1. 做 `StyleConfigForm` 组件
2. 支持布局、尺寸、强调色配置
3. 让 InfoCard 样式根据配置动态变化

## 接在昨天哪里

昨天做了字段显隐控制，`config` 里有三个样式字段还没用上：

- `layout`：布局方式（纵向 / 紧凑）
- `size`：卡片尺寸（小 / 中）
- `accentColor`：强调色（状态标签背景色）

今天要让它们生效。

## 概念解释

### 动态 className

根据 props 或 state 动态拼接 class 名：

```tsx
<div className={`card ${config.size === 'small' ? 'card-small' : 'card-medium'}`}>
```

或者用对象：

```tsx
<div className={`card card-${config.size} card-${config.layout}`}>
```

更复杂的可以用工具函数：

```tsx
function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

<div className={classNames('card', config.showBorder && 'card-border')}>
```

### CSS 变量（自定义属性）

CSS 变量能从 JS 动态注入值：

```tsx
<div style={{ '--accent-color': config.accentColor }}>
```

CSS 里引用：

```css
.status {
  background-color: var(--accent-color);
}
```

这样不用每次都写 inline style，保持样式规则在 CSS。

### 为什么用 CSS 变量而不是直接 inline style

**inline style 的问题：**

```tsx
<span style={{ backgroundColor: statusColors[config.statusType] }}>
```

每次颜色变了，整个 style 对象都是新的，React 可能做多余的 DOM 更新。

**CSS 变量更优雅：**

```tsx
<div style={{ '--status-color': statusColors[config.statusType] }}>
  <span className="status">{config.statusText}</span>
</div>
```

CSS 里统一管理样式，JS 只负责注入动态值。

## 动手实现

### 第 1 步：新建 StyleConfigForm

新建 `src/features/infocard-config/StyleConfigForm.tsx`：

```tsx
import { InfoCardConfig } from '../../types/config';

type StyleConfigFormProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function StyleConfigForm({ config, onChange }: StyleConfigFormProps) {
  return (
    <div>
      <h3>样式设置</h3>

      {/* 布局 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          布局方式
        </label>
        <select
          value={config.layout}
          onChange={(e) => onChange({
            ...config,
            layout: e.target.value as InfoCardConfig['layout']
          })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="vertical">纵向（标准）</option>
          <option value="compact">紧凑（横向）</option>
        </select>
      </div>

      {/* 尺寸 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          卡片尺寸
        </label>
        <select
          value={config.size}
          onChange={(e) => onChange({
            ...config,
            size: e.target.value as InfoCardConfig['size']
          })}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="small">小</option>
          <option value="medium">中</option>
        </select>
      </div>

      {/* 强调色 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          强调色
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            value={config.accentColor}
            onChange={(e) => onChange({ ...config, accentColor: e.target.value })}
            style={{
              width: '50px',
              height: '32px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          />
          <input
            type="text"
            value={config.accentColor}
            onChange={(e) => onChange({ ...config, accentColor: e.target.value })}
            placeholder="#52c41a"
            style={{
              flex: 1,
              padding: '6px 8px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default StyleConfigForm;
```

### 第 2 步：在 ConfigPanel 里加上样式配置

修改 `src/components/ConfigPanel.tsx`：

```tsx
import BasicConfigForm from '../features/infocard-config/BasicConfigForm';
import FieldConfigList from '../features/infocard-config/FieldConfigList';
import StyleConfigForm from '../features/infocard-config/StyleConfigForm';
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

      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

      <FieldConfigList config={config} onChange={onChange} />

      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

      <StyleConfigForm config={config} onChange={onChange} />
    </div>
  );
}

export default ConfigPanel;
```

### 第 3 步：让 InfoCardPreview 响应样式配置

修改 `src/components/InfoCardPreview.tsx`：

```tsx
import { InfoCardConfig } from '../types/config';

type InfoCardPreviewProps = {
  config: InfoCardConfig;
};

function InfoCardPreview({ config }: InfoCardPreviewProps) {
  const statusColors = {
    default: '#d9d9d9',
    success: '#52c41a',
    warning: '#faad14',
    danger: '#f5222d'
  };

  const statusBgColor = statusColors[config.statusType];

  // 根据 layout 和 size 决定样式
  const isCompact = config.layout === 'compact';
  const isSmall = config.size === 'small';

  const cardPadding = isSmall ? '12px' : '16px';
  const titleSize = isSmall ? '16px' : '18px';
  const textSize = isSmall ? '13px' : '14px';

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: config.showBorder ? '1px solid #e0e0e0' : 'none',
        borderRadius: '8px',
        padding: cardPadding,
        maxWidth: '400px',
        // CSS 变量注入
        ['--accent-color' as any]: config.accentColor
      }}
    >
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        flexDirection: isCompact ? 'row' : 'column',
        justifyContent: isCompact ? 'space-between' : 'flex-start',
        alignItems: isCompact ? 'center' : 'flex-start',
        marginBottom: '12px',
        gap: isCompact ? '12px' : '4px'
      }}>
        <div style={{ flex: isCompact ? 1 : 'none' }}>
          <h3 style={{ margin: 0, fontSize: titleSize }}>{config.title}</h3>
          {!isCompact && (
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: textSize }}>
              {config.subtitle}
            </p>
          )}
        </div>
        <span style={{
          padding: isSmall ? '2px 8px' : '4px 12px',
          backgroundColor: statusBgColor,
          color: '#fff',
          borderRadius: '4px',
          fontSize: isSmall ? '11px' : '12px',
          whiteSpace: 'nowrap'
        }}>
          {config.statusText}
        </span>
      </div>

      {/* 紧凑模式下副标题放到字段前面 */}
      {isCompact && config.subtitle && (
        <p style={{ margin: '0 0 8px', color: '#666', fontSize: textSize }}>
          {config.subtitle}
        </p>
      )}

      {/* 字段列表 */}
      {config.fields.filter(f => f.visible).length > 0 && (
        <div style={{
          borderTop: '1px solid #f0f0f0',
          paddingTop: '12px',
          marginBottom: '12px'
        }}>
          {config.fields
            .filter(field => field.visible)
            .map(field => (
              <div key={field.id} style={{ marginBottom: '8px' }}>
                <span style={{ color: '#999', fontSize: textSize }}>{field.label}：</span>
                <span style={{ fontSize: textSize }}>{field.value}</span>
              </div>
            ))}
        </div>
      )}

      {/* 操作按钮 */}
      {config.actions.filter(a => a.visible).length > 0 && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {config.actions
            .filter(action => action.visible)
            .map(action => (
              <button
                key={action.id}
                style={{
                  padding: isSmall ? '4px 12px' : '6px 16px',
                  backgroundColor: action.type === 'primary' ? '#1890ff' : '#fff',
                  color: action.type === 'primary' ? '#fff' : '#333',
                  border: action.type === 'primary' ? 'none' : '1px solid #d9d9d9',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: textSize
                }}
                onClick={() => alert(`点击了：${action.text}`)}
              >
                {action.text}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default InfoCardPreview;
```

## 运行效果

保存后刷新：

1. 配置面板最下方出现「样式设置」区域
2. 切换「布局方式」为「紧凑」，卡片变成横向布局
3. 切换「卡片尺寸」为「小」，字体和间距变小
4. 点颜色选择器或输入框修改强调色，状态标签颜色跟着变

## 常见错误

### 1. CSS 变量名没加引号

```tsx
// ❌ 错误
style={{ --accent-color: color }}  // 语法错误

// ✅ 正确
style={{ '--accent-color': color }}
// 或者用类型断言
style={{ ['--accent-color' as any]: color }}
```

### 2. 动态 className 拼接时有空格问题

```tsx
// ❌ 可能产生 "card card-small" 或 "card  " 多余空格
className={`card ${config.size === 'small' ? 'card-small' : ''}`}

// ✅ 用 filter 去掉空字符串
className={['card', config.size === 'small' && 'card-small'].filter(Boolean).join(' ')}
```

### 3. 颜色输入框没同步

```tsx
// ❌ 一个改了另一个不跟
<input type="color" value={color} onChange={...} />
<input type="text" value={anotherColor} onChange={...} />

// ✅ 都绑定同一个 state
<input type="color" value={config.accentColor} onChange={(e) => onChange({ ...config, accentColor: e.target.value })} />
<input type="text" value={config.accentColor} onChange={(e) => onChange({ ...config, accentColor: e.target.value })} />
```

## 动手改一改

1. 加一个「卡片圆角」配置（`0px` / `4px` / `8px` / `16px`）
2. 在 `InfoCardConfig` 里加 `borderRadius` 字段
3. 在 `StyleConfigForm` 里加下拉框
4. 在 `InfoCardPreview` 里应用 `borderRadius`

## 验收清单

- [ ] 能看到「样式设置」区域
- [ ] 切换布局，卡片在纵向 / 横向之间切换
- [ ] 切换尺寸，卡片字体和间距变化
- [ ] 修改强调色，状态标签颜色实时更新
- [ ] 能解释动态 className 的写法
- [ ] 能解释 CSS 变量的用法
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- 样式配置表单
- 动态 className
- CSS 变量注入
- 条件判断控制布局

**现在能解释：**
- 为什么用 CSS 变量而不是直接 inline style
- 动态 className 的几种拼接方式

**明天先做：**
- 操作按钮配置（复用字段列表的逻辑）
- 按钮类型切换

## 留给明天的接口

`config.actions` 数组目前是写死的，和 `fields` 一样需要增删改。

明天要做 `ActionConfigList`，逻辑和 `FieldConfigList` 几乎一样。

<ProgressButton courseId="react-lowcode-course" dayId="day-07-style-config" />
