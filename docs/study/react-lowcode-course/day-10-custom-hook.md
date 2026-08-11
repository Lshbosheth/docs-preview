---
title: Day 10 - 自定义 Hook：提取复用逻辑
---

# Day 10：自定义 Hook：提取复用逻辑

## 今天完成什么

1. 提取 `useInfoCardConfigEditor` 自定义 Hook
2. 简化 `FieldConfigList` 和 `ActionConfigList`
3. 区分自定义 Hook 和普通工具函数

## 接在昨天哪里

昨天完成了 JSON 预览，现在功能已经全部实现了。

但代码里有两层重复：`FieldConfigList` 和 `ActionConfigList` 都在做数组增删改，也都要把新数组写回 `InfoCardConfig`。

今天把通用数组算法留在普通函数里，再用自定义 Hook 组合成 InfoCard 配置编辑能力。

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

- **普通函数：** 复用与 React 无关的数组增删改算法
- **自定义 Hook：** 调用 React Hook，组合 `InfoCardConfig` 的状态相关逻辑

### 命名规则

- 必须以 `use` 开头：`useXxx`
- 驼峰命名：`useInfoCardConfigEditor`

以 `use` 开头是自定义 Hook 的约定，便于 React lint 工具检查调用规则。反过来，如果一个函数不调用任何 Hook，就不要只为了“看起来像 Hook”而加 `use` 前缀。

### 自定义 Hook 的参数和返回值

可以接收任意参数，返回任意值：

```tsx
function useSomething(param1, param2) {
  // ...
  return { data, loading, error };
}
```

参数和返回值没有固定格式；但如果函数内部调用了 React Hook，调用位置仍必须遵守 Hook 规则。

## 动手实现

### 第 1 步：提取普通数组编辑器和自定义 Hook

新建 `src/hooks/useInfoCardConfigEditor.ts`：

```tsx
import { useMemo } from 'react';
import type {
  InfoCardAction,
  InfoCardConfig,
  InfoCardField
} from '../types/config';

type ConfigItem = { id: string };

type ArrayEditor<T extends ConfigItem> = {
  items: T[];
  handleAdd: (newItem: T) => void;
  handleDelete: (id: string) => void;
  handleUpdate: (id: string, updates: Partial<T>) => void;
};

function createArrayEditor<T extends ConfigItem>(
  items: T[],
  onChange: (items: T[]) => void
): ArrayEditor<T> {
  return {
    items,
    handleAdd: (newItem) => onChange([...items, newItem]),
    handleDelete: (id) => {
      onChange(items.filter(item => item.id !== id));
    },
    handleUpdate: (id, updates) => {
      onChange(items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ));
    }
  };
}

type InfoCardConfigEditor = {
  fields: ArrayEditor<InfoCardField>;
  actions: ArrayEditor<InfoCardAction>;
};

export function useInfoCardConfigEditor(
  config: InfoCardConfig,
  onChange: (config: InfoCardConfig) => void
): InfoCardConfigEditor {
  return useMemo(() => ({
    fields: createArrayEditor(config.fields, (fields) => {
      onChange({ ...config, fields });
    }),
    actions: createArrayEditor(config.actions, (actions) => {
      onChange({ ...config, actions });
    })
  }), [config, onChange]);
}
```

### 这版参数为什么这样设计

这里故意分成两层：

```text
createArrayEditor
  └─ 只处理带 id 的数组，是普通 TypeScript 函数

useInfoCardConfigEditor
  ├─ 直接接收 InfoCardConfig
  ├─ 调用 useMemo，是一个真正的自定义 Hook
  └─ 负责把 fields / actions 写回正确的配置属性
```

这样既保留了项目关系，也没有牺牲类型安全：

- `fields` 编辑器只能接收 `InfoCardField`。
- `actions` 编辑器只能接收 `InfoCardAction`。
- 没有 `as unknown as T[]`，也不能拿字符串 key 把两种数组串起来。
- Hook 返回值由 `useMemo` 组合；当 `config` 和 `onChange` 都没变时，可以复用同一个编辑器对象。

