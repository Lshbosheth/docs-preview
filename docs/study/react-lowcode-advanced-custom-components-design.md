# React 低代码进阶 - 自定义组件动态加载系列设计

> 本文是交给内容生成模型或编码 Agent 的课程施工说明。
> 正式教程应按本文拆成独立章节，放进 `docs/study/react-lowcode-advanced-custom-components/`。

## 1. 为什么需要这个系列

完成基础课程（Day 1～12）后，学习者已经掌握：

- React 组件化开发
- 状态管理和数据流
- 配置驱动预览

但现有项目的**核心限制**：

- 只支持预置的 `InfoCard` 组件
- 开发者想加新组件类型，必须改源码、重新部署
- 无法让业务方自己扩展组件库

**真正的低代码平台需要：**

- 开发者能上传自己写的 React 组件
- 平台动态编译、注册、渲染这些组件
- 业务方能像用内置组件一样用自定义组件

这就是本系列要解决的问题：**从上传到渲染的完整自定义组件链路**。

## 2. 学习者画像与前置要求

### 前置要求

- **必须**完成基础课程 Day 1～12
- 熟悉 React 组件、props、state、Hook
- 了解 JavaScript 模块系统（import/export）
- 了解 TypeScript 基础类型

### 学习者画像

- 想做真正可扩展的低代码平台
- 想理解"动态加载组件"的原理
- 准备好啃一些偏底层的知识（编译、模块解析）

### 不适合的人

- 对 React 还不熟，基础课都没学完
- 只想快速搭业务，不关心底层实现
- 期望开箱即用的完整方案（这是教学项目，不是生产框架）

## 3. 系列目标

完成本系列后，学习者能：

1. 设计自定义组件的上传、存储、元数据结构
2. 用 `@babel/standalone` 在浏览器端编译 JSX/TSX
3. 动态注册和实例化 React 组件
4. 根据组件元数据自动生成配置表单
5. 处理多文件组件和依赖关系
6. 实现基础的沙箱隔离
7. 支持组件版本管理和热更新

最终项目：**在 Day 1～12 的配置页基础上，扩展出自定义组件上传和动态加载能力**。

## 4. 系列结构

共 **8 天**，分三个阶段。

### 阶段一：单文件组件加载（Day 1～3）

先让最简单的场景跑通：上传一个单文件 React 组件，编译它，渲染它。

### 阶段二：完整的组件生态（Day 4～6）

支持多文件组件、依赖管理、动态属性面板。

### 阶段三：生产化能力（Day 7～8）

沙箱隔离、版本管理、热更新。

## 5. 详细课程蓝图

### Day 1：组件上传与元数据解析

**今日目标：**

- 设计自定义组件的元数据格式（`meta.json`）
- 实现组件上传接口（先支持单个 `.tsx` 文件）
- 解析元数据并在组件列表里展示

**核心概念：**

- 组件元数据设计
- 文件上传与读取（`FileReader` API）
- 组件注册表结构

**项目变化：**

```text
扩展 ComponentSidebar
  ↓
新增"上传自定义组件"按钮
  ↓
上传 .tsx 文件 + meta.json
  ↓
存储到 localStorage
  ↓
组件列表展示自定义组件（带标记）
```

**meta.json 设计：**

```json
{
  "name": "CustomButton",
  "displayName": "自定义按钮",
  "description": "一个支持多种样式的按钮组件",
  "category": "basic",
  "icon": "button",
  "version": "1.0.0",
  "props": {
    "text": {
      "type": "string",
      "default": "点击我",
      "label": "按钮文字"
    },
    "variant": {
      "type": "enum",
      "options": ["primary", "secondary", "danger"],
      "default": "primary",
      "label": "按钮类型"
    },
    "disabled": {
      "type": "boolean",
      "default": false,
      "label": "是否禁用"
    }
  }
}
```

**当天闭环：**

上传一个自定义组件后，能在左侧组件列表看到它，显示名称、描述、版本号。

**为下一天留下：**

组件的源码已经存储，但还没有编译和渲染。

---

### Day 2：动态编译 React 组件

**今日目标：**

- 引入 `@babel/standalone`
- 编译用户上传的 JSX/TSX 代码
- 用 `Function` 或 `eval` 执行编译后的代码
- 拿到组件函数

**核心概念：**

