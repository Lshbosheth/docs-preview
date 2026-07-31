---
title: Day 6 - 依赖管理与外部库
---

# Day 6：依赖管理与外部库

## 今天完成什么

1. 预置常用库（React、lodash、dayjs、antd）到全局
2. 让用户组件能 `import` 这些预置库
3. 编译时识别"外部依赖"，不打包进 bundle，直接映射到全局变量
4. 顺手修掉 Day 5 遗留的相对 import 没清理的问题

## 接在昨天哪里

昨天多文件组件跑通了，但有个明显的天花板：**用户组件只能用自己写的代码**。

现实里的组件几乎都要依赖第三方库：

```tsx
import { debounce } from 'lodash';
import dayjs from 'dayjs';

export default function SearchBox() {
  const handleInput = debounce((v) => console.log(v), 300);
  const now = dayjs().format('YYYY-MM-DD');
  // ...
}
```

昨天这段代码一编译就炸：`lodash is not defined`。

今天要做的：**让用户组件能安全地引用一批预置好的外部库**。

## 核心概念

### 1. 什么是 externals

打包器（webpack、rollup）里有个概念叫 **externals**：某些库不打包进产物，而是假设运行环境里已经有了。

比如 React 本身，你不会把它编译进每个组件——运行时全局已经有一个 React 了，大家共用。

我们的做法一样：**预置库放到 `window` 上，编译时把 `import` 换成读全局变量**。

```text
import { debounce } from 'lodash'
        ↓  编译时改写
const { debounce } = __require('lodash')
        ↓  运行时
const { debounce } = window._   // lodash 的全局变量
```

### 2. UMD 格式与全局变量

大部分库都提供 UMD 打包版本，用 `<script>` 引进来后会挂一个全局变量：

| 库 | 全局变量 |
|------|----------|
| React | `window.React` |
| lodash | `window._` |
| dayjs | `window.dayjs` |
| antd | `window.antd` |

我们通过 CDN `<script>` 把这些库加载进页面，再建一张"模块名 → 全局变量"的映射表。

### 3. `__require` 注入

Day 2 里 `executeComponent` 是这么执行代码的：

```typescript
const fn = new Function('React', `return ${compiledCode}`);
```

今天扩展它：除了 `React`，再注入一个 `__require` 函数，用户代码里所有外部 `import` 都翻译成对 `__require` 的调用。

```typescript
const fn = new Function('__require', `return ${compiledCode}`);
fn(name => externalModules[name]);
```

### 4. 相对 import vs 外部 import

编译时要区分两种 import：

- **相对 import**（`./utils`、`../lib`）→ 昨天的 bundler 靠拼接解决，编译阶段直接删掉
- **外部 import**（`lodash`、`dayjs`，不以 `.` 开头）→ 改写成 `__require('...')`

## 动手前的目录

今天会新增：

```text
src/
└─ utils/
   └─ externalModules.ts     # 外部库映射表 [新增]
```

还会修改：

```text
src/
├─ utils/
│  └─ compiler.ts            # 增加 import 改写 + externals 注入 [修改]
└─ ...
index.html                   # 引入 CDN 库 [修改]
```

## 分步实现

### 第 1 步：在 index.html 引入 CDN 库

修改项目根目录的 `index.html`，在 `<head>` 里加上：

```html
<!-- 预置外部库（教学演示用 CDN，生产建议本地打包） -->
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/lodash@4/lodash.min.js"></script>
<script src="https://unpkg.com/dayjs@1/dayjs.min.js"></script>
```

⚠️ **注意**：这里用 CDN 只是为了教学方便。生产环境应该本地托管，或者用打包工具的 externals 配置，别依赖公网 CDN。

加载后，浏览器控制台里应该能访问到 `window._`、`window.dayjs`。

### 第 2 步：建立外部库映射表

新建 `src/utils/externalModules.ts`：

```typescript
/**
 * 外部库映射表：模块名 → 全局变量
 *
 * 用户组件里 import 'lodash'，实际拿到的是 window._
 */
export interface ExternalRegistry {
  [moduleName: string]: any;
}

/**
 * 读取当前可用的外部库
 *
 * 用函数动态读取，而不是写死常量——
 * 因为 CDN 脚本可能比模块加载晚一点，写死会拿到 undefined
 */
export function getExternalModules(): ExternalRegistry {
  const w = window as any;
  return {
    react: w.React,
    'react-dom': w.ReactDOM,
    lodash: w._,
    dayjs: w.dayjs,
    antd: w.antd,
  };
}

/**
 * 解析一个模块名对应的外部库
 * 找不到就抛错，方便用户排查
 */
export function resolveExternal(moduleName: string): any {
  const modules = getExternalModules();

  if (moduleName in modules) {
    const mod = modules[moduleName];
    if (mod === undefined) {
      throw new Error(
        `外部库 "${moduleName}" 尚未加载，请检查 index.html 是否引入了对应的 CDN 脚本`
      );
    }
    return mod;
  }

  throw new Error(
    `不支持的外部依赖 "${moduleName}"。当前预置库：${Object.keys(modules).join(', ')}`
  );
}

/**
 * 判断一个 import 路径是不是外部依赖
 * 相对路径（./ ../）不是外部依赖
 */
export function isExternalModule(importPath: string): boolean {
  return !importPath.startsWith('./') && !importPath.startsWith('../');
}
```

