---
title: Day 7 - 异步数据：loading / error / empty 三态
---

# Day 7：异步数据——认真对付 loading / error / empty 三态

## 今天完成什么

1. 用 `useEffect` 拉异步数据，把 Day 6 的假列表换成"从 API 来"
2. 认真处理四种状态：加载中 / 出错 / 空列表 / 有数据
3. 解决"请求竞态"（快速切换导致旧请求覆盖新数据）
4. 把这套逻辑抽成一个 `useAsync` 自定义 Hook

## 接在昨天哪里

Day 6 的组件列表是写死的 `mockComponents`。真实项目里，这个列表是**异步**从后端拉的——而异步就意味着：

- 数据还没到（**加载中**，得转圈）
- 请求失败了（**出错**，得提示 + 重试）
- 拉回来是空的（**空列表**，得引导"去新建"）
- 拉到了（**成功**，渲染列表）

新手最常犯的错就是只写"成功"那条路，另外三种一概不管。今天把四态一次性做扎实——这是**区分玩具和产品的分水岭**。

## 核心概念

### 1. 异步数据的四种状态

任何一次异步请求，界面都可能处在这四种之一：

```text
loading  →  加载中（转圈）
error    →  失败（红字 + 重试按钮）
empty    →  成功但没数据（空状态引导）
success  →  成功且有数据（正常渲染）
```

代码里通常用几个 state 表示：

```typescript
const [data, setData] = useState<T[] | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### 2. 在 useEffect 里发请求

请求是副作用，放 `useEffect`。空依赖 `[]` 表示"进页面拉一次"：

```typescript
useEffect(() => {
  setLoading(true);
  fetchData()
    .then((res) => setData(res))
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, []);
```

### 3. 请求竞态（race condition）

这是异步的经典坑。设想：你切到 A 组件（发请求 A），A 还没回来又切到 B（发请求 B）。如果 A 比 B 晚回来，就会用**过期的 A 数据**覆盖掉 B——界面和 URL 对不上了。

解法：用 Day 2 学的**清理函数**打一个"作废标记"。effect 重跑或卸载时，把上一次请求标记为作废，回来了也不采用：

```typescript
useEffect(() => {
  let cancelled = false; // 作废标记

  fetchData().then((res) => {
    if (!cancelled) setData(res); // 没被作废才更新
  });

  return () => {
    cancelled = true; // 清理：作废这次请求
  };
}, [id]);
```

### 4. async/await 在 effect 里的写法

`useEffect` 的回调**不能直接是 async 函数**（它得返回清理函数，不能返回 Promise）。要在里面定义一个 async 再调用：

```typescript
useEffect(() => {
  async function run() {
    const res = await fetchData();
    // ...
  }
  run();
}, []);
```

## 动手前的目录

今天新增：

```text
src/
├─ api/
│  └─ mockApi.ts        # 模拟后端接口 [新增]
└─ hooks/
   └─ useAsync.ts       # 通用异步 Hook [新增]
```

修改：

```text
src/
└─ pages/
   └─ ComponentListPage.tsx   # 改用异步数据 + 四态 [修改]
```

## 分步实现

### 第 1 步：写一个假后端

没有真后端也能练。用 `Promise` + `setTimeout` 模拟"网络延迟"，还故意留个"随机失败"好测试出错态。

新建 `src/api/mockApi.ts`：

```typescript
export interface ComponentItem {
  id: string;
  name: string;
}

const DB: ComponentItem[] = [
  { id: 'card-a', name: '用户信息卡片' },
  { id: 'card-b', name: '商品展示卡片' },
  { id: 'form-c', name: '联系表单' },
];

/**
 * 模拟"拉组件列表"接口：延迟 800ms，10% 概率失败
 */
export function fetchComponents(): Promise<ComponentItem[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error('网络开小差了，请重试'));
      } else {
        resolve(DB);
      }
    }, 800);
  });
}
```

> 想测空态？临时把 `resolve(DB)` 改成 `resolve([])`。想必现出错？把 `0.1` 调成 `1`。

### 第 2 步：先用"土办法"在页面里做四态

先不抽 Hook，直接在 `ComponentListPage` 里把四态写明白，理解透了再抽。

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchComponents, ComponentItem } from '../api/mockApi';

export function ComponentListPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<ComponentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 用来手动触发重新请求
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchComponents()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true; // 竞态保护
    };
  }, [reloadKey]); // reloadKey 变 → 重新拉

  // ① 加载中
  if (loading) return <div>加载中…</div>;

  // ② 出错
  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>出错了：{error}</p>
        <button onClick={() => setReloadKey((k) => k + 1)}>重试</button>
      </div>
    );
  }

  // ③ 空列表
  if (!data || data.length === 0) {
    return (
      <div>
        <p>还没有任何组件</p>
        <button onClick={() => navigate('/editor/new')}>去新建一个</button>
      </div>
    );
  }

  // ④ 成功且有数据
  return (
    <div>
      <h1>我的组件</h1>
      <ul>
        {data.map((comp) => (
          <li key={comp.id}>
            {comp.name}
            <button onClick={() => navigate(`/editor/${comp.id}`)}>编辑</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

> 注意这个"提前 return"的写法：加载中 return、出错 return、空 return，最后才是正常渲染。四条路各走各的，清清爽爽。**重试**靠 `reloadKey` 自增触发 effect 重跑。

### 第 3 步：把异步逻辑抽成 useAsync Hook

上面那套 `data/loading/error/cancelled` 每个异步页面都要写一遍，抽成 Hook 复用。

新建 `src/hooks/useAsync.ts`：

```typescript
import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * 通用异步数据 Hook：自动管理 loading/error/data，内置竞态保护和 reload
 * @param asyncFn 返回 Promise 的函数
 * @param deps    依赖变化时自动重新请求
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    asyncFn()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  return { data, loading, error, reload };
}
```

### 第 4 步：用 Hook 重写页面

页面一下子清爽多了：

```tsx
import { useNavigate } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync';
import { fetchComponents } from '../api/mockApi';