- Babel 编译原理
- `@babel/standalone` 浏览器端使用
- `new Function()` 动态执行代码
- 作用域和闭包

**项目变化：**

```text
新增 utils/compiler.ts
  ↓
compile(sourceCode: string): 编译成 ES5
  ↓
execute(compiledCode: string): 执行并返回组件函数
  ↓
注册到全局组件注册表
```

**实现要点：**

1. 安装 `@babel/standalone`
2. 配置 Babel presets（`react`, `typescript`）
3. 编译时处理 `import React from 'react'`（替换成全局变量）
4. 用 `new Function('React', compiledCode)` 执行
5. 错误处理和调试

**当天闭环：**

编译成功后，在 console 里能看到组件函数，调用它能返回 React 元素。

**常见错误：**

- `React is not defined`：需要把 React 注入到执行环境
- `export is not defined`：需要把 `export default Component` 转成 `return Component`
- 编译失败但没有错误提示：需要加 try-catch 包裹

**为下一天留下：**

能编译组件，但还没有渲染到画布上。

---

### Day 3：组件注册与实例化

**今日目标：**

- 设计组件注册表（内置组件 + 自定义组件）
- 选中自定义组件后，在右侧预览区实例化它
- 用 `React.createElement()` 动态渲染

**核心概念：**

- 组件注册表设计
- `React.createElement(Component, props)` 动态渲染
- 类型安全的组件调用

**项目变化：**

```text
新增 types/componentRegistry.ts
  ↓
ComponentRegistry = Map<string, ComponentDefinition>
  ↓
内置组件：InfoCard
自定义组件：用户上传的
  ↓
选中组件 → 从注册表取组件函数 → createElement → 渲染
```

**ComponentDefinition 结构：**

```typescript
interface ComponentDefinition {
  name: string;
  displayName: string;
  component: React.ComponentType<any>; // 组件函数
  meta: ComponentMeta; // 元数据
  source: 'builtin' | 'custom'; // 来源
  createdAt: string;
}
```

**当天闭环：**

点击左侧自定义组件，右侧预览区能渲染出来（虽然 props 还是默认值）。

**为下一天留下：**

组件能渲染，但配置面板还是写死的 `InfoCard` 配置表单。

---

### Day 4：属性面板动态生成

**今日目标：**

- 根据 `meta.json` 的 props schema 自动生成配置表单
- 支持基础类型：string, number, boolean, enum
- 修改配置实时更新预览

**核心概念：**

- Schema 驱动 UI
- 表单渲染引擎
- 类型映射（schema type → input type）

**项目变化：**

```text
新增 components/DynamicConfigForm.tsx
  ↓
读取当前组件的 meta.props
  ↓
遍历 props，根据 type 渲染不同输入控件
  ↓
修改值 → 更新 config → 预览同步
```

**类型映射：**

| Schema Type | Input Control |
|-------------|---------------|
| string      | `<input type="text">` |
| number      | `<input type="number">` |
| boolean     | `<input type="checkbox">` |
| enum        | `<select>` |

**当天闭环：**

选中自定义组件后，右侧配置面板自动显示该组件的属性配置，修改后预览实时同步。

**为下一天留下：**

单文件组件已经能完整跑通，但用户想上传复杂组件（多个文件）时还不支持。

---

### Day 5：多文件组件支持

**今日目标：**

- 支持上传文件夹（或 zip 包）
- 解析多个 `.tsx/.ts/.css` 文件
- 处理文件间的 `import` 依赖
- 打包成一个可执行的组件

**核心概念：**

- 文件系统模拟（虚拟文件系统）
- 模块依赖解析
- 简化版 bundler
- 入口文件约定

**项目变化：**

```text
支持上传 .zip 文件
  ↓
解压到虚拟文件系统（Map<path, content>）
  ↓
从 meta.json 读取 entry（默认 index.tsx）
  ↓
递归解析 import 语句
  ↓
编译所有依赖文件
  ↓
拼接成一个 bundle
  ↓
执行 bundle 得到组件函数
```

**文件结构示例：**

```text
MyTable.zip
├── meta.json
├── index.tsx          # 入口，导出主组件
├── TableHeader.tsx    # 子组件
├── useTableData.ts    # 自定义 Hook
├── utils.ts           # 工具函数
└── style.css          # 样式
```

