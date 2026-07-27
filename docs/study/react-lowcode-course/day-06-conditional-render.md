---
title: Day 6 - 条件渲染 + 显隐控制
---

# Day 6：条件渲染 + 显隐控制

## 今天完成什么

1. 给字段列表加显隐复选框
2. 理解 React 的条件渲染写法
3. 预览区根据 `visible` 动态显示或隐藏字段

## 接在昨天哪里

昨天做了字段的增删改，`config.fields` 每一项都有 `visible` 字段，但一直没用上。

今天要让它真正生效：勾选 / 取消复选框，右侧卡片跟着变。

## 概念解释

### 条件渲染

React 里有几种条件渲染写法：

**1. 三元运算符（有内容 / 没内容）**

```tsx
{isVisible ? <Component /> : null}
// 或简写
{isVisible ? <Component /> : <></>}
```

**2. && 短路（显示 / 不显示）**

```tsx
{isVisible && <Component />}
```

`isVisible` 为 `true` 时渲染 `<Component />`，为 `false` 时什么都不渲染。

**3. 函数返回不同 JSX**

```tsx
function render() {
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;
  return <Content />;
}
```

本章用 `&&` 和 `filter` 最多。

### filter 过滤不可见项

```tsx
{config.fields
  .filter(field => field.visible)  // 先过滤掉 visible: false
  .map(field => <div key={field.id}>{field.label}</div>)
}
```

这是最干净的写法：渲染前先过滤，不在 JSX 里写复杂判断。

## 动手实现

### 第 1 步：在 FieldConfigList 里加显隐复选框

修改 `src/features/infocard-config/FieldConfigList.tsx`，在每个字段卡片里加复选框：

```tsx
import { InfoCardConfig, InfoCardField } from '../../types/config';

type FieldConfigListProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function FieldConfigList({ config, onChange }: FieldConfigListProps) {
  const handleAddField = () => {
    const newField: InfoCardField = {
      id: `field_${Date.now()}`,
      label: '新字段',
      value: '',
      visible: true
    };
    onChange({ ...config, fields: [...config.fields, newField] });
  };

  const handleDeleteField = (id: string) => {
    onChange({ ...config, fields: config.fields.filter(f => f.id !== id) });
  };

  const handleUpdateField = (id: string, updates: Partial<InfoCardField>) => {
    onChange({
      ...config,
      fields: config.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  return (
    <div>
      <h3>内容字段</h3>

      {config.fields.map(field => (
        <div
          key={field.id}
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: field.visible ? '#fafafa' : '#f0f0f0',
            opacity: field.visible ? 1 : 0.6
          }}
        >
          {/* 顶部：显隐 + 删除 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={field.visible}
                onChange={(e) => handleUpdateField(field.id, { visible: e.target.checked })}
              />
              显示
            </label>
            <button
              onClick={() => handleDeleteField(field.id)}
              style={{
                padding: '2px 10px',
                backgroundColor: '#ff4d4f',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              删除
            </button>
          </div>

          {/* 字段名 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              字段名
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 字段值 */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              字段值
            </label>
            <input
              type="text"
              value={field.value}
              onChange={(e) => handleUpdateField(field.id, { value: e.target.value })}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={handleAddField}
        style={{
          padding: '6px 16px',
          backgroundColor: '#1890ff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        + 新增字段
      </button>
    </div>
  );
}

export default FieldConfigList;
```

### 第 2 步：InfoCardPreview 已经有 filter，验证一下

打开 `src/components/InfoCardPreview.tsx`，确认字段渲染部分是这样的：

```tsx
{config.fields
  .filter(field => field.visible)
  .map(field => (
    <div key={field.id} style={{ marginBottom: '8px' }}>
      <span style={{ color: '#999', fontSize: '14px' }}>{field.label}：</span>
      <span style={{ fontSize: '14px' }}>{field.value}</span>
    </div>
  ))}
```

Day 3 就已经加了 `.filter(field => field.visible)`，今天不用改预览组件，只改配置表单。

## 运行效果

保存后刷新：

1. 每个字段卡片顶部有「显示」复选框
2. 取消勾选，右侧卡片对应字段消失
3. 重新勾选，字段又出现
4. 被隐藏的字段卡片背景变灰、透明度降低，视觉上区分已隐藏

## 常见错误

### 1. && 短路时 0 会被渲染

```tsx
// ❌ 错误：fields.length 为 0 时会渲染出 "0"
{fields.length && <FieldList />}

// ✅ 正确：转成布尔值
{fields.length > 0 && <FieldList />}
// 或者
{!!fields.length && <FieldList />}
```

### 2. filter 后忘记 map

```tsx
// ❌ 错误：filter 返回的还是数组，不是 JSX
{config.fields.filter(f => f.visible)}

// ✅ 正确
{config.fields.filter(f => f.visible).map(f => <div key={f.id}>{f.label}</div>)}
```

### 3. checkbox 用 value 而不是 checked

```tsx
// ❌ 错误：checkbox 用 checked，不是 value
<input type="checkbox" value={field.visible} />

// ✅ 正确
<input type="checkbox" checked={field.visible} onChange={...} />
```

## 动手改一改

1. 给 `ComponentSidebar` 里的组件列表项也加一个状态：选中 / 未选中
2. 只有选中的组件才在配置面板里显示（用 `&&` 条件渲染）

## 验收清单

- [ ] 字段卡片有「显示」复选框
- [ ] 取消勾选，右侧对应字段消失
- [ ] 重新勾选，字段恢复
- [ ] 隐藏的字段卡片有视觉区分（灰底）
- [ ] 能解释 `&&` 和三元运算符的区别
- [ ] 能解释为什么 `&&` 不能直接用数字做判断

## 今日记录

**今天跑通：**
- 复选框控制字段显隐
- `filter` + `map` 的组合渲染
- 条件渲染的几种写法

**现在能解释：**
- `&&` 短路的注意事项
- `filter` 在渲染前过滤数据

**明天先做：**
- 样式配置（布局、尺寸、强调色）
- 动态 className
- CSS 变量注入

## 留给明天的接口

`config.layout`、`config.size`、`config.accentColor` 目前还没用上。

明天要做 `StyleConfigForm`，让这三个字段能被配置，卡片样式跟着变化。
