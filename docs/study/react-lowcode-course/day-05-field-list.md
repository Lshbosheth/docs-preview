---
title: Day 5 - 数组操作：字段列表增删改
---

# Day 5：数组操作：字段列表增删改

## 今天完成什么

1. 做 `FieldConfigList` 组件
2. 支持新增字段、删除字段、修改字段
3. 理解数组的不可变更新

## 接在昨天哪里

昨天做了 `BasicConfigForm`，能修改标题、副标题、状态这些单个字段了。

今天要处理 `config.fields` 数组，支持增删改。

## 概念解释

### 为什么数组不能直接 push / splice

```tsx
// ❌ 错误：直接修改原数组
config.fields.push(newField);
setConfig(config);  // React 认为 config 引用没变，不会重新渲染
```

React 通过对比引用判断是否需要重新渲染。直接修改数组，引用没变，React 检测不到。

```tsx
// ✅ 正确：创建新数组
setConfig({
  ...config,
  fields: [...config.fields, newField]  // 新数组
});
```

### 数组不可变更新的三种操作

**新增（尾部）**

```tsx
const newFields = [...prevFields, newItem];
```

**删除**

```tsx
const newFields = prevFields.filter(field => field.id !== idToDelete);
```

**修改**

```tsx
const newFields = prevFields.map(field =>
  field.id === idToUpdate
    ? { ...field, label: newLabel }  // 修改这一项
    : field  // 其他项不变
);
```

### 为什么 map 需要 key

```tsx
{fields.map(field => (
  <div key={field.id}>...</div>
))}
```

`key` 帮助 React 识别哪个元素变了，避免无效重渲染。

**千万不要用索引做 key：**

```tsx
// ❌ 错误：删除第一项后，所有索引都变了，React 会重新渲染整个列表
{fields.map((field, index) => <div key={index}>...</div>)}

// ✅ 正确：用唯一 ID
{fields.map(field => <div key={field.id}>...</div>)}
```

## 动手实现

### 第 1 步：新建 FieldConfigList

新建 `src/features/infocard-config/FieldConfigList.tsx`：

```tsx
import { InfoCardConfig, InfoCardField } from '../../types/config';

type FieldConfigListProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function FieldConfigList({ config, onChange }: FieldConfigListProps) {
  // 新增字段
  const handleAddField = () => {
    const newField: InfoCardField = {
      id: `field_${Date.now()}`,  // 用时间戳生成唯一 ID
      label: '新字段',
      value: '',
      visible: true
    };
    onChange({
      ...config,
      fields: [...config.fields, newField]
    });
  };

  // 删除字段
  const handleDeleteField = (id: string) => {
    onChange({
      ...config,
      fields: config.fields.filter(field => field.id !== id)
    });
  };

  // 修改字段
  const handleUpdateField = (id: string, updates: Partial<InfoCardField>) => {
    onChange({
      ...config,
      fields: config.fields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      )
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
            backgroundColor: '#fafafa'
          }}
        >
          {/* 字段标签 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
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
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
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

          {/* 删除按钮 */}
          <button
            onClick={() => handleDeleteField(field.id)}
            style={{
              padding: '4px 12px',
              backgroundColor: '#ff4d4f',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            删除
          </button>
        </div>
      ))}

      {/* 新增按钮 */}
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

### 第 2 步：在 ConfigPanel 里加上字段列表

修改 `src/components/ConfigPanel.tsx`：

```tsx
import BasicConfigForm from '../features/infocard-config/BasicConfigForm';
import FieldConfigList from '../features/infocard-config/FieldConfigList';
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
    </div>
  );
}

export default ConfigPanel;
```

## 当前目录结构

```text
src/
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
      ├─ BasicConfigForm.tsx
      └─ FieldConfigList.tsx
```

## 运行效果

保存后刷新：

1. 配置面板下方出现「内容字段」区域
2. 显示现有 3 个字段：联系人、手机号、来源
3. 点「+ 新增字段」，会在最下面加一个「新字段」
4. 修改字段名，右侧卡片实时更新
5. 点「删除」，字段消失，右侧卡片也同步消失

## 常见错误

### 1. 直接 push 到原数组

```tsx
// ❌ 错误
const newField = { ... };
config.fields.push(newField);
onChange(config);  // React 检测不到变化

// ✅ 正确
onChange({
  ...config,
  fields: [...config.fields, newField]
});
```

### 2. splice 删除

```tsx
// ❌ 错误
config.fields.splice(index, 1);
onChange(config);

// ✅ 正确
onChange({
  ...config,
  fields: config.fields.filter(field => field.id !== id)
});
```

### 3. map 修改时漏掉其他项

```tsx
// ❌ 错误：只返回修改的那一项
fields: config.fields.map(field =>
  field.id === id ? { ...field, label: newLabel } : undefined  // 其他项变 undefined 了
)

// ✅ 正确：其他项原样返回
fields: config.fields.map(field =>
  field.id === id ? { ...field, label: newLabel } : field
)
```

### 4. key 用索引

```tsx
// ❌ 错误
{fields.map((field, index) => <div key={index}>...</div>)}

// ✅ 正确
{fields.map(field => <div key={field.id}>...</div>)}
```

删除第一项后，索引全变了，React 会错误地重新渲染。

### 5. ID 冲突

```tsx
// ❌ 可能冲突
id: Math.random().toString()  // 极小概率重复

// ✅ 更安全
id: `field_${Date.now()}_${Math.random()}`
// 或者用库：import { v4 as uuid } from 'uuid'
```

## 动手改一改

1. 给每个字段卡片加一个「上移」「下移」按钮
2. 实现交换数组中两个元素的位置

提示：

```tsx
const handleMoveUp = (index: number) => {
  if (index === 0) return;  // 已经在最上面
  const newFields = [...config.fields];
  [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
  onChange({ ...config, fields: newFields });
};
```

## 验收清单

- [ ] 能看到现有 3 个字段
- [ ] 点「+ 新增字段」，会在最下面加一个字段
- [ ] 修改字段名，右侧卡片实时更新
- [ ] 修改字段值，右侧卡片实时更新
- [ ] 点「删除」，字段消失，右侧也同步
- [ ] 能解释为什么不能直接 push / splice
- [ ] 能解释为什么 key 不能用索引
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- 数组的不可变更新：新增 / 删除 / 修改
- `map` 渲染列表，`key` 的作用
- 提取 handler 函数处理复杂逻辑

**现在能解释：**
- 为什么不能直接修改数组
- `filter` 删除、`map` 修改、`[...arr, item]` 新增
- `key` 为什么不能用索引

**明天先做：**
- 字段显隐控制
- 条件渲染

## 留给明天的接口

当前 `config.fields` 每一项都有 `visible` 字段，但还没用上。

明天要加一个复选框控制显隐：

- 取消勾选 → `visible: false` → 右侧卡片隐藏该字段
- 重新勾选 → `visible: true` → 右侧卡片显示该字段

<ProgressButton courseId="react-lowcode-course" dayId="day-05-field-list" />