**依赖解析逻辑：**

1. 解析 `import { xxx } from './xxx'` 语句
2. 读取对应文件内容
3. 递归编译依赖文件
4. 替换 `import` 为内联代码或模块映射

**当天闭环：**

上传一个包含多个文件的组件包，能正确编译和渲染。

**常见错误：**

- 循环依赖导致死循环
- 路径解析错误（相对路径 `./` 和 `../`）
- CSS 文件没有正确注入

**为下一天留下：**

多文件组件能跑，但如果用户组件里 `import` 了外部库（如 `lodash`），会报错。

---

### Day 6：依赖管理与外部库

**今日目标：**

- 预置常用库（React, lodash, date-fns 等）
- 用户组件能 `import` 预置库
- 支持 externals 配置（不打包进 bundle）

**核心概念：**

- 模块解析策略
- externals 配置
- UMD 格式库加载

**项目变化：**

```text
新增 utils/externalModules.ts
  ↓
预置常用库的全局引用
  ↓
编译时识别外部依赖
  ↓
不编译外部依赖，直接映射到全局变量
```

**预置库清单：**

```typescript
const externalModules = {
  'react': window.React,
  'lodash': window._,
  'date-fns': window.dateFns,
  'antd': window.antd,
};
```

**编译时处理：**

```typescript
// 用户代码
import { debounce } from 'lodash';

// 编译后
const debounce = window._.debounce;
```

**当天闭环：**

用户上传的组件能 `import lodash` 或 `antd`，正常使用预置库的功能。

**为下一天留下：**

组件能用，但没有安全隔离，恶意代码能访问 `window`、`localStorage` 等敏感 API。

---

### Day 7：沙箱与安全隔离

**今日目标：**

- 限制用户组件能访问的 API
- 防止恶意代码（无限循环、访问敏感数据）
- 用 iframe 或 Proxy 实现沙箱

**核心概念：**

- JavaScript 沙箱原理
- `with` + `Proxy` 实现作用域隔离
- iframe 跨域隔离
- Web Worker 隔离

**项目变化：**

```text
新增 utils/sandbox.ts
  ↓
方案 1：with + Proxy（轻量级）
方案 2：iframe（强隔离）
  ↓
用户组件只能访问白名单 API
  ↓
禁止访问 window.localStorage、document.cookie 等
```

**方案 1：with + Proxy（推荐学习）**

```typescript
function executeInSandbox(code: string, context: any) {
  const sandbox = new Proxy(context, {
    has: () => true, // 拦截所有变量访问
    get: (target, key) => {
      if (key === 'window' || key === 'document') {
        throw new Error('禁止访问敏感对象');
      }
      return target[key];
    }
  });
  
  const fn = new Function('sandbox', `with(sandbox) { ${code} }`);
  return fn(sandbox);
}
```

**方案 2：iframe 隔离（更安全但更重）**

```typescript
// 在 iframe 里执行用户代码
const iframe = document.createElement('iframe');
iframe.sandbox = 'allow-scripts';
iframe.srcdoc = `
  <script>${compiledCode}</script>
`;
```

**当天闭环：**

用户组件尝试访问 `window.localStorage` 时被拦截，控制台报错。

**常见错误：**

- `with` 在严格模式下不可用（需要非严格模式编译）
- Proxy 无法拦截某些原生对象
- iframe 通信复杂度高

**为下一天留下：**

组件安全性提升，但还不支持版本管理和热更新。

---

### Day 8：版本管理与热更新

**今日目标：**

- 组件支持多版本共存
- 更新组件代码后，预览区自动刷新（不刷新页面）
- 支持回滚到旧版本

**核心概念：**

- 组件版本号管理
- React 组件热替换
- `key` 强制重新挂载

**项目变化：**

```text
扩展 ComponentDefinition 支持 version
  ↓
上传新版本时保留旧版本
  ↓
注册表结构：Map<name, Map<version, ComponentDefinition>>
  ↓
配置面板支持选择组件版本
  ↓
切换版本 → 更新 key → 强制重新渲染
```

**版本管理结构：**

```typescript
interface ComponentRegistry {
  [name: string]: {
    current: string; // 当前使用的版本号
    versions: {
      [version: string]: ComponentDefinition;
    };
  };
}
```

**热更新实现：**

