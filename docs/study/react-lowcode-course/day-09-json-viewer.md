---
title: Day 9 - JSON 预览：useMemo + 格式化输出
---

# Day 9：JSON 预览：useMemo + 格式化输出

## 今天完成什么

1. 做 `ConfigJsonViewer` 组件
2. 实时显示当前配置的 JSON
3. 用 `useMemo` 避免重复格式化

## 接在昨天哪里

昨天完成了所有配置项，现在 `config` 已经能被完整修改了。

今天要在右侧预览区下方加一个 JSON 输出，让用户能看到当前配置的完整数据。

## 概念解释

### 为什么需要 JSON 预览

低代码工具的核心是"配置驱动"：

- 用户在表单里配置
- 系统把配置转成 JSON
- JSON 可以保存到后端、导入导出、交给其他系统使用

JSON 预览让用户能：

- 复制当前配置
- 检查配置是否正确
- 手动调试问题

### JSON.stringify 格式化

```tsx
JSON.stringify(config)
// 输出：{"title":"客户资料","subtitle":"郑州某某科技..."}

JSON.stringify(config, null, 2)
// 输出：
// {
//   "title": "客户资料",
//   "subtitle": "郑州某某科技有限公司",
//   ...
// }
```

第三个参数是缩进空格数，`2` 或 `4` 都可以。

### 什么是 useMemo

`useMemo` 会记住计算结果，只在依赖变化时重新计算：

```tsx
const formattedJson = useMemo(() => {
  return JSON.stringify(config, null, 2);
}, [config]);
```

- `config` 不变 → 直接返回上次的结果，不重新 `stringify`
- `config` 变了 → 重新计算并缓存

### 为什么需要 useMemo

```tsx
// ❌ 每次渲染都会重新计算
function ConfigJsonViewer({ config }) {
  const json = JSON.stringify(config, null, 2);  // 每次都跑
  return <pre>{json}</pre>;
}

// ✅ 只在 config 变化时重新计算
function ConfigJsonViewer({ config }) {
  const json = useMemo(() => JSON.stringify(config, null, 2), [config]);
  return <pre>{json}</pre>;
}
```

对于小数据，差异不大；但养成习惯，处理大对象时能避免卡顿。

### useMemo 的依赖数组

```tsx
useMemo(() => someExpensiveCalculation(), [dep1, dep2])
```

- 依赖数组里的值不变 → 返回缓存结果
- 任何一个依赖变了 → 重新计算

**常见错误：漏掉依赖**

```tsx
// ❌ 错误：filter 依赖 searchText，但没写进数组
const filtered = useMemo(() => items.filter(i => i.name.includes(searchText)), [items]);

// ✅ 正确
const filtered = useMemo(() => items.filter(i => i.name.includes(searchText)), [items, searchText]);
```

## 动手实现

### 第 1 步：新建 ConfigJsonViewer

新建 `src/features/infocard-config/ConfigJsonViewer.tsx`：

```tsx
import { useMemo } from 'react';
import { InfoCardConfig } from '../../types/config';

type ConfigJsonViewerProps = {
  config: InfoCardConfig;
};

function ConfigJsonViewer({ config }: ConfigJsonViewerProps) {
  // 用 useMemo 缓存格式化结果
  const formattedJson = useMemo(() => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    alert('配置已复制到剪贴板');
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h3 style={{ margin: 0 }}>配置 JSON</h3>
        <button
          onClick={handleCopy}
          style={{
            padding: '4px 12px',
            backgroundColor: '#52c41a',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          复制
        </button>
      </div>
      <pre style={{
        backgroundColor: '#f5f5f5',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        padding: '12px',
        fontSize: '12px',
        lineHeight: '1.5',
        overflow: 'auto',
        maxHeight: '400px',
        margin: 0
      }}>
        {formattedJson}
      </pre>
    </div>
  );
}

export default ConfigJsonViewer;
```

### 第 2 步：在 PreviewPanel 里加上 JSON 预览

修改 `src/components/PreviewPanel.tsx`：

```tsx
import InfoCardPreview from './InfoCardPreview';
import ConfigJsonViewer from '../features/infocard-config/ConfigJsonViewer';
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

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

      <ConfigJsonViewer config={config} />
    </div>
  );
}

export default PreviewPanel;
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
      ├─ ActionConfigList.tsx
      └─ ConfigJsonViewer.tsx
```

## 运行效果

保存后刷新：

1. 右侧预览区下方出现「配置 JSON」区域
2. 显示当前完整的配置 JSON，格式化后可读性很好
3. 修改任何配置项，JSON 实时更新
4. 点「复制」按钮，JSON 被复制到剪贴板

## 常见错误

### 1. 忘记 import useMemo

```tsx
// ❌ 错误
const json = useMemo(() => JSON.stringify(config, null, 2), [config]);
// ReferenceError: useMemo is not defined

// ✅ 正确
import { useMemo } from 'react';
```

### 2. 依赖数组写错

```tsx
// ❌ 错误：空数组，永远不会更新
const json = useMemo(() => JSON.stringify(config, null, 2), []);

// ✅ 正确
const json = useMemo(() => JSON.stringify(config, null, 2), [config]);
```

### 3. 不需要 useMemo 的场景乱用

```tsx
// ❌ 没必要
const title = useMemo(() => config.title, [config.title]);

// ✅ 直接用
const title = config.title;
```

只有**计算成本高**的操作才需要 `useMemo`，比如：

- 格式化大对象
- 过滤 / 排序大数组
- 复杂计算

简单的属性访问、字符串拼接不需要。

### 4. navigator.clipboard 在非 HTTPS 下可能不可用

开发环境 `localhost` 可以用，但部署到 HTTP 站点会报错。

生产环境建议用 HTTPS，或者用第三方库如 `clipboard.js`。

## 动手改一改

1. 加一个「下载 JSON」按钮
2. 点击后生成 `.json` 文件并下载

提示：

```tsx
const handleDownload = () => {
  const blob = new Blob([formattedJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'infocard-config.json';
  a.click();
  URL.revokeObjectURL(url);
};
```

## 验收清单

- [ ] 右侧能看到「配置 JSON」区域
- [ ] JSON 格式化后可读性好
- [ ] 修改任何配置，JSON 实时更新
- [ ] 点「复制」，JSON 被复制到剪贴板
- [ ] 能解释 `useMemo` 的作用
- [ ] 能解释依赖数组的作用
- [ ] 完成「动手改一改」的练习

## 今日记录

**今天跑通：**
- JSON 格式化输出
- `useMemo` 缓存计算结果
- 复制到剪贴板

**现在能解释：**
- `useMemo` 什么时候用
- 依赖数组漏掉会怎样
- `JSON.stringify` 的第三个参数

**明天先做：**
- 提取自定义 Hook
- 把重复的 `handleUpdate` 逻辑封装起来

## 留给明天的接口

当前代码里有三处几乎一样的逻辑：

```tsx
// FieldConfigList
const handleUpdateField = (id, updates) => {
  onChange({ ...config, fields: config.fields.map(...) });
};

// ActionConfigList
const handleUpdateAction = (id, updates) => {
  onChange({ ...config, actions: config.actions.map(...) });
};
```

明天要提取成自定义 Hook，减少重复代码。

<ProgressButton courseId="react-lowcode-course" dayId="day-09-json-viewer" />
