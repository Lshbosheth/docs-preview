---
title: Day 6 - React Router：多页面应用
---

# Day 6：React Router——从单页面到多页面

## 今天完成什么

1. 装 `react-router-dom`，搞懂 SPA 路由是怎么回事
2. 做两个页面：**组件列表页** + **配置编辑页**
3. 用 URL 参数 `/editor/:id` 区分在编辑哪个组件
4. 会用 `useNavigate` 跳转、`useParams` 取参、`lazy` 懒加载

## 接在昨天哪里

到 Day 5，你的应用还是"一个配置页"。但真实的低代码平台是这样的：

```text
进来先看到"我的组件"列表（卡片A、卡片B、表单C…）
   ↓ 点某个
进入它的配置编辑页
   ↓ 改完点返回
回到列表
```

这需要**多个页面**，还要能通过 URL 直达（比如刷新 `/editor/abc` 还停在编辑 abc）。React 本身不管路由，得请 `react-router-dom` 出场。

## 核心概念

### 1. SPA 路由是什么

传统网站：点链接 → 浏览器向服务器要一个新 HTML → 整页刷新。

单页应用（SPA）：只有一个 HTML，**JS 根据 URL 决定渲染哪个组件**，不刷新整页、体验丝滑。React Router 干的就是"看 URL、换组件"这件事。

### 2. 四个核心 API

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

<BrowserRouter>          {/* 整个 App 套一层，开启路由 */}
  <Routes>               {/* 路由表容器 */}
    <Route path="/" element={<ListPage />} />        {/* 一条规则 */}
    <Route path="/editor/:id" element={<EditorPage />} />
  </Routes>
</BrowserRouter>
```

- `BrowserRouter`：路由总开关，套在最外层
- `Routes`：一组路由规则的容器
- `Route`：一条规则，`path` 匹配 URL，`element` 是要渲染的组件

### 3. 动态参数 `:id`

`path="/editor/:id"` 里的 `:id` 是**占位符**。访问 `/editor/abc` 时，`id` 就是 `'abc'`。组件里用 `useParams()` 取：

```tsx
const { id } = useParams();  // 'abc'
```

### 4. 编程式跳转 `useNavigate`

想在代码里跳转（比如点按钮后跳）：

```tsx
const navigate = useNavigate();
navigate('/editor/abc');   // 跳到编辑页
navigate(-1);              // 后退一步（等于浏览器返回）
```

也可以用 `<Link to="/editor/abc">` 做成链接，本质一样。

## 动手前的目录

今天新增：

```text
src/
├─ pages/
│  ├─ ComponentListPage.tsx   # 组件列表页 [新增]
│  └─ EditorPage.tsx          # 配置编辑页 [新增]
└─ App.tsx                    # 路由表 [修改/新增]
```

## 分步实现

### 第 0 步：安装

```bash
npm install react-router-dom
```

### 第 1 步：配置路由表

改 `App.tsx`（或你的根组件），把路由架子搭起来：

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ComponentListPage } from './pages/ComponentListPage';
import { EditorPage } from './pages/EditorPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 列表页：根路径 */}
        <Route path="/" element={<ComponentListPage />} />
        {/* 编辑页：带一个组件 id 参数 */}
        <Route path="/editor/:id" element={<EditorPage />} />
        {/* 兜底：没匹配到的路径 */}
        <Route path="*" element={<div>页面不存在</div>} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 第 2 步：做组件列表页

新建 `src/pages/ComponentListPage.tsx`。先用写死的假数据（Day 7 再换成后端来的）：

```tsx
import { useNavigate } from 'react-router-dom';

// 假数据：以后从后端拉
const mockComponents = [
  { id: 'card-a', name: '用户信息卡片' },
  { id: 'card-b', name: '商品展示卡片' },
  { id: 'form-c', name: '联系表单' },
];

