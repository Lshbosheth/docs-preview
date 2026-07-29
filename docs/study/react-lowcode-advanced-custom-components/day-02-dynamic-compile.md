---
title: Day 2 - 动态编译 React 组件
---

# Day 2：动态编译 React 组件

## 今天完成什么

1. 引入 `@babel/standalone` 编译器
2. 编译用户上传的 JSX/TSX 代码
3. 用 `new Function()` 执行编译后的代码
4. 把编译好的组件函数注册到组件注册表

## 接在昨天哪里

昨天完成了组件上传和元数据解析，但上传的组件**不能渲染**，因为 `component` 字段还是 `null`。

今天要做的：把用户上传的 `.tsx` 源码编译成可执行的组件函数。

## 核心概念

### 1. JSX/TSX 编译

浏览器不认识 JSX/TSX，必须编译成普通 JavaScript：

```tsx
// 用户写的代码（JSX）
function CustomButton({ text }) {
  return <button>{text}</button>;
}

// 编译后的代码（JavaScript）
function CustomButton({ text }) {
  return React.createElement('button', null, text);
}
```

### 2. Babel 是什么

Babel 是 JavaScript 编译器，能把：

- JSX → `React.createElement()`
- TypeScript → JavaScript
- ES6+ → ES5

通常 Babel 在 Node.js 环境运行（构建时），但 `@babel/standalone` 可以在**浏览器里运行**。

### 3. 动态执行代码

编译后的代码是字符串，用 `new Function()` 或 `eval()` 可以执行它：

```typescript
const code = 'return function() { return "hello"; }';
const fn = new Function(code)(); // 得到函数
console.log(fn()); // "hello"
```

**安全警告**：`eval` 和 `new Function` 有安全风险，Day 7 会加沙箱隔离。

### 4. 模块导出处理

用户的组件代码通常是：

```tsx
export default function CustomButton() { ... }
```

但浏览器里执行时，`export` 会报错。需要把它转成：

```tsx
(function() {
  function CustomButton() { ... }
  return CustomButton; // 返回组件函数
})()
```

## 动手前的目录

今天会新增这些文件：

```text
src/
└─ utils/
   └─ compiler.ts        # Babel 编译器封装 [新增]
```

还会修改：

```text
src/services/componentRegistry.ts   # 注册时编译组件 [修改]
```

## 分步实现

### 第 1 步：安装 Babel

```bash
npm install @babel/standalone
```

安装后项目会多一个依赖，大约 2MB（压缩后）。

⚠️ **注意**：`@babel/standalone` 体积较大，生产环境建议后端编译。本课程为了教学简化，选择浏览器端编译。

### 第 2 步：实现编译器工具

新建 `src/utils/compiler.ts`：

```typescript
import { transform } from '@babel/standalone';

/**
 * 编译结果
 */
export interface CompileResult {
  success: boolean;
  code?: string;      // 编译后的代码
  error?: string;     // 错误信息
}

/**
 * 编译 JSX/TSX 代码
 */
export function compileComponent(sourceCode: string): CompileResult {
  try {
    // 用 Babel 编译
    const result = transform(sourceCode, {
      presets: [
        // React JSX 转换
        ['react', { runtime: 'classic' }],
        // TypeScript 转换
        'typescript'
      ],
      filename: 'component.tsx'
    });

    if (!result || !result.code) {
      return {
        success: false,
        error: '编译失败：没有输出代码'
      };
    }

    // 处理 export default
    let code = result.code;
    code = transformExports(code);

    return {
      success: true,
      code
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '编译失败'
    };
  }
}

/**
 * 转换 export default 为函数返回
 * 
 * 输入：export default function CustomButton() { ... }
 * 输出：(function() { function CustomButton() { ... } return CustomButton; })()
 */
function transformExports(code: string): string {
  // 匹配 export default 声明
  // 支持：export default function Name() {}
  //       export default Name;
  
  // 方案 1：export default function Name() { ... }
  const functionMatch = code.match(/export\s+default\s+function\s+(\w+)/);
  if (functionMatch) {
    const componentName = functionMatch[1];
    // 移除 export default，添加 return 语句
    code = code.replace(/export\s+default\s+function/, 'function');
    code = `(function() {\n${code}\nreturn ${componentName};\n})()`;
    return code;
  }

  // 方案 2：export default Name;
  const nameMatch = code.match(/export\s+default\s+(\w+);/);
  if (nameMatch) {
    const componentName = nameMatch[1];
    code = code.replace(/export\s+default\s+\w+;/, '');
    code = `(function() {\n${code}\nreturn ${componentName};\n})()`;
    return code;
  }

  // 如果没有 export default，假设整个文件是一个表达式
  return `(function() {\n${code}\n})()`;
}

/**
 * 执行编译后的代码，得到组件函数
 */
export function executeComponent(compiledCode: string): React.ComponentType<any> {
  try {
    // 注入 React 到执行环境
    // 因为用户代码里会用到 React.createElement
    const fn = new Function('React', `
      "use strict";
      return ${compiledCode};
    `);

    // 执行函数，传入 React
    const component = fn(React);

    if (typeof component !== 'function') {
      throw new Error('编译结果不是一个函数');
    }

    return component as React.ComponentType<any>;
  } catch (error: any) {
    throw new Error(`执行组件代码失败: ${error.message}`);
  }
}

/**
 * 完整流程：编译 + 执行
 */
export function compileAndExecute(sourceCode: string): {
  success: boolean;
  component?: React.ComponentType<any>;
  error?: string;
} {
  // 第 1 步：编译
  const compileResult = compileComponent(sourceCode);
  if (!compileResult.success || !compileResult.code) {
    return {
      success: false,
      error: compileResult.error
    };
  }

  // 第 2 步：执行
  try {
    const component = executeComponent(compileResult.code);
    return {
      success: true,
      component
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### 第 3 步：修改组件注册服务

修改 `src/services/componentRegistry.ts`，注册自定义组件时编译它：

```typescript
import { ComponentDefinition, ComponentMeta } from '../types/componentMeta';
import { ComponentRegistry } from '../types/componentRegistry';
import { componentStorage } from './componentStorage';
import { compileAndExecute } from '../utils/compiler'; // [新增]

