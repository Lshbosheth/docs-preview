---
title: Day 3 - useRef：DOM 引用与可变值
---

# Day 3：useRef——DOM 引用与可变值

## 今天完成什么

1. 用 `useRef` 拿到 DOM 节点，新增字段时输入框**自动聚焦**
2. 用 `useRef` 存"不触发渲染的值"，优雅跳过 Day 2 那个首次误触发
3. 讲清楚 `useRef` 和 `useState` 到底差在哪

## 接在昨天哪里

昨天做了防抖保存，还留了个小体验问题：**点"新增字段"后，得手动去点那个新输入框才能打字**。好用的表单应该是——新增完，光标自动落进去。

还有 Day 2 那个瑕疵：首次进页面，保存状态会闪一下"正在输入"。今天顺手用 `useRef` 一起收拾。

## 核心概念

### 1. useRef 是什么

`useRef` 给你一个"盒子"，长这样：

```typescript
const boxRef = useRef(初始值);
// 用 boxRef.current 读写盒子里的东西
```

这个盒子有两个特点，也是它两大用途的来源：

1. **盒子本身在多次渲染之间保持不变**（不像普通变量每次渲染都重来）
2. **改 `boxRef.current` 不会触发重新渲染**（不像 `setState`）

### 2. 用途一：拿到真实 DOM

把 ref 挂到 JSX 元素的 `ref` 属性上，`current` 就是那个真实 DOM 节点：

```tsx
function Demo() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus(); // 拿到 input 节点，让它聚焦
  }, []);

  return <input ref={inputRef} />;
}
```

注意：DOM 挂载后 `current` 才有值，所以操作 DOM 要放在 `useEffect` 里（渲染之后）。

### 3. 用途二：存不触发渲染的可变值

有些值你想跨渲染记住，但改它**不该**引起重新渲染，比如：

- 定时器 id
- "上一次的值"
- "是不是首次渲染"的标记

这些放 `useState` 会造成多余的渲染，放 `useRef` 正合适。

### 4. useRef vs useState 一句话对比

| | 改了会重渲染吗 | 跨渲染保留吗 | 典型用途 |
|---|---|---|---|
| `useState` | ✅ 会 | ✅ 会 | 要显示在界面上的数据 |
| `useRef` | ❌ 不会 | ✅ 会 | DOM 节点、幕后的可变值 |

**判断法则：这个值变了，界面要不要跟着变？要 → useState；不要 → useRef。**

## 动手前的目录

今天主要改这两个文件：

```text
src/
├─ features/infocard-config/
│  └─ FieldConfigList.tsx        # 新增字段自动聚焦 [修改]
└─ components/
   └─ LowCodeConfigPage.tsx      # 用 ref 跳过首次 [修改]
```

## 分步实现

### 第 1 步：新增字段自动聚焦

打开基础课的 `FieldConfigList.tsx`（管理字段增删改的那个）。我们要做到：点"新增字段"→ 新字段的输入框自动获得焦点。

思路：
1. 用一个 ref **记住每个字段输入框的 DOM 节点**（用 Map 存，key 是字段 id）
2. 用一个 ref **记住"刚新增的字段 id"**
3. 用 `useEffect` 监听字段列表变化，发现有"刚新增的 id"就 focus 它

```tsx
import React, { useRef, useEffect } from 'react';

export function FieldConfigList({ fields, onChange }: Props) {
  // ref 盒子 1：存所有输入框 DOM，key = 字段 id
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // ref 盒子 2：记住刚新增的字段 id（改它不触发渲染，正合适）
  const justAddedId = useRef<string | null>(null);

  // 新增字段列表后，聚焦到刚加的那个
  useEffect(() => {
    if (justAddedId.current) {
      const el = inputRefs.current.get(justAddedId.current);
      el?.focus();
      justAddedId.current = null; // 用完清空，避免重复聚焦
    }
  }, [fields]); // 字段列表变化时检查

  const handleAdd = () => {
    const newField = {
      id: crypto.randomUUID(), // 唯一 id（基础课讲过别用索引）
      label: '',
      type: 'text' as const,
    };
    justAddedId.current = newField.id;      // 记下这次新增的 id
    onChange([...fields, newField]);        // 不可变更新，加进列表
  };

  return (
    <div>
      {fields.map((field) => (
        <div key={field.id}>
          <input
            // 把 DOM 存进 Map；卸载时删掉
            ref={(el) => {
              if (el) inputRefs.current.set(field.id, el);
              else inputRefs.current.delete(field.id);
            }}
            value={field.label}
            placeholder="字段名"
            onChange={(e) =>
              onChange(
                fields.map((f) =>
                  f.id === field.id ? { ...f, label: e.target.value } : f
                )
              )
            }
          />
          {/* ...类型选择、删除按钮等保持基础课原样 */}
        </div>
      ))}
      <button onClick={handleAdd}>+ 新增字段</button>
    </div>
  );
}
```

