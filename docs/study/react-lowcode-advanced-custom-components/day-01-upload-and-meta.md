---
title: Day 1 - 组件上传与元数据解析
---

# Day 1：组件上传与元数据解析

## 今天完成什么

1. 设计自定义组件的元数据格式（`meta.json`）
2. 实现组件上传功能（支持 `.tsx` 文件）
3. 解析元数据并在组件列表里展示自定义组件

## 接在基础课程哪里

这是基础课程 Day 12 的扩展，不是独立项目。

今天第一步：**复制 Day 12 的完整项目代码**，在它的基础上继续开发。

```bash
# 复制基础课程项目
cp -r react-lowcode-infocard react-lowcode-custom-components
cd react-lowcode-custom-components

# 安装依赖
npm install
```

确认项目能正常运行：

```bash
npm run dev
```

打开 `http://localhost:5173`，应该能看到基础课程的完整功能。

## 核心概念

### 1. 组件元数据（Component Metadata）

要让平台知道"这个自定义组件长什么样、有哪些配置项"，需要**元数据**。

元数据包含：

- 组件名称和描述
- 分类（按钮、表单、数据展示...）
- Props 定义（类型、默认值、标签）
- 版本号

类似于 npm 的 `package.json`，但专门描述 React 组件。

### 2. 组件注册表（Component Registry）

平台需要一个"组件仓库"，存储所有可用组件：

- 内置组件（如 `InfoCard`）
- 用户上传的自定义组件

注册表是一个 `Map` 或对象，key 是组件名，value 是组件定义（元数据 + 组件函数）。

### 3. 文件上传 API

浏览器的 `<input type="file">` + `FileReader` API 可以读取用户选择的文件内容。

```typescript
// 读取文件内容
const reader = new FileReader();
reader.onload = (e) => {
  const content = e.target?.result as string;
  console.log(content); // 文件内容
};
reader.readAsText(file);
```

## 动手前的目录

今天会新增这些文件：

```text
src/
├─ types/
│  ├─ componentMeta.ts          # 组件元数据类型定义 [新增]
│  └─ componentRegistry.ts      # 组件注册表类型定义 [新增]
├─ services/
│  ├─ componentRegistry.ts      # 组件注册服务 [新增]
│  └─ componentStorage.ts       # 组件存储服务 [新增]
└─ components/
   ├─ ComponentUploader.tsx     # 组件上传器 [新增]
   └─ ComponentSidebar.tsx      # 扩展支持自定义组件 [修改]
```

## 分步实现

### 第 1 步：定义组件元数据类型

新建 `src/types/componentMeta.ts`：

```typescript
/**
 * 组件元数据 - 描述一个自定义组件的结构和配置
 */
export interface ComponentMeta {
  /** 组件唯一标识（英文，用于注册） */
  name: string;
  
  /** 显示名称（中文，显示在组件列表） */
  displayName: string;
  
  /** 组件描述 */
  description: string;
  
  /** 分类 */
  category: 'basic' | 'form' | 'data' | 'layout' | 'other';
  
  /** 图标（可选，暂时用 emoji） */
  icon?: string;
  
  /** 版本号 */
  version: string;
  
  /** Props 定义 */
  props: {
    [propName: string]: PropMeta;
  };
}

/**
 * 单个 Prop 的元数据
 */
export interface PropMeta {
  /** 类型 */
  type: 'string' | 'number' | 'boolean' | 'enum';
  
  /** 默认值 */
  default: any;
  
  /** 显示标签 */
  label: string;
  
  /** 描述 */
  description?: string;
  
  /** 如果是 enum 类型，这是可选值 */
  options?: string[];
}

/**
 * 组件定义 - 元数据 + 组件函数 + 源码
 */
export interface ComponentDefinition {
  /** 元数据 */
  meta: ComponentMeta;
  
  /** 组件函数（编译后） */
  component: React.ComponentType<any> | null;
  
  /** 源代码 */
  sourceCode: string;
  
  /** 来源 */
  source: 'builtin' | 'custom';
  
  /** 创建时间 */
  createdAt: string;
}
```

### 第 2 步：定义组件注册表类型

新建 `src/types/componentRegistry.ts`：

```typescript
import { ComponentDefinition } from './componentMeta';

/**
 * 组件注册表 - 存储所有可用组件
 */
export interface ComponentRegistry {
  [componentName: string]: ComponentDefinition;
}
```

### 第 3 步：实现组件存储服务

新建 `src/services/componentStorage.ts`：

```typescript
import { ComponentDefinition } from '../types/componentMeta';

const STORAGE_KEY = 'lowcode_custom_components';

/**
 * 组件存储服务 - 负责持久化自定义组件
 */
export const componentStorage = {
  /**
   * 保存组件到 localStorage
   */
  save(name: string, definition: ComponentDefinition): void {
    const components = this.loadAll();
    components[name] = definition;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
  },

  /**
   * 加载所有自定义组件
   */
  loadAll(): Record<string, ComponentDefinition> {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('解析组件存储数据失败:', error);
      return {};
    }
  },

  /**
   * 删除组件
   */
  remove(name: string): void {
    const components = this.loadAll();
    delete components[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
  },

  /**
   * 清空所有自定义组件
   */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
```

