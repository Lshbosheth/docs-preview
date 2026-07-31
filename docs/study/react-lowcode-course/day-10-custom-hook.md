---
title: Day 10 - 自定义 Hook：提取复用逻辑
---

# Day 10：自定义 Hook：提取复用逻辑

## 今天完成什么

1. 提取 `useConfigArrayUpdater` 自定义 Hook
2. 简化 `FieldConfigList` 和 `ActionConfigList`
3. 理解自定义 Hook 的命名和复用规则

## 接在昨天哪里

昨天完成了 JSON 预览，现在功能已经全部实现了。

但代码里有重复：`FieldConfigList` 和 `ActionConfigList` 里的增删改逻辑几乎一样。

今天要提取成自定义 Hook。

## 概念解释

### 什么是自定义 Hook

自定义 Hook 就是一个函数，名字以 `use` 开头，里面可以调用其他 Hook。

```tsx
function useCounter(initialValue: number) {
  const [count, setCount] = useState(initialValue);
  const increment = () => setCount(c => c + 1);
  return { count, increment };
}

// 使用
function App() {
  const { count, increment } = useCounter(0);
  return <button onClick={increment}>{count}</button>;
}
```

### 为什么要自定义 Hook

把重复逻辑封装起来，多个组件可以复用：

- **不用 Hook：** 每个组件都写一遍增删改逻辑
- **用 Hook：** 增删改逻辑写一次，多个组件调用

### 命名规则

- 必须以 `use` 开头：`useXxx`
- 驼峰命名：`useConfigArrayUpdater`

这样 React 才能识别它是 Hook，才能在里面调用其他 Hook。

### 自定义 Hook 的参数和返回值

可以接收任意参数，返回任意值：

```tsx
function useSomething(param1, param2) {
  // ...
  return { data, loading, error };
}
```

就是普通函数，没有特殊限制。

## 动手实现

### 第 1 步：提取自定义 Hook

新建 `src/hooks/useConfigArrayUpdater.ts`：

```tsx
import { InfoCardConfig } from '../types/config';

type ArrayKey = 'fields' | 'actions';

export function useConfigArrayUpdater<T extends { id: string }>(
  config: InfoCardConfig,
  onChange: (config: InfoCardConfig) => void,
  arrayKey: ArrayKey
) {
  const array = config[arrayKey] as T[];

  const handleAdd = (newItem: T) => {
    onChange({
      ...config,
      [arrayKey]: [...array, newItem]
    });
  };

  const handleDelete = (id: string) => {
    onChange({
      ...config,
      [arrayKey]: array.filter(item => item.id !== id)
    });
  };

  const handleUpdate = (id: string, updates: Partial<T>) => {
    onChange({
      ...config,
      [arrayKey]: array.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  return {
    items: array,
    handleAdd,
    handleDelete,
    handleUpdate
  };
}
```

### 第 2 步：用 Hook 简化 FieldConfigList

修改 `src/features/infocard-config/FieldConfigList.tsx`：

```tsx
import { InfoCardConfig, InfoCardField } from '../../types/config';
import { useConfigArrayUpdater } from '../../hooks/useConfigArrayUpdater';

type FieldConfigListProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function FieldConfigList({ config, onChange }: FieldConfigListProps) {
  const { items: fields, handleAdd, handleDelete, handleUpdate } =
    useConfigArrayUpdater<InfoCardField>(config, onChange, 'fields');

  const handleAddField = () => {
    const newField: InfoCardField = {
      id: `field_${Date.now()}`,
      label: '新字段',
      value: '',
      visible: true
    };
    handleAdd(newField);
  };

  return (
    <div>
      <h3>内容字段</h3>

      {fields.map(field => (
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
                onChange={(e) => handleUpdate(field.id, { visible: e.target.checked })}
              />
              显示
            </label>
            <button
              onClick={() => handleDelete(field.id)}
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

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              字段名
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => handleUpdate(field.id, { label: e.target.value })}
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

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              字段值
            </label>
            <input
              type="text"
              value={field.value}
              onChange={(e) => handleUpdate(field.id, { value: e.target.value })}
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

### 第 3 步：用 Hook 简化 ActionConfigList

修改 `src/features/infocard-config/ActionConfigList.tsx`：

```tsx
import { InfoCardAction, InfoCardConfig } from '../../types/config';
import { useConfigArrayUpdater } from '../../hooks/useConfigArrayUpdater';

type ActionConfigListProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function ActionConfigList({ config, onChange }: ActionConfigListProps) {
  const { items: actions, handleAdd, handleDelete, handleUpdate } =
    useConfigArrayUpdater<InfoCardAction>(config, onChange, 'actions');

  const handleAddAction = () => {
    const newAction: InfoCardAction = {
      id: `action_${Date.now()}`,
      text: '新按钮',
      type: 'default',
      visible: true
    };
    handleAdd(newAction);
  };

  return (
    <div>
      <h3>操作按钮</h3>

      {actions.map(action => (
        <div
          key={action.id}
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: action.visible ? '#fafafa' : '#f0f0f0',
            opacity: action.visible ? 1 : 0.6
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={action.visible}
                onChange={(e) => handleUpdate(action.id, { visible: e.target.checked })}
              />
              显示
            </label>
            <button
              onClick={() => handleDelete(action.id)}
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

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              按钮文案
            </label>
            <input
              type="text"
              value={action.text}
              onChange={(e) => handleUpdate(action.id, { text: e.target.value })}
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

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              按钮类型
            </label>
            <select
              value={action.type}
              onChange={(e) => handleUpdate(action.id, {
                type: e.target.value as InfoCardAction['type']
              })}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="primary">主要（蓝色实心）</option>
              <option value="default">默认（白色边框）</option>
            </select>
          </div>
        </div>
      ))}

      <button
        onClick={handleAddAction}
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
        + 新增按钮
      </button>
    </div>
  );
}

export default ActionConfigList;
```

## 当前目录结构

```text
src/
├─ types/config.ts
├─ hooks/
│  └─ useConfigArrayUpdater.ts
├─ components/
│  ├─ LowCodeConfigPage.tsx
│  ├─ ComponentSidebar.tsx
│  ├─ ConfigPanel.tsx
│  ├─ PreviewPanel.tsx
│  └─ InfoCardPreview.tsx
└─ features/
   └─ infocard-config/
      ├─ BasicConfigForm.tsx
      ├─ FieldConfigList.tsx
      ├─ StyleConfigForm.tsx
      ├─ ActionConfigList.tsx
      └─ ConfigJsonViewer.tsx
```

## 运行效果

保存后刷新，功能和之前一模一样，但代码更简洁了。

两个组件的增删改逻辑都复用了同一个 Hook。

## 常见错误

### 1. Hook 名字不以 use 开头

```tsx
// ❌ 错误：React 不认为它是 Hook
function configArrayUpdater() { ... }

// ✅ 正确
function useConfigArrayUpdater() { ... }
```

### 2. 在普通函数里调用 Hook

```tsx
// ❌ 错误
function handleClick() {
  const [count, setCount] = useState(0);  // Hook 只能在组件或 Hook 里调用
}

// ✅ 正确：在组件里
function Component() {
  const [count, setCount] = useState(0);
  const handleClick = () => setCount(c => c + 1);
}
```

### 3. 条件调用 Hook

```tsx
// ❌ 错误
if (someCondition) {
  const value = useCustomHook();  // Hook 不能在条件里调用
}

// ✅ 正确
const value = useCustomHook();
if (someCondition) {
  // 使用 value
}
```

Hook 必须在组件顶层调用，不能在 if / for / 普通函数里。

## 动手改一改

1. 提取一个 `useLocalStorage` Hook
2. 把 `config` 自动保存到 `localStorage`
3. 刷新页面后能恢复上次的配置

提示：

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

## 验收清单

- [ ] 功能和之前一样，没有破坏
- [ ] `FieldConfigList` 用了 Hook
- [ ] `ActionConfigList` 用了 Hook
- [ ] 两个组件代码更简洁了
- [ ] 能解释自定义 Hook 的命名规则
- [ ] 能解释 Hook 调用的限制
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- 自定义 Hook 提取复用逻辑
- 泛型 Hook（`useConfigArrayUpdater<T>`）

**现在能解释：**
- 自定义 Hook 为什么要 `use` 开头
- Hook 为什么不能在条件里调用
- 如何判断一段逻辑该不该提取成 Hook

**明天先做：**
- `useCallback` 稳定回调引用
- `React.memo` 避免子组件无效重渲染

## 留给明天的接口

当前每次 `config` 变化，所有子组件都会重新渲染，即使它们的 props 没变。

明天要用 `React.memo` + `useCallback` 优化性能。

<ProgressButton courseId="react-lowcode-course" dayId="day-10-custom-hook" />