**这里的关键**：`ref={(el) => ...}` 是"回调 ref"——React 把 DOM 节点交给你，你自己存起来。因为字段是动态列表，数量不定，用一个 Map 挨个存最灵活。

### 第 2 步：用 ref 跳过 effect 首次执行

回到 `LowCodeConfigPage.tsx`。Day 2 那个"config 一变就标记 saving"的 effect，在**首次挂载**时也会跑一次，导致刚进页面就闪一下"正在输入"。

用一个 ref 标记"是不是首次"，首次直接跳过：

```typescript
import { useRef, useEffect } from 'react';

// 标记是否首次渲染（改它不触发渲染 → 用 ref）
const isFirstRender = useRef(true);

useEffect(() => {
  // 首次挂载：跳过，不标记 saving
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return;
  }
  setSaveStatus('saving');
}, [config]);
```

现在进页面是干净的，只有真正改动配置才会显示"正在输入"。

### 第 3 步（可选优化）：ref 记住上次配置，避免无意义保存

有时候 config 引用变了但内容其实没变（某些重渲染场景）。可以用 ref 存"上次保存的 JSON"，一样就不保存：

```typescript
const lastSavedJson = useRef<string>('');

useDebouncedEffect(
  () => {
    const json = JSON.stringify(config);
    if (json === lastSavedJson.current) return; // 内容没变，跳过
    saveConfig(config);
    lastSavedJson.current = json;
    setSaveStatus('saved');
  },
  [config],
  500
);
```

## 完整代码

今天改动：

1. **修改** `FieldConfigList.tsx`（自动聚焦，见第 1 步）
2. **修改** `LowCodeConfigPage.tsx`（跳过首次 + 可选优化，见第 2、3 步）

没有新增文件，全靠 `useRef` 这一个 Hook。

## 运行效果

1. 启动项目
2. 点"+ 新增字段"——**光标自动落在新字段的输入框**，直接就能打字 ✅
3. 刷新页面进来——顶部不再闪"正在输入"，是干净的 ✅
4. 连续新增几个字段，每次都聚焦到最新那个

## 常见错误

### 错误 1：`inputRef.current` 是 null

**原因**：DOM 还没挂载就访问了，或者聚焦代码没放在 `useEffect` 里。

**解决**：操作 DOM 一定放 `useEffect`（渲染之后），并用可选链 `?.` 兜底。

### 错误 2：新增后没聚焦

**原因**：`justAddedId` 记的 id 和实际字段 id 对不上，或者 effect 依赖没写 `[fields]`。

**解决**：确认 `handleAdd` 里先设 `justAddedId.current = newField.id` 再 `onChange`，且 effect 依赖是 `[fields]`。

### 错误 3：改了 `ref.current` 界面没更新

**这不是错误，是特性**。`useRef` 改了本来就不触发渲染。要界面更新，那值就该用 `useState`。回顾核心概念第 4 点。

### 错误 4：回调 ref 里报类型错误

**原因**：TS 对回调 ref 的返回值敏感。

**解决**：回调 ref 别 `return` 任何东西，写成 `ref={(el) => { ... }}`（花括号语句体，不是箭头表达式）。

## 动手改一改

1. **滚动到新字段**：新增字段时，除了聚焦，还让它滚动到可视区域（`el.scrollIntoView()`）
2. **回车新增**：在最后一个字段输入框按回车，直接新增下一个字段（连续录入体验）
3. **上次值对比升级**：把第 3 步的 JSON 对比，用在"未保存提醒"上——真没变时按钮显示"无改动"

## 验收清单

- [ ] 新增字段后，输入框自动聚焦
- [ ] 首次进页面不再闪"正在输入"
- [ ] 理解回调 ref（`ref={(el) => ...}`）的用法
- [ ] 能说清 `useRef` 和 `useState` 的区别（改了会不会重渲染）
- [ ] 知道"操作 DOM 要放 useEffect"

## 今日总结

### 学到了什么

1. **useRef 两大用途**：拿 DOM 节点、存不触发渲染的可变值
2. **回调 ref**：动态列表里用 Map 收集多个 DOM
3. **跳过首次 effect**：用 ref 当"首次"标记
4. **useRef vs useState**：值变了界面要不要变，决定用哪个

### 关键代码

```typescript
// 拿 DOM
const ref = useRef<HTMLInputElement>(null);
useEffect(() => ref.current?.focus(), []);

// 存幕后可变值
const flag = useRef(true);
if (flag.current) { flag.current = false; return; }
```

### 今天的限制

- 配置变更逻辑还散落各处：改标题一个 setter、增删字段一堆 map/filter，`onChange` 满天飞
- 这些操作缺乏统一管理，加新配置项会越来越乱

### 明天做什么

Day 4 用 `useReducer` 把所有配置变更收敛到一个 reducer，操作全走 `dispatch(action)`，逻辑集中一处。

---

**阶段一（副作用与引用）完成！`useEffect` + `useRef` 这两个基础课漏掉的核心 Hook，你补齐了。**
