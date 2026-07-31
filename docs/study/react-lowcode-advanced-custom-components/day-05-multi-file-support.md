---
title: Day 5 - 多文件组件支持
---

# Day 5：多文件组件支持

## 今天完成什么

1. 支持上传 zip 文件
2. 解析 zip 包里的多个文件
3. 处理文件间的 `import` 依赖
4. 把多个文件编译成一个可执行的组件

## 接在昨天哪里

昨天打通了单文件组件的完整流程，但现实中的组件往往不是单文件的：

```text
CustomTable/
├─ index.tsx          # 主组件
├─ TableHeader.tsx    # 表头组件
├─ TableRow.tsx       # 行组件
├─ utils.ts           # 工具函数
└─ style.css          # 样式
```

今天要做的：**支持这种多文件组件**。

## 核心概念

### 1. 虚拟文件系统

用一个 `Map` 模拟文件系统：

```typescript
const vfs = new Map<string, string>();
vfs.set('index.tsx', '主组件代码');
vfs.set('TableHeader.tsx', '表头代码');
vfs.set('utils.ts', '工具函数代码');
```

### 2. 依赖解析

解析 `import` 语句，找出依赖关系：

```typescript
// index.tsx
import { formatDate } from './utils';
import TableHeader from './TableHeader';

// 依赖图
index.tsx → utils.ts
index.tsx → TableHeader.tsx
```

### 3. 模块打包

把多个文件编译后拼接成一个大文件：

```javascript
// 打包后的代码
(function() {
  // utils.ts 的编译结果
  const utils = { formatDate: function() { ... } };
  
  // TableHeader.tsx 的编译结果
  const TableHeader = function() { ... };
  
  // index.tsx 的编译结果
  function CustomTable() {
    const { formatDate } = utils;
    // ...
  }
  
  return CustomTable;
})()
```

### 4. 入口文件约定

从 `meta.json` 读取入口文件路径（默认 `index.tsx`）：

```json
{
  "name": "CustomTable",
  "entry": "index.tsx",
  ...
}
```

## 动手前的目录

今天会新增这些文件：

```text
src/
└─ utils/
   ├─ virtualFS.ts           # 虚拟文件系统 [新增]
   ├─ moduleResolver.ts      # 模块依赖解析 [新增]
   └─ bundler.ts             # 简化版打包器 [新增]
```

还会修改：

```text
src/
├─ components/
│  └─ ComponentUploader.tsx  # 支持 zip 上传 [修改]
└─ utils/
   └─ compiler.ts            # 扩展编译逻辑 [修改]
```

## 分步实现

### 第 1 步：安装依赖

```bash
npm install jszip
```

这个库用来解压 zip 文件。

### 第 2 步：实现虚拟文件系统

新建 `src/utils/virtualFS.ts`：

```typescript
/**
 * 虚拟文件系统 - 用 Map 模拟文件存储
 */
export class VirtualFileSystem {
  private files: Map<string, string> = new Map();

  /**
   * 写入文件
   */
  write(path: string, content: string): void {
    this.files.set(this.normalizePath(path), content);
  }

  /**
   * 读取文件
   */
  read(path: string): string | undefined {
    return this.files.get(this.normalizePath(path));
  }

  /**
   * 检查文件是否存在
   */
  exists(path: string): boolean {
    return this.files.has(this.normalizePath(path));
  }

  /**
   * 获取所有文件路径
   */
  getAllPaths(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * 清空文件系统
   */
  clear(): void {
    this.files.clear();
  }

  /**
   * 标准化路径（移除前导 ./）
   */
  private normalizePath(path: string): string {
    return path.replace(/^\.\//, '');
  }

  /**
   * 解析相对路径
   * @param from 当前文件路径
   * @param to 导入路径
   */
  resolvePath(from: string, to: string): string {
    // 移除文件名，保留目录
    const dir = from.split('/').slice(0, -1).join('/');
    
    // 处理相对路径
    if (to.startsWith('./')) {
      return this.normalizePath(dir + '/' + to.slice(2));
    }
    
    if (to.startsWith('../')) {
      const parts = dir.split('/');
      let upCount = 0;
      let path = to;
      
      while (path.startsWith('../')) {
        upCount++;
        path = path.slice(3);
      }
      
      const newDir = parts.slice(0, parts.length - upCount).join('/');
      return this.normalizePath(newDir + '/' + path);
    }
    
    // 绝对路径
    return this.normalizePath(to);
  }
}
```