class ComponentRegistryService {
  private registry: ComponentRegistry = {};

  constructor() {
    this.loadCustomComponents();
  }

  registerBuiltin(name: string, component: React.ComponentType<any>, meta: ComponentMeta): void {
    this.registry[name] = {
      meta,
      component,
      sourceCode: '',
      source: 'builtin',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 注册自定义组件（编译源码）
   */
  registerCustom(meta: ComponentMeta, sourceCode: string): void {
    // [修改] 编译源码
    const result = compileAndExecute(sourceCode);

    if (!result.success || !result.component) {
      throw new Error(`组件编译失败: ${result.error}`);
    }

    const definition: ComponentDefinition = {
      meta,
      component: result.component, // [修改] 不再是 null，是编译后的组件函数
      sourceCode,
      source: 'custom',
      createdAt: new Date().toISOString()
    };

    this.registry[meta.name] = definition;
    componentStorage.save(meta.name, definition);
  }

  get(name: string): ComponentDefinition | undefined {
    return this.registry[name];
  }

  getAll(): ComponentRegistry {
    return { ...this.registry };
  }

  getCustomComponents(): ComponentDefinition[] {
    return Object.values(this.registry).filter(def => def.source === 'custom');
  }

  remove(name: string): void {
    delete this.registry[name];
    componentStorage.remove(name);
  }

  /**
   * 加载本地存储的自定义组件（需要重新编译）
   */
  private loadCustomComponents(): void {
    const stored = componentStorage.loadAll();
    
    Object.entries(stored).forEach(([name, definition]) => {
      // [修改] 重新编译组件
      // 因为 component 函数无法序列化到 localStorage
      const result = compileAndExecute(definition.sourceCode);
      
      if (result.success && result.component) {
        this.registry[name] = {
          ...definition,
          component: result.component
        };
      } else {
        console.error(`加载组件 ${name} 失败:`, result.error);
      }
    });
  }
}

export const componentRegistry = new ComponentRegistryService();
```

### 第 4 步：验证编译结果

修改 `src/components/ComponentUploader.tsx`，上传成功后在控制台输出编译信息：

```typescript
// 在 handleFileSelect 函数的 try 块里，注册组件之后添加：

// 注册组件
componentRegistry.registerCustom(meta, sourceCode);

// [新增] 验证组件是否编译成功
const definition = componentRegistry.get(meta.name);
console.log('组件编译成功:', {
  name: meta.name,
  component: definition?.component,
  isFunction: typeof definition?.component === 'function'
});

alert(`组件 "${meta.displayName}" 上传成功！`);
```

## 完整代码

今天修改的文件：

1. **新增** `src/utils/compiler.ts`（完整代码见上面第 2 步）
2. **修改** `src/services/componentRegistry.ts`（完整代码见上面第 3 步）
3. **修改** `src/components/ComponentUploader.tsx`（只加了一行 console.log）

## 运行效果

### 验证功能

1. 启动项目：

```bash
npm run dev
```

2. 准备测试组件（用昨天的 `CustomButton.tsx` 和 `meta.json`）

3. 上传组件：
   - 选择 `meta.json` 和 `CustomButton.tsx`
   - 点击确定

4. **预期结果**：
   - 弹出"组件 '自定义按钮' 上传成功！"
   - 打开浏览器控制台，能看到：

```javascript
组件编译成功: {
  name: "CustomButton",
  component: ƒ CustomButton(props),
  isFunction: true
}
```

5. **在控制台手动测试组件**：

```javascript
// 获取组件
const registry = window.componentRegistry; // 需要先暴露到全局，见下面
const def = registry.get('CustomButton');

// 创建组件实例
const element = React.createElement(def.component, { 
  text: '测试按钮', 
  variant: 'primary', 
  disabled: false 
});

console.log(element); // 应该是一个 React 元素
```

### 暴露 registry 到全局（方便调试）

在 `src/services/componentRegistry.ts` 文件末尾添加：

```typescript
// 开发环境下暴露到全局，方便调试
if (import.meta.env.DEV) {
  (window as any).componentRegistry = componentRegistry;
  (window as any).React = React;
}
```

别忘了在文件顶部导入 React：

```typescript
import React from 'react';
```

## 常见错误

### 错误 1：`React is not defined`

**原因**：编译后的代码里有 `React.createElement`，但执行环境里没有 `React`。

**解决**：
- 检查 `executeComponent` 函数是否传入了 `React`
- 检查 `new Function('React', ...)` 的第一个参数

### 错误 2：`transform is not a function`

**原因**：`@babel/standalone` 导入方式错误。

**解决**：

```typescript
// ❌ 错误
import babel from '@babel/standalone';

// ✅ 正确
import { transform } from '@babel/standalone';
```

### 错误 3：编译后的代码执行报错 `Unexpected token 'export'`

**原因**：`export default` 没有被正确转换。

**解决**：
- 检查 `transformExports` 函数的正则表达式
- 在控制台打印 `compiledCode`，看看 `export` 是否被移除

### 错误 4：刷新页面后自定义组件不见了

**原因**：`loadCustomComponents` 没有重新编译组件。

**解决**：
- 检查 `loadCustomComponents` 是否调用了 `compileAndExecute`
- 检查是否有编译错误（在控制台看 `console.error`）

### 错误 5：编译很慢，页面卡顿

**原因**：`@babel/standalone` 第一次加载较慢（~2MB）。

**优化方案**：
- 生产环境改用后端编译
- 加载时显示 loading 提示
- 缓存编译结果（Day 8 会讲）

## 调试技巧

### 1. 打印编译后的代码

在 `compiler.ts` 的 `compileComponent` 函数里加：

```typescript
console.log('编译后的代码:', result.code);
```

看看 Babel 输出了什么。

### 2. 打印执行环境

在 `executeComponent` 函数里加：

```typescript
console.log('执行代码:', compiledCode);
```

### 3. 测试简单组件

如果复杂组件编译失败，先测试最简单的：

```tsx
export default function Test() {
  return <div>Hello</div>;
}
```

逐步增加复杂度，找到问题点。

## 动手改一改

1. **支持编译错误提示**：上传组件时，如果编译失败，在界面上显示错误信息（不只是 alert）
2. **显示编译时间**：记录编译用了多少毫秒，显示在组件卡片上
3. **支持预编译检查**：上传前先编译一次，如果失败就不保存

## 验收清单

- [ ] 安装了 `@babel/standalone`
- [ ] 上传组件后，控制台显示"组件编译成功"
- [ ] `component` 字段是一个函数（不是 `null`）
- [ ] 在控制台能手动创建组件实例（`React.createElement`）
- [ ] 刷新页面后，组件还能正常加载（重新编译）
- [ ] 如果源码有语法错误，上传时会报错

## 今日总结

### 学到了什么

1. **Babel 编译原理**：JSX → `React.createElement()`
2. **浏览器端编译**：`@babel/standalone` 的用法
3. **动态执行代码**：`new Function()` 的使用和风险
4. **模块导出处理**：把 `export default` 转成函数返回

### 关键代码

```typescript
// 编译
const result = transform(sourceCode, {
  presets: ['react', 'typescript']
});

// 执行
const fn = new Function('React', `return ${compiledCode}`);
const component = fn(React);
```

### 今天的限制

- 组件还**不能在预览区渲染**（Day 3 会做）
- 没有处理 `import` 语句（Day 5 会支持多文件）
- 没有沙箱隔离（Day 7 会加）

### 明天做什么

Day 3 会实现组件的动态实例化和渲染，让自定义组件真正显示在预览区。

---

**核心突破完成！明天就能看到自定义组件在预览区渲染了。**