export function ComponentListPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>我的组件</h1>
      <ul>
        {mockComponents.map((comp) => (
          <li key={comp.id}>
            {comp.name}
            {/* 点"编辑"跳到对应编辑页 */}
            <button onClick={() => navigate(`/editor/${comp.id}`)}>
              编辑
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 第 3 步：做编辑页，取出 URL 参数

新建 `src/pages/EditorPage.tsx`。它读出 `:id`，把 Day 5 的配置页放进来：

```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { LowCodeConfigPage } from '../components/LowCodeConfigPage';

export function EditorPage() {
  const { id } = useParams();          // 拿到 URL 里的组件 id
  const navigate = useNavigate();

  return (
    <div>
      <header>
        <button onClick={() => navigate('/')}>← 返回列表</button>
        <span>正在编辑：{id}</span>
      </header>

      {/* 复用 Day 5 的配置页 */}
      <LowCodeConfigPage />
    </div>
  );
}
```

> 现在每个组件用同一个 key 存 localStorage 会串。理想做法是把 `id` 传进去，让存储 key 带上 id（如 `lowcode-config-${id}`）。今天先把路由跑通，下面"动手改一改"里让你自己接上。

### 第 4 步（进阶）：路由懒加载

编辑页往往很重（编译器、预览…）。用 `lazy` + `Suspense` 让它**用到才加载**，首屏更快：

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ComponentListPage } from './pages/ComponentListPage';

// 懒加载：EditorPage 单独打包，进编辑页时才下载
const EditorPage = lazy(() =>
  import('./pages/EditorPage').then((m) => ({ default: m.EditorPage }))
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>加载中…</div>}>
        <Routes>
          <Route path="/" element={<ComponentListPage />} />
          <Route path="/editor/:id" element={<EditorPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

> `lazy` 接收一个"返回 import() 的函数"，`Suspense` 的 `fallback` 是加载时的占位。这里 `.then(m => ({ default: m.EditorPage }))` 是因为我们用了具名导出——如果是 `export default`，直接 `lazy(() => import('...'))` 即可。

## 完整代码

今天文件清单：

1. **修改/新增** `src/App.tsx`（路由表，第 1 或第 4 步）
2. **新增** `src/pages/ComponentListPage.tsx`（第 2 步）
3. **新增** `src/pages/EditorPage.tsx`（第 3 步）

## 运行效果

1. 启动项目，进来看到"我的组件"列表（三张卡片）
2. 点某个的"编辑"→ URL 变成 `/editor/card-a`，进入配置编辑页
3. 编辑页顶部显示"正在编辑：card-a"
4. 点"← 返回列表"→ 回到 `/`
5. **直接在地址栏输 `/editor/card-b` 回车**→ 直达那个编辑页（URL 直达能力）
6. 浏览器的前进/后退按钮也能用

## 常见错误

### 错误 1：页面空白，控制台报 `useNavigate() may be used only in the context of a <Router>`

**原因**：用了路由 hook 的组件不在 `<BrowserRouter>` 里面。

**解决**：确认 `BrowserRouter` 套在最外层，所有页面都在它内部。

### 错误 2：刷新 `/editor/abc` 出现 404

**原因**：开发服务器没配 SPA fallback（生产部署更常见）。Vite dev 一般没事；部署到静态服务器时要配"所有路径都回 index.html"。

**解决**：开发阶段用 Vite 通常正常；部署问题留到进阶课的"部署"环节。

### 错误 3：`useParams` 拿到的 id 是 undefined

**原因**：`Route` 的 `path` 没写 `:id`，或组件不是通过那条路由渲染的。

**解决**：确认 `path="/editor/:id"`，且你确实是从 `/editor/xxx` 进来的。

### 错误 4：`lazy` 报错找不到 default

**原因**：懒加载的模块用的是具名导出，但没做 `.then` 转换。

**解决**：见第 4 步的 `.then((m) => ({ default: m.EditorPage }))`，或把页面改成 `export default`。

## 动手改一改

1. **配置按 id 隔离**：把 `id` 从 `EditorPage` 传进 `LowCodeConfigPage`，让 storage key 变成 `lowcode-config-${id}`，实现每个组件独立保存
2. **Link 替代 navigate**：把列表页的"编辑"按钮换成 `<Link to={\`/editor/${comp.id}\`}>`，比较两种写法
3. **404 美化**：给 `path="*"` 的兜底页做个像样的"页面不存在 + 返回首页"界面
4. **面包屑**：编辑页顶部显示"我的组件 / 正在编辑 xxx"的路径导航

## 验收清单

- [ ] 装好了 `react-router-dom`
- [ ] `App` 里用 `BrowserRouter` + `Routes` + `Route` 配了两条路由
- [ ] 列表页能用 `useNavigate` 跳到编辑页
- [ ] 编辑页能用 `useParams` 取出 `:id`
- [ ] URL 直达和浏览器前进后退都正常
- [ ] （进阶）编辑页用 `lazy` + `Suspense` 懒加载

## 今日总结

### 学到了什么

1. **SPA 路由**：不刷新整页，JS 按 URL 换组件
2. **四大件**：`BrowserRouter` / `Routes` / `Route` / `path`
3. **动态参数**：`:id` + `useParams()`
4. **编程式导航**：`useNavigate()`
5. **懒加载**：`lazy` + `Suspense` 拆包提速

### 关键代码

```tsx
<Route path="/editor/:id" element={<EditorPage />} />

const { id } = useParams();
const navigate = useNavigate();
navigate(`/editor/${id}`);
```

### 今天的限制

- 组件列表还是写死的假数据
- 真实应用里，这个列表得从后端拉——会有"加载中""加载失败""空列表"这些状态

### 明天做什么

Day 7 处理**异步数据**：把列表换成 mock API 拉取，认真对付 loading / error / empty 三态，还有请求竞态问题。

---

**你的项目从"一个页面"长成"一个应用"了。路由是所有真实前端项目的标配，今天这关很重要。**