### 第 3 步：实现模块依赖解析

新建 `src/utils/moduleResolver.ts`：

```typescript
import { VirtualFileSystem } from './virtualFS';

/**
 * 解析文件中的 import 语句
 */
export function parseImports(code: string): string[] {
  const imports: string[] = [];
  
  // 匹配 import 语句
  // import xxx from './xxx'
  // import { xxx } from './xxx'
  // import * as xxx from './xxx'
  const importRegex = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    
    // 只处理相对路径（./xxx 或 ../xxx）
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      imports.push(importPath);
    }
  }
  
  return imports;
}

/**
 * 构建依赖图
 */
export function buildDependencyGraph(
  entryFile: string,
  vfs: VirtualFileSystem
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const visited = new Set<string>();

  function visit(filePath: string) {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    // 尝试添加扩展名
    const possiblePaths = [
      filePath,
      filePath + '.ts',
      filePath + '.tsx',
      filePath + '.js',
      filePath + '.jsx'
    ];

    let actualPath = possiblePaths.find(p => vfs.exists(p));
    if (!actualPath) {
      console.warn(`文件不存在: ${filePath}`);
      return;
    }

    const code = vfs.read(actualPath);
    if (!code) return;

    const imports = parseImports(code);
    const deps: string[] = [];

    imports.forEach(importPath => {
      const resolvedPath = vfs.resolvePath(actualPath!, importPath);
      deps.push(resolvedPath);
      visit(resolvedPath);
    });

    graph.set(actualPath, deps);
  }

  visit(entryFile);
  return graph;
}

/**
 * 拓扑排序（确保依赖先编译）
 */
export function topologicalSort(graph: Map<string, string[]>): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(node: string) {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      throw new Error(`检测到循环依赖: ${node}`);
    }

    visiting.add(node);

    const deps = graph.get(node) || [];
    deps.forEach(dep => visit(dep));

    visiting.delete(node);
    visited.add(node);
    sorted.push(node);
  }

  Array.from(graph.keys()).forEach(visit);
  return sorted;
}
```

### 第 4 步：实现简化版打包器

新建 `src/utils/bundler.ts`：

```typescript
import { VirtualFileSystem } from './virtualFS';
import { buildDependencyGraph, topologicalSort } from './moduleResolver';
import { compileComponent } from './compiler';

/**
 * 打包多文件组件
 */
export function bundleComponent(
  entryFile: string,
  vfs: VirtualFileSystem
): { success: boolean; code?: string; error?: string } {
  try {
    // 1. 构建依赖图
    const graph = buildDependencyGraph(entryFile, vfs);
    
    // 2. 拓扑排序（依赖先编译）
    const sortedFiles = topologicalSort(graph);
    
    // 3. 编译每个文件
    const modules: Record<string, string> = {};
    
    for (const filePath of sortedFiles) {
      const code = vfs.read(filePath);
      if (!code) continue;

      // 跳过 CSS 文件（Day 5 简化处理，不注入样式）
      if (filePath.endsWith('.css')) {
        console.log(`跳过 CSS 文件: ${filePath}`);
        continue;
      }

      // 编译文件
      const result = compileComponent(code);
      if (!result.success || !result.code) {
        return {
          success: false,
          error: `编译 ${filePath} 失败: ${result.error}`
        };
      }

      // 存储编译结果
      modules[filePath] = result.code;
    }

    // 4. 拼接成一个 bundle
    const bundledCode = createBundle(modules, entryFile);

    return {
      success: true,
      code: bundledCode
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 创建 bundle（简化版，不处理复杂的模块系统）
 */
function createBundle(modules: Record<string, string>, entryFile: string): string {
  // 简化策略：把所有模块的代码拼在一起
  // 真实的打包器会处理 import/export，这里我们假设代码已经被 Babel 转换
  
  const moduleEntries = Object.entries(modules)
    .filter(([path]) => path !== entryFile)
    .map(([path, code]) => {
      // 移除 export 语句
      const cleanCode = code.replace(/export\s+(default\s+)?/g, '');
      return `// Module: ${path}\n${cleanCode}`;
    })
    .join('\n\n');

  const entryCode = modules[entryFile] || '';

  return `
(function() {
  ${moduleEntries}
  
  // Entry: ${entryFile}
  ${entryCode}
})()
  `.trim();
}
```

### 第 5 步：修改上传器支持 zip

修改 `src/components/ComponentUploader.tsx`：

```typescript
import React, { useState } from 'react';
import JSZip from 'jszip';
import { ComponentMeta } from '../types/componentMeta';
import { componentRegistry } from '../services/componentRegistry';
import { VirtualFileSystem } from '../utils/virtualFS';
import { bundleComponent } from '../utils/bundler';
import { compileAndExecute } from '../utils/compiler';