### 第 3 步：编译器增加 import 改写

修改 `src/utils/compiler.ts`，新增一个 `transformImports` 函数，并在 `compileComponent` 里调用它。

先新增改写逻辑：

```typescript
import { isExternalModule } from './externalModules';

/**
 * 改写 import 语句
 * - 外部依赖：改成 const ... = __require('name')
 * - 相对依赖：直接删掉（由 bundler 拼接解决）
 */
function transformImports(code: string): string {
  const lines = code.split('\n');
  const result: string[] = [];

  const importRegex = /^\s*import\s+(.+?)\s+from\s+['"]([^'"]+)['"];?\s*$/;

  for (const line of lines) {
    const match = line.match(importRegex);

    if (!match) {
      result.push(line);
      continue;
    }

    const clause = match[1].trim(); // React / { debounce } / * as _
    const source = match[2];        // lodash / ./utils

    // 相对依赖：删掉（bundler 已经把代码拼进来了）
    if (!isExternalModule(source)) {
      continue;
    }

    // 外部依赖：改写成 __require 调用
    result.push(rewriteExternalImport(clause, source));
  }

  return result.join('\n');
}

/**
 * 把一条外部 import 改写成 const 赋值
 */
function rewriteExternalImport(clause: string, source: string): string {
  // import * as X from 'xxx'
  const nsMatch = clause.match(/^\*\s+as\s+(\w+)$/);
  if (nsMatch) {
    return `const ${nsMatch[1]} = __require('${source}');`;
  }

  // import X, { a, b } from 'xxx'（默认导入 + 具名导入）
  const mixedMatch = clause.match(/^(\w+)\s*,\s*(\{.+\})$/);
  if (mixedMatch) {
    const def = mixedMatch[1];
    const named = mixedMatch[2];
    return (
      `const __m = __require('${source}');\n` +
      `const ${def} = __m.default || __m;\n` +
      `const ${named} = __m;`
    );
  }

  // import { a, b } from 'xxx'（纯具名导入）
  if (clause.startsWith('{')) {
    return `const ${clause} = __require('${source}');`;
  }

  // import X from 'xxx'（纯默认导入）
  return `const ${clause} = (function(){ const m = __require('${source}'); return m.default || m; })();`;
}
```

然后在 `compileComponent` 里，Babel 编译**之前**先改写 import：

```typescript
export function compileComponent(sourceCode: string): CompileResult {
  try {
    // [新增] 先改写 import 语句
    const preprocessed = transformImports(sourceCode);

    // 再用 Babel 编译
    const result = transform(preprocessed, {
      presets: [
        ['react', { runtime: 'classic' }],
        'typescript'
      ],
      filename: 'component.tsx'
    });

    if (!result || !result.code) {
      return { success: false, error: '编译失败：没有输出代码' };
    }

    let code = result.code;
    code = transformExports(code);

    return { success: true, code };
  } catch (error: any) {
    return { success: false, error: error.message || '编译失败' };
  }
}
```

> 为什么在 Babel **之前**改写？因为改写后是合法的 JS（`const X = __require(...)`），Babel 能正常处理；如果放到 Babel 之后，还得跟 Babel 生成的 `_interopRequireDefault` 之类的辅助代码打架，更麻烦。

### 第 4 步：执行时注入 `__require`

继续修改 `compiler.ts`，让 `executeComponent` 注入 `__require`：

```typescript
import { resolveExternal } from './externalModules';

export function executeComponent(compiledCode: string): React.ComponentType<any> {
  try {
    // 注入 React 和 __require 两个变量
    const fn = new Function('React', '__require', `
      "use strict";
      return ${compiledCode};
    `);

    // __require：根据模块名返回对应的外部库
    const requireFn = (name: string) => {
      // React 特殊处理：直接给闭包里的 React
      if (name === 'react') return React;
      return resolveExternal(name);
    };

    const component = fn(React, requireFn);

    if (typeof component !== 'function') {
      throw new Error('编译结果不是一个函数');
    }

    return component as React.ComponentType<any>;
  } catch (error: any) {
    throw new Error(`执行组件代码失败: ${error.message}`);
  }
}
```

`compileAndExecute` 不用改，它内部调用的就是上面这两个函数。Day 5 的 bundler 走的也是 `compileComponent` + `compileAndExecute`，所以多文件组件也自动获得了外部库能力。

## 完整代码

今天的文件清单：

1. **修改** `index.html`（引入 CDN 库，见第 1 步）
2. **新增** `src/utils/externalModules.ts`（完整代码见第 2 步）
3. **修改** `src/utils/compiler.ts`（新增 `transformImports`、`rewriteExternalImport`，修改 `compileComponent`、`executeComponent`）