export function ComponentListPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(fetchComponents, []);

  if (loading) return <div>加载中…</div>;
  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>出错了：{error}</p>
        <button onClick={reload}>重试</button>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div>
        <p>还没有任何组件</p>
        <button onClick={() => navigate('/editor/new')}>去新建一个</button>
      </div>
    );
  }

  return (
    <div>
      <h1>我的组件</h1>
      <ul>
        {data.map((comp) => (
          <li key={comp.id}>
            {comp.name}
            <button onClick={() => navigate(`/editor/${comp.id}`)}>编辑</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 完整代码

今天文件清单：

1. **新增** `src/api/mockApi.ts`（第 1 步）
2. **新增** `src/hooks/useAsync.ts`（第 3 步）
3. **修改** `src/pages/ComponentListPage.tsx`（第 4 步，用 Hook 版）

## 运行效果

1. 进列表页，先看到"加载中…"约 800ms
2. 大概率加载出三张卡片
3. 多刷新几次，偶尔（10%）会出现"出错了 + 重试"，点重试能恢复
4. 把 `mockApi` 里 `resolve(DB)` 临时改成 `resolve([])`，看到"还没有任何组件 + 去新建"
5. 把失败概率调成 `1`，稳定复现出错态，验证重试逻辑

## 常见错误

### 错误 1：`Warning: Can't perform a React state update on an unmounted component`

**原因**：组件卸载后，迟到的请求还在 `setState`。

**解决**：就是第 3 点的竞态保护——`cancelled` 标记 + 清理函数。抽好的 `useAsync` 已内置。

### 错误 2：effect 回调写成 `async () => {}` 报警告

**原因**：`useEffect` 回调不能返回 Promise（它要返回清理函数）。

**解决**：在里面定义 async 函数再调用（核心概念第 4 点），或用 `.then()` 链式写法。

### 错误 3：一直在加载，转圈不停

**原因**：`setLoading(false)` 没被调到（可能 catch 里漏了，或没用 `finally`）。

**解决**：用 `.finally(() => setLoading(false))`，保证成功失败都会关掉 loading。

### 错误 4：重试按钮点了没反应

**原因**：重试没有真正触发 effect 重跑。

**解决**：用 `reloadKey` 自增（放进依赖），或 `useAsync` 返回的 `reload()`。

## 动手改一改

1. **编辑页也异步**：给 `EditorPage` 加一个 `fetchComponentById(id)`，用 `useAsync(() => fetchComponentById(id), [id])`，亲手验证切换组件时的竞态保护
2. **骨架屏**：把"加载中…"换成灰色骨架块（skeleton），体验更高级
3. **保留旧数据**：重新加载时不清空旧列表（`keepPreviousData`），只在上面盖一层 loading，避免闪烁
4. **了解 React Query**：查一下 `@tanstack/react-query`——它把今天这套（缓存、竞态、重试、后台刷新）都封装好了。真实项目基本都用它，但**先自己手写一遍**才知道它在替你做什么

## 验收清单

- [ ] 新建了 `mockApi.ts`（带延迟和随机失败）
- [ ] 列表页处理了加载 / 出错 / 空 / 成功四种状态
- [ ] 有竞态保护（`cancelled` + 清理函数）
- [ ] 抽出了 `useAsync` 通用 Hook
- [ ] 出错能重试，空态有引导
- [ ] 能说清"请求竞态"是什么、怎么防

## 今日总结

### 学到了什么

1. **异步四态**：loading / error / empty / success，一个都不能少
2. **提前 return 分流**：四条路各写各的，清爽
3. **请求竞态**：`cancelled` 标记 + 清理函数
4. **effect 里的 async**：不能直接 async 回调
5. **抽 Hook 复用**：`useAsync` 一处封装，处处调用
6. **认识 React Query**：知道生产里有更强的轮子

### 关键代码

```typescript
useEffect(() => {
  let cancelled = false;
  fetchData().then((res) => { if (!cancelled) setData(res); });
  return () => { cancelled = true; }; // 竞态保护
}, [deps]);
```

### 今天的限制

- 预览区如果渲染的组件代码有 bug，会**整页白屏崩掉**
- 一个小组件出错不该拖垮整个应用——需要"错误边界"兜底

### 明天做什么

Day 8（最后一课）学 **Error Boundary**：给预览区加错误边界，组件崩了只崩那一小块 + 显示"重试"，其余照常。然后做全课程复盘。

---

**四态处理是"前端工程素养"的直接体现。会不会写 loading/error/empty，一眼就能看出是新手还是熟手。你现在会了。**