interface Props {
  onUploadSuccess?: () => void;
}

export function ComponentUploader({ onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const file = files[0];

      // 判断是 zip 还是单文件
      if (file.name.endsWith('.zip')) {
        await handleZipUpload(file);
      } else {
        await handleSingleFileUpload(files);
      }

      alert('组件上传成功！');
      e.target.value = '';
      onUploadSuccess?.();
    } catch (err: any) {
      setError(err.message || '上传失败');
      console.error('组件上传失败:', err);
    } finally {
      setUploading(false);
    }
  };

  /**
   * 处理 zip 文件上传
   */
  async function handleZipUpload(file: File) {
    // 解压 zip
    const zip = await JSZip.loadAsync(file);
    const vfs = new VirtualFileSystem();

    // 读取所有文件到虚拟文件系统
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue; // 跳过目录
      const content = await zipEntry.async('string');
      vfs.write(path, content);
    }

    // 读取 meta.json
    const metaContent = vfs.read('meta.json');
    if (!metaContent) {
      throw new Error('zip 包中缺少 meta.json');
    }

    const meta: ComponentMeta = JSON.parse(metaContent);

    // 确定入口文件
    const entryFile = (meta as any).entry || 'index.tsx';
    if (!vfs.exists(entryFile)) {
      throw new Error(`入口文件不存在: ${entryFile}`);
    }

    // 打包组件
    const bundleResult = bundleComponent(entryFile, vfs);
    if (!bundleResult.success || !bundleResult.code) {
      throw new Error(`打包失败: ${bundleResult.error}`);
    }

    // 编译执行
    const compileResult = compileAndExecute(bundleResult.code);
    if (!compileResult.success || !compileResult.component) {
      throw new Error(`编译失败: ${compileResult.error}`);
    }

    // 注册组件（直接传编译好的组件函数）
    componentRegistry.registerCustom(meta, bundleResult.code);
  }

  /**
   * 处理单文件上传（向后兼容）
   */
  async function handleSingleFileUpload(files: FileList) {
    const metaFile = Array.from(files).find(f => f.name === 'meta.json');
    const tsxFile = Array.from(files).find(f => f.name.endsWith('.tsx'));

    if (!metaFile || !tsxFile) {
      throw new Error('请选择 meta.json 和 .tsx 文件，或上传 zip 包');
    }

    const metaContent = await readFileAsText(metaFile);
    const meta: ComponentMeta = JSON.parse(metaContent);

    const sourceCode = await readFileAsText(tsxFile);
    componentRegistry.registerCustom(meta, sourceCode);
  }

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
        上传自定义组件
      </div>
      
      <input
        type="file"
        multiple
        accept=".tsx,.json,.zip"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ fontSize: '12px', marginBottom: '8px' }}
      />
      
      {uploading && (
        <div style={{ color: '#1890ff', fontSize: '12px' }}>上传中...</div>
      )}
      
      {error && (
        <div style={{ color: '#ff4d4f', fontSize: '12px' }}>{error}</div>
      )}
      
      <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
        支持：单文件（meta.json + .tsx）或 zip 包
      </div>
    </div>
  );
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error(`读取文件 ${file.name} 失败`));
    reader.readAsText(file);
  });
}
```

## 完整代码

今天的文件：

1. **新增** `src/utils/virtualFS.ts`（虚拟文件系统）
2. **新增** `src/utils/moduleResolver.ts`（依赖解析）
3. **新增** `src/utils/bundler.ts`（打包器）
4. **修改** `src/components/ComponentUploader.tsx`（支持 zip）

## 运行效果

### 准备测试组件

创建一个多文件组件 `CustomTable`：

**meta.json**：
```json
{
  "name": "CustomTable",
  "displayName": "自定义表格",
  "description": "支持多列展示的表格组件",
  "category": "data",
  "icon": "📊",
  "version": "1.0.0",
  "entry": "index.tsx",
  "props": {
    "title": {
      "type": "string",
      "default": "数据表格",
      "label": "表格标题"
    },
    "showBorder": {
      "type": "boolean",
      "default": true,
      "label": "显示边框"
    }
  }
}
```

**index.tsx**：
```tsx
import React from 'react';
import { formatDate } from './utils';
import TableHeader from './TableHeader';

