---
title: Day 8 - 操作按钮配置
---

# Day 8：操作按钮配置

## 今天完成什么

1. 做 `ActionConfigList` 组件
2. 支持按钮的增删改、显隐、类型切换
3. 复用昨天字段列表的思路

## 接在昨天哪里

昨天做了样式配置，今天的逻辑和 Day 5（字段列表）几乎一样，`config.actions` 数组也需要增删改。

这一天的重点不是新知识，而是**验证你真正理解了数组操作**，能独立复用之前的模式。

## 概念解释

### 组件复用的思路

昨天写了 `FieldConfigList`，今天的 `ActionConfigList` 结构几乎相同：

- 都是数组渲染
- 都有增删改
- 都有显隐控制

不同点只是：

- 按钮有 `type` 字段（`primary` / `default`），字段没有
- 按钮的展示逻辑稍有不同

遇到类似结构时，先想能不能复用，不能复用再单独写。

### `Partial<T>` 类型工具

昨天用到了 `Partial<InfoCardField>`，今天再看一眼：

```tsx
type InfoCardField = {
  id: string;
  label: string;
  value: string;
  visible: boolean;
};

// Partial 让所有字段变成可选
type UpdateField = Partial<InfoCardField>;
// 等价于：
// { id?: string; label?: string; value?: string; visible?: boolean }
```

这样 `handleUpdateField(id, { label: 'new' })` 只传要改的字段就行，不用把整个对象传过去。

## 动手实现

### 第 1 步：新建 ActionConfigList

新建 `src/features/infocard-config/ActionConfigList.tsx`：

```tsx
import { InfoCardAction, InfoCardConfig } from '../../types/config';

type ActionConfigListProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function ActionConfigList({ config, onChange }: ActionConfigListProps) {
  const handleAddAction = () => {
    const newAction: InfoCardAction = {
      id: `action_${Date.now()}`,
      text: '新按钮',
      type: 'default',
      visible: true
    };
    onChange({
      ...config,
      actions: [...config.actions, newAction]
    });
  };

  const handleDeleteAction = (id: string) => {
    onChange({
      ...config,
      actions: config.actions.filter(a => a.id !== id)
    });
  };

  const handleUpdateAction = (id: string, updates: Partial<InfoCardAction>) => {
    onChange({
      ...config,
      actions: config.actions.map(a => a.id === id ? { ...a, ...updates } : a)
    });
  };

  return (
    <div>
      <h3>操作按钮</h3>

      {config.actions.map(action => (
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
                checked={action.visible}
                onChange={(e) => handleUpdateAction(action.id, { visible: e.target.checked })}
              />
              显示
            </label>
            <button
              onClick={() => handleDeleteAction(action.id)}
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

          {/* 按钮文案 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              按钮文案
            </label>
            <input
              type="text"
              value={action.text}
              onChange={(e) => handleUpdateAction(action.id, { text: e.target.value })}
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

          {/* 按钮类型 */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              按钮类型
            </label>
            <select
              value={action.type}
              onChange={(e) => handleUpdateAction(action.id, {
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

### 第 2 步：在 ConfigPanel 里加上按钮配置

修改 `src/components/ConfigPanel.tsx`：

```tsx
import BasicConfigForm from '../features/infocard-config/BasicConfigForm';
import FieldConfigList from '../features/infocard-config/FieldConfigList';
import StyleConfigForm from '../features/infocard-config/StyleConfigForm';
import ActionConfigList from '../features/infocard-config/ActionConfigList';
import { InfoCardConfig } from '../types/config';

type ConfigPanelProps = {
  config: InfoCardConfig;
  onChange: (config: InfoCardConfig) => void;
};

function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  const divider = (
    <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />
  );

  return (
    <div style={{
      flex: '1',
      padding: '20px',
      overflowY: 'auto',
      borderRight: '1px solid #ddd'
    }}>
      <h2 style={{ marginTop: 0 }}>配置面板</h2>
      <BasicConfigForm config={config} onChange={onChange} />
      {divider}
      <FieldConfigList config={config} onChange={onChange} />
      {divider}
      <StyleConfigForm config={config} onChange={onChange} />
      {divider}
      <ActionConfigList config={config} onChange={onChange} />
    </div>
  );
}

export default ConfigPanel;
```

## 当前目录结构

```text
src/
├─ types/config.ts
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
      └─ ActionConfigList.tsx
```

## 运行效果

保存后刷新：

1. 配置面板底部出现「操作按钮」区域
2. 点「+ 新增按钮」，右侧卡片出现新按钮
3. 修改按钮文案，右侧实时更新
4. 切换类型为「主要」，按钮变蓝色实心
5. 取消显示，按钮消失

## 常见错误

参考 Day 5 的错误清单，数组操作的坑都一样：

- 不要直接 push / splice
- map 修改时不要漏掉 `: action`
- key 不要用索引

这里只补一个新坑：

### select 类型断言不能省

```tsx
// ❌ 类型不匹配，TS 会报错
onChange({ ...config, type: e.target.value });

// ✅ 正确
onChange({ ...config, type: e.target.value as InfoCardAction['type'] });
```

## 动手改一改

1. 给按钮加一个「点击行为」字段：`alert`（弹窗）/ `log`（控制台）/ `copy`（复制文案）
2. 在 `InfoCardPreview` 里根据这个字段执行不同的点击动作

## 验收清单

- [ ] 能看到「操作按钮」区域
- [ ] 点「+ 新增按钮」，右侧出现新按钮
- [ ] 修改按钮文案，右侧实时更新
- [ ] 切换类型，按钮样式变化
- [ ] 取消显示，右侧按钮消失
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- ActionConfigList 的增删改
- 复用了 FieldConfigList 的模式
- ConfigPanel 四个区域全部完成

**现在能解释：**
- 为什么 `Partial<T>` 很有用
- 类似结构时如何复用逻辑

**明天先做：**
- JSON 预览
- `useMemo` 避免重复计算

## 留给明天的接口

现在 `config` 已经能被完整配置了，下一步要在右侧下方加一个区域，实时显示当前配置的 JSON。