`createArrayEditor` 不以 `use` 开头，因为它不调用任何 Hook；`useInfoCardConfigEditor` 才承担 React 层的组合职责。这个边界比把所有复用函数都包装成 Hook 更重要。

### 第 2 步：用 Hook 简化 FieldConfigList

修改 `src/features/infocard-config/FieldConfigList.tsx`：

```tsx
import type { InfoCardConfig, InfoCardField } from '../../types/config';
import { useInfoCardConfigEditor } from '../../hooks/useInfoCardConfigEditor';

type FieldConfigListProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function FieldConfigList({ config, onChange }: FieldConfigListProps) {
  const { fields: fieldEditor } = useInfoCardConfigEditor(config, onChange);
  const {
    items: fields,
    handleAdd,
    handleDelete,
    handleUpdate
  } = fieldEditor;

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
import type { InfoCardAction, InfoCardConfig } from '../../types/config';
import { useInfoCardConfigEditor } from '../../hooks/useInfoCardConfigEditor';

type ActionConfigListProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function ActionConfigList({ config, onChange }: ActionConfigListProps) {
  const { actions: actionEditor } = useInfoCardConfigEditor(config, onChange);
  const {
    items: actions,
    handleAdd,
    handleDelete,
    handleUpdate
  } = actionEditor;

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
│  └─ useInfoCardConfigEditor.ts
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

两个组件都通过 `useInfoCardConfigEditor` 修改配置，字段和按钮的类型不会串，JSON 预览仍会跟着完整 `InfoCardConfig` 更新。

## 常见错误

### 0. 不要用 `as unknown as` 绕过类型错误

旧写法把整个 `config` 和一个字符串 `arrayKey` 传进来，再写：

```tsx
const array = config[arrayKey] as unknown as T[];
```

这只是压掉 TypeScript 的检查，而且允许把 `fields` 当成 `actions` 使用。现在由 `useInfoCardConfigEditor` 明确创建 `fields` 和 `actions` 两个编辑器，类型关系不会丢，Hook 也仍然围绕 `InfoCardConfig` 工作。

### 1. Hook 名字不以 use 开头

```tsx
// 如果函数内部要调用 React Hook，就必须遵守 use 开头的命名约定
function configArrayUpdater() { ... }

// ✅ 正确：内部调用了 useMemo
function useInfoCardConfigEditor() { ... }
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

完成后再补一个边界测试：当 `localStorage` 里没有这个 key 时使用初始值；当存储内容不是合法 JSON 时，不要让整个页面白屏，可以先捕获解析错误并回退到初始值。

提示：

```tsx
import { useEffect, useState } from 'react';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    if (!stored) return initialValue;

    try {
      return JSON.parse(stored) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

## 验收清单

- [ ] 功能和之前一样，没有破坏
- [ ] `FieldConfigList` 使用 `fields` 编辑器
- [ ] `ActionConfigList` 使用 `actions` 编辑器
- [ ] 两个组件代码更简洁了
- [ ] 能解释 `createArrayEditor` 为什么不是 Hook
- [ ] 能解释 Hook 为什么仍然和 `InfoCardConfig` 有关
- [ ] 能解释自定义 Hook 的命名规则
- [ ] 能解释 Hook 调用的限制
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- `useInfoCardConfigEditor` 组合 InfoCard 配置编辑逻辑
- 泛型普通函数 `createArrayEditor<T>` 复用数组算法

**现在能解释：**
- 自定义 Hook 为什么要 `use` 开头
- 普通工具函数和自定义 Hook 的职责边界
- Hook 为什么不能在条件里调用
- 如何判断一段逻辑该不该提取成 Hook

**明天先做：**
- `useCallback` 稳定回调引用
- `React.memo` 避免子组件无效重渲染

## 留给明天的接口

当前每次 `config` 变化，所有子组件都会重新渲染，即使它们的 props 没变。

明天要用 `React.memo` + `useCallback` 优化性能。

<ProgressButton courseId="react-lowcode-course" dayId="day-10-custom-hook" />