interface Props {
  title: string;
  showBorder: boolean;
}

export default function CustomTable({ title, showBorder }: Props) {
  const data = [
    { id: 1, name: '张三', date: '2024-01-15' },
    { id: 2, name: '李四', date: '2024-01-16' }
  ];

  return (
    <div style={{
      border: showBorder ? '1px solid #e0e0e0' : 'none',
      borderRadius: '4px',
      padding: '16px',
      backgroundColor: 'white'
    }}>
      <TableHeader title={title} />
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#fafafa' }}>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>ID</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>姓名</th>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>日期</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id}>
              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{row.id}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{row.name}</td>
              <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**TableHeader.tsx**：
```tsx
import React from 'react';

interface Props {
  title: string;
}

export default function TableHeader({ title }: Props) {
  return (
    <div style={{
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#333',
      paddingBottom: '8px',
      borderBottom: '2px solid #1890ff'
    }}>
      {title}
    </div>
  );
}
```

**utils.ts**：
```typescript
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
```

### 打包成 zip

把这 4 个文件打包成 `CustomTable.zip`（确保没有额外的文件夹层级，直接是文件）。

### 上传测试

1. 启动项目
2. 点击"选择文件"，选择 `CustomTable.zip`
3. 上传成功后，左侧列表显示"自定义表格"
4. 点击它，右侧预览显示表格
5. 修改"表格标题"，预览实时更新

## 常见错误

### 错误 1：`入口文件不存在: index.tsx`

**原因**：zip 包结构不对，可能多了一层文件夹。

**解决**：确保 zip 包结构是：
```
CustomTable.zip
├─ meta.json
├─ index.tsx
├─ TableHeader.tsx
└─ utils.ts
```

不是：
```
CustomTable.zip
└─ CustomTable/     ← 多了这一层
   ├─ meta.json
   └─ ...
```

### 错误 2：`文件不存在: ./utils`

**原因**：import 路径没有扩展名，解析失败。

**解决**：
- 在 `buildDependencyGraph` 里尝试多个扩展名
- 或者 import 时写完整路径：`import { xxx } from './utils.ts'`

### 错误 3：`检测到循环依赖`

**原因**：文件 A import B，B 又 import A。

**解决**：重构代码，打破循环依赖。

### 错误 4：组件渲染报错 `formatDate is not defined`

**原因**：打包时模块作用域隔离不完整。

**临时方案**：在 `createBundle` 里把所有代码拼在一个作用域。

## 验收清单

- [ ] 能上传 zip 文件
- [ ] zip 包里的多个文件能正确解析
- [ ] 入口文件能 import 其他文件
- [ ] 组件能正常渲染（用到了其他文件的函数/组件）
- [ ] 修改配置后预览实时更新
- [ ] 单文件上传方式仍然可用（向后兼容）

## 今日总结

### 学到了什么

1. **虚拟文件系统**：用 Map 模拟文件存储
2. **依赖解析**：解析 import 语句，构建依赖图
3. **拓扑排序**：确保依赖先编译
4. **简化版打包器**：把多个模块拼成一个文件

### 关键代码

```typescript
// 构建依赖图
const graph = buildDependencyGraph(entryFile, vfs);

// 拓扑排序
const sortedFiles = topologicalSort(graph);

// 编译并拼接
const bundle = sortedFiles.map(file => compile(file)).join('\n');
```

### 今天的限制

- 不能引用外部库（Day 6 会支持）
- CSS 文件被跳过了（没有注入）
- 打包器很简单（不支持复杂的模块系统）

### 明天做什么

Day 6 会预置常用库（React、lodash、antd），让用户组件能 `import` 这些库。

---

**多文件组件支持完成！自定义组件的能力大大增强了。**

<ProgressButton courseId="react-lowcode-advanced-custom-components" dayId="day-05-multi-file-support" />