## 运行效果

### 准备测试组件

写一个用到 lodash 和 dayjs 的组件 `SearchBox`：

**meta.json**：
```json
{
  "name": "SearchBox",
  "displayName": "搜索框",
  "description": "带防抖的搜索框，依赖 lodash 和 dayjs",
  "category": "basic",
  "icon": "🔍",
  "version": "1.0.0",
  "props": {
    "placeholder": {
      "type": "string",
      "default": "请输入关键词",
      "label": "占位提示"
    }
  }
}
```

**SearchBox.tsx**：
```tsx
import React from 'react';
import { debounce } from 'lodash';
import dayjs from 'dayjs';

interface Props {
  placeholder: string;
}

export default function SearchBox({ placeholder }: Props) {
  const [log, setLog] = React.useState('');

  const handleInput = debounce((value: string) => {
    const time = dayjs().format('HH:mm:ss');
    setLog(`[${time}] 搜索：${value}`);
  }, 500);

  return (
    <div style={{ padding: '16px' }}>
      <input
        type="text"
        placeholder={placeholder}
        onChange={(e) => handleInput(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #d9d9d9',
          borderRadius: '4px'
        }}
      />
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
        {log || '（输入后 500ms 触发防抖搜索）'}
      </div>
    </div>
  );
}
```

### 上传测试

1. 启动项目（确认 CDN 脚本已加载：控制台输入 `window._` 有输出）
2. 上传 `SearchBox`（单文件方式：meta.json + SearchBox.tsx）
3. 左侧出现"搜索框"，点击后右侧渲染出输入框
4. 在输入框里连续打字，停 500ms 后下方显示带时间戳的日志
5. 说明 `debounce`（lodash）和 `dayjs` 都生效了

## 常见错误

### 错误 1：`外部库 "lodash" 尚未加载`

**原因**：CDN 脚本没加载完，或者 `index.html` 没引入。

**解决**：
- 控制台输入 `window._`，确认有值
- 检查网络面板，CDN 请求是否 200
- CDN 挂了就换一个源，或本地托管

### 错误 2：`不支持的外部依赖 "axios"`

**原因**：用户 import 了没预置的库。

**解决**：这是**预期行为**。要支持就往 `index.html` 加 CDN，再往 `externalModules.ts` 的映射表加一行。

### 错误 3：`__require is not defined`

**原因**：`executeComponent` 的 `new Function` 少传了 `__require` 参数。

**解决**：检查 `new Function('React', '__require', ...)` 和 `fn(React, requireFn)` 参数是否对齐。

### 错误 4：默认导入拿到的是整个模块对象

**原因**：有些 UMD 库的默认导出挂在 `.default` 上，有些直接是模块本身。

**解决**：`rewriteExternalImport` 里用了 `m.default || m` 兜底，两种情况都能覆盖。

## 动手改一改

1. **加一个库**：把 `dayjs` 换成 `date-fns`，或额外预置 `antd`，跑通一个用 antd 按钮的组件
2. **依赖清单提示**：在上传界面显示"当前支持的外部库"列表，让用户知道能 import 什么
3. **缺失依赖友好提示**：用户 import 了不支持的库时，在界面上（不只是控制台）红字提示缺哪个库

## 验收清单

- [ ] `index.html` 引入了 CDN 库，`window._` / `window.dayjs` 可访问
- [ ] 用户组件能 `import { debounce } from 'lodash'` 并正常运行
- [ ] 用户组件能 `import dayjs from 'dayjs'` 并正常运行
- [ ] import 不支持的库时，报错信息清晰（列出支持的库）
- [ ] 相对 import（`./xxx`）在多文件组件里仍然正常
- [ ] 单文件和多文件组件都能用外部库

## 今日总结

### 学到了什么

1. **externals 思想**：公共库不打包，运行时共享全局变量
2. **UMD 全局变量**：`window._`、`window.dayjs` 的由来
3. **import 改写**：把 `import` 翻译成 `__require` 调用
4. **依赖注入**：通过 `new Function` 参数把外部库注入执行环境

### 关键代码

```typescript
// 改写 import
import { debounce } from 'lodash'
  → const { debounce } = __require('lodash');

// 注入 require
const fn = new Function('React', '__require', `return ${code}`);
fn(React, name => resolveExternal(name));
```

### 今天的限制

- 外部库靠 CDN 加载，网络不稳时会失败
- 没有版本锁定（拿到的是 CDN 上的最新小版本）
- **最大的问题：用户代码现在能随便访问 `window`、`localStorage`——毫无安全隔离**

### 明天做什么

Day 7 会加沙箱：限制用户组件能访问的 API，恶意代码碰 `window.localStorage`、`document.cookie` 直接被拦截。

---

**外部依赖打通！自定义组件终于能用上真正的第三方生态了。**

<ProgressButton courseId="react-lowcode-advanced-custom-components" dayId="day-06-external-dependencies" />