### 第 4 步：实现组件注册服务

新建 `src/services/componentRegistry.ts`：

```typescript
import { ComponentDefinition, ComponentMeta } from '../types/componentMeta';
import { ComponentRegistry } from '../types/componentRegistry';
import { componentStorage } from './componentStorage';

/**
 * 组件注册服务 - 管理所有可用组件（内置 + 自定义）
 */
class ComponentRegistryService {
  private registry: ComponentRegistry = {};

  constructor() {
    // 初始化时加载本地存储的自定义组件
    this.loadCustomComponents();
  }

  /**
   * 注册内置组件
   */
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
   * 注册自定义组件（暂时不包含 component 函数，Day 2 会编译）
   */
  registerCustom(meta: ComponentMeta, sourceCode: string): void {
    const definition: ComponentDefinition = {
      meta,
      component: null, // Day 2 会编译成组件函数
      sourceCode,
      source: 'custom',
      createdAt: new Date().toISOString()
    };

    this.registry[meta.name] = definition;
    
    // 持久化到 localStorage
    componentStorage.save(meta.name, definition);
  }

  /**
   * 获取组件定义
   */
  get(name: string): ComponentDefinition | undefined {
    return this.registry[name];
  }

  /**
   * 获取所有组件
   */
  getAll(): ComponentRegistry {
    return { ...this.registry };
  }

  /**
   * 获取所有自定义组件
   */
  getCustomComponents(): ComponentDefinition[] {
    return Object.values(this.registry).filter(def => def.source === 'custom');
  }

  /**
   * 删除组件
   */
  remove(name: string): void {
    delete this.registry[name];
    componentStorage.remove(name);
  }

  /**
   * 加载本地存储的自定义组件
   */
  private loadCustomComponents(): void {
    const stored = componentStorage.loadAll();
    Object.entries(stored).forEach(([name, definition]) => {
      this.registry[name] = definition;
    });
  }
}

// 导出单例
export const componentRegistry = new ComponentRegistryService();
```

### 第 5 步：实现组件上传器

新建 `src/components/ComponentUploader.tsx`：

```typescript
import React, { useState } from 'react';
import { ComponentMeta } from '../types/componentMeta';
import { componentRegistry } from '../services/componentRegistry';

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
      // 今天只支持上传两个文件：meta.json + Component.tsx
      // Day 5 会扩展支持整个文件夹
      const metaFile = Array.from(files).find(f => f.name === 'meta.json');
      const tsxFile = Array.from(files).find(f => f.name.endsWith('.tsx'));

      if (!metaFile || !tsxFile) {
        throw new Error('请同时选择 meta.json 和 .tsx 文件');
      }

      // 读取 meta.json
      const metaContent = await readFileAsText(metaFile);
      const meta: ComponentMeta = JSON.parse(metaContent);

      // 读取 .tsx 源码
      const sourceCode = await readFileAsText(tsxFile);

      // 注册组件
      componentRegistry.registerCustom(meta, sourceCode);

      alert(`组件 "${meta.displayName}" 上传成功！`);
      
      // 清空输入
      e.target.value = '';
      
      onUploadSuccess?.();
    } catch (err: any) {
      setError(err.message || '上传失败');
      console.error('组件上传失败:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
        上传自定义组件
      </div>
      
      <input
        type="file"
        multiple
        accept=".tsx,.json"
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
        提示：同时选择 meta.json 和 .tsx 文件
      </div>
    </div>
  );
}

/**
 * 读取文件内容为文本
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      reject(new Error(`读取文件 ${file.name} 失败`));
    };
    reader.readAsText(file);
  });
}
```

### 第 6 步：扩展组件侧边栏

修改 `src/components/ComponentSidebar.tsx`，支持展示自定义组件：