```typescript
// 上传新版本
function uploadNewVersion(name: string, version: string, component: any) {
  registry[name].versions[version] = component;
  
  // 如果是当前版本，触发热更新
  if (registry[name].current === version) {
    forceUpdate(); // 强制重新渲染预览区
  }
}
```

**当天闭环：**

- 上传同名组件的新版本，预览区自动刷新
- 在版本下拉框里切换版本，预览立即同步
- 支持回滚到任意历史版本

**最终验收：**

完成系列 1 的全部目标，自定义组件从上传到渲染的完整链路跑通。

---

## 6. 每章写作规范

与基础课程保持一致：

1. **今天完成什么**：2～3 个可验证目标
2. **接在昨天哪里**：展示上一章的产出
3. **概念解释**：讲清楚本章核心技术点
4. **动手前的目录**：当前文件结构
5. **分步实现**：每次只加一小块代码
6. **完整代码**：本章所有新增/修改文件的完整内容
7. **运行效果**：截图或文字描述
8. **常见错误**：调试技巧和排错思路
9. **动手改一改**：10～15 分钟练习
10. **验收清单**：Markdown checkbox
11. **今日总结**：三行总结
12. **留给明天的接口**：下一章的输入

每章正文建议 2,500～3,500 个中文字（比基础课略长，因为技术深度更高）。

## 7. 代码规范

- TypeScript 严格模式
- 错误处理不能省略（用户上传的代码随时可能出错）
- 安全性优先（沙箱、校验、限制）
- 完整文件不得用 `...` 省略关键代码
- 每个代码块注明文件路径
- 复杂逻辑加注释

## 8. 文档站落地结构

```text
docs/study/react-lowcode-advanced-custom-components/
├─ index.md                        # 系列首页
├─ day-01-upload-and-meta.md       # Day 1
├─ day-02-dynamic-compile.md       # Day 2
├─ day-03-register-and-render.md   # Day 3
├─ day-04-dynamic-props-form.md    # Day 4
├─ day-05-multi-file-support.md    # Day 5
├─ day-06-external-dependencies.md # Day 6
├─ day-07-sandbox-isolation.md     # Day 7
└─ day-08-version-and-hmr.md       # Day 8
```

系列首页应包含：

- 为什么需要这个系列
- 前置要求（必须完成基础课程）
- 最终能做出什么
- 8 天学习计划
- 技术栈和环境要求

## 9. 验收标准

每章完成后，检查：

- 代码能否复制粘贴后直接运行
- 是否只用了已讲解的 React 知识
- 错误处理是否完整
- 是否讲清楚了"为什么这样设计"
- 学习者能否在 90～120 分钟内完成（进阶课可以比基础课长）
- 所有外部依赖是否在文档里说明安装方法

## 10. 与基础课程的衔接

Day 1 开头必须明确：

- 这是基础课程的**扩展**，不是独立课程
- 必须先完成 Day 1～12
- 会在 Day 12 的项目基础上继续开发

Day 1 第一步应该是：

```text
复制 Day 12 的完整项目代码
  ↓
重命名为 react-lowcode-custom-components
  ↓
安装新依赖（@babel/standalone 等）
  ↓
开始扩展
```

## 11. 扩展方向

完成系列 1 后，学习者可以继续挑战：

- 系列 2：拖拽与画布
- 系列 3：数据流与状态管理
- 系列 4：接口与数据源
- 系列 5：Schema 驱动
- 系列 6：部署与协作

在 Day 8 结尾给出这些扩展方向的链接（如果已生成）。

---

## 12. 注意事项

### 安全警告

必须在 Day 7 强调：

> 本课程的沙箱实现是**教学演示**，不足以用于生产环境。  
> 真实的低代码平台需要更严格的安全措施：
> - 后端代码审查
> - 资源使用限制（CPU、内存、网络）
> - 内容安全策略（CSP）
> - 定期安全审计

### 浏览器兼容性

Day 2 必须说明：

> `@babel/standalone` 体积较大（~2MB），生产环境建议后端编译。  
> 本课程为了教学简化，选择浏览器端编译。

### 性能提示

Day 5 和 Day 6 应提示：

> 每次上传都重新编译较慢，生产环境应加缓存。  
> 可以用 Service Worker 或 IndexedDB 缓存编译结果。

---

课程设计完成。下一步生成正式教程内容。