```typescript
import React, { useState, useEffect } from 'react';
import { ComponentUploader } from './ComponentUploader';
import { componentRegistry } from '../services/componentRegistry';
import { ComponentDefinition } from '../types/componentMeta';

export function ComponentSidebar() {
  const [customComponents, setCustomComponents] = useState<ComponentDefinition[]>([]);

  // 加载自定义组件列表
  const loadCustomComponents = () => {
    setCustomComponents(componentRegistry.getCustomComponents());
  };

  useEffect(() => {
    loadCustomComponents();
  }, []);

  return (
    <div style={{
      width: '240px',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#fafafa'
    }}>
      {/* 上传组件 */}
      <ComponentUploader onUploadSuccess={loadCustomComponents} />

      {/* 内置组件 */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
          内置组件
        </div>
        <div
          style={{
            padding: '12px',
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          📇 InfoCard
        </div>
      </div>

      {/* 自定义组件 */}
      <div style={{ padding: '16px', paddingTop: 0 }}>
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
          自定义组件 ({customComponents.length})
        </div>
        
        {customComponents.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', padding: '20px' }}>
            暂无自定义组件
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customComponents.map(def => (
              <div
                key={def.meta.name}
                style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{def.meta.icon || '🧩'}</span>
                  <span>{def.meta.displayName}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  {def.meta.description}
                </div>
                <div style={{ fontSize: '10px', color: '#ccc', marginTop: '4px' }}>
                  v{def.meta.version}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

## 完整代码

上面就是今天新增的所有代码。确保你的项目结构如下：

```text
src/
├─ types/
│  ├─ config.ts
│  ├─ componentMeta.ts          [新增]
│  └─ componentRegistry.ts      [新增]
├─ services/
│  ├─ componentRegistry.ts      [新增]
│  └─ componentStorage.ts       [新增]
├─ components/
│  ├─ ComponentSidebar.tsx      [修改]
│  ├─ ComponentUploader.tsx     [新增]
│  └─ ... (其他组件不变)
└─ ...
```

## 运行效果

启动项目：

```bash
npm run dev
```

### 验证功能

1. **左侧组件列表**：能看到"上传自定义组件"区域和"内置组件"、"自定义组件"分类
2. **准备测试文件**：创建两个文件用于测试上传

**meta.json**：

```json
{
  "name": "CustomButton",
  "displayName": "自定义按钮",
  "description": "一个支持多种样式的按钮组件",
  "category": "basic",
  "icon": "🔘",
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

**CustomButton.tsx**：

```tsx
import React from 'react';

interface Props {
  text: string;
  variant: 'primary' | 'secondary' | 'danger';
  disabled: boolean;
}

export default function CustomButton({ text, variant, disabled }: Props) {
  const colors = {
    primary: '#1890ff',
    secondary: '#52c41a',
    danger: '#ff4d4f'
  };

  return (
    <button
      disabled={disabled}
      style={{
        padding: '8px 16px',
        backgroundColor: disabled ? '#ccc' : colors[variant],
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px'
      }}
    >
      {text}
    </button>
  );
}
```

3. **上传测试**：
   - 点击"选择文件"
   - 同时选中 `meta.json` 和 `CustomButton.tsx`
   - 点击确定

4. **预期结果**：
   - 弹出"组件 '自定义按钮' 上传成功！"
   - 左侧"自定义组件"列表显示新上传的组件
   - 显示组件图标、名称、描述、版本号

## 常见错误

### 错误 1：`请同时选择 meta.json 和 .tsx 文件`

**原因**：只选了一个文件，或者文件名不对。

**解决**：
- 确保 meta.json 文件名完全匹配
- 确保 tsx 文件以 `.tsx` 结尾
- 选择文件时按住 Ctrl（Windows）或 Command（Mac）多选

### 错误 2：`JSON.parse` 失败

**原因**：meta.json 格式错误。

**解决**：
- 用 JSON 校验工具检查 meta.json
- 注意逗号、引号、括号是否匹配
- 不要有多余的逗号

### 错误 3：上传后刷新页面，自定义组件消失

**原因**：localStorage 存储正常，但 `componentRegistry` 没有加载。

**解决**：
- 检查 `componentRegistry` 构造函数是否调用了 `loadCustomComponents`
- 打开浏览器控制台 → Application → Local Storage → 检查数据是否存在

## 动手改一改

1. **支持删除组件**：给每个自定义组件卡片加一个"删除"按钮
2. **显示上传时间**：格式化显示 `createdAt`（用 `date-fns` 或手写）
3. **支持导出组件**：点击组件卡片，能下载它的源码和 meta.json

## 验收清单

- [ ] 能看到"上传自定义组件"区域
- [ ] 能同时选择 meta.json 和 .tsx 文件
- [ ] 上传成功后弹出提示
- [ ] 左侧列表显示上传的组件
- [ ] 显示组件图标、名称、描述、版本号
- [ ] 刷新页面后自定义组件还在（localStorage 持久化）
- [ ] 上传错误时有明确的错误提示

## 今日总结

### 学到了什么

1. **组件元数据设计**：用 JSON 描述组件的结构和配置
2. **文件上传 API**：`FileReader` 读取用户选择的文件
3. **组件注册表**：管理内置组件和自定义组件
4. **localStorage 持久化**：自定义组件保存到本地

### 今天的限制

- 上传的组件还**不能渲染**（`component` 是 `null`）
- 必须手动选择两个文件，不能直接上传文件夹
- 没有编译 JSX/TSX，只是存储了源码

### 明天做什么

Day 2 会引入 `@babel/standalone`，把用户上传的 `.tsx` 源码编译成可执行的组件函数，这样就能在预览区渲染自定义组件了。

---

**今天的基础工作做完了，明天开始进入核心：动态编译！**
