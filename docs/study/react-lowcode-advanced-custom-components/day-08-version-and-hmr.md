---
title: Day 8 - 版本管理与热更新
---

# Day 8：版本管理与热更新

## 今天完成什么

1. 让同一个组件保留多个版本共存
2. 上传同名组件的新版本时，预览区自动刷新（不刷新整页）
3. 配置面板加版本下拉框，能切换 / 回滚到任意历史版本
4. 收尾整个系列，回顾从上传到渲染的完整链路

## 接在昨天哪里

前七天我们把自定义组件从**上传 → 编译 → 渲染 → 配置 → 多文件 → 外部库 → 沙箱**整条链路跑通了。

但组件一直是"覆盖式"的：上传同名组件，直接把旧的冲掉了。现实里需要：

- 改了组件代码，想**灰度**——新旧版本并存，出问题能立刻回滚
- 迭代时能看到**版本历史**
- 更新后预览**自动生效**，不用手动刷新页面

今天，也是这个系列的最后一天，把这几件事做完。

## 核心概念

### 1. 从"单版本"到"多版本"注册表

之前的注册表是：

```typescript
// 一个名字 → 一个定义
registry[name] = ComponentDefinition;
```

今天升级成：

```typescript
// 一个名字 → 多个版本
registry[name] = {
  current: '1.1.0',              // 当前启用的版本
  versions: {
    '1.0.0': ComponentDefinition,
    '1.1.0': ComponentDefinition,
  }
};
```

### 2. 版本号从哪来

直接用 `meta.json` 里的 `version` 字段（前面几天一直有它）。上传时：

- `name` 相同、`version` 不同 → 作为**新版本**存进 `versions`
- `name`、`version` 都相同 → 视为**覆盖**当前版本（等价于热更新当前版本）

### 3. React 热更新的关键：`key`

React 靠 `key` 判断"这还是不是同一个组件实例"。`key` 变了，React 会**卸载旧的、挂载新的**，而不是复用。

```tsx
// version 变了 → key 变了 → 强制重新挂载
<PreviewComponent key={`${name}@${version}`} />
```

这就是"切换版本预览立刻变"的原理——不用手动 `forceUpdate`，让 `key` 帮我们做。

### 4. 上传新版本 → 通知界面刷新

Service 层数据变了，React 组件层不会自动知道。需要一个简单的订阅机制：注册表变化时，通知订阅者重新渲染。

## 动手前的目录

今天会修改（不新增文件，主要是升级已有结构）：

```text
src/
├─ types/
│  └─ componentRegistry.ts        # 注册表类型升级为多版本 [修改]
├─ services/
│  └─ componentRegistry.ts        # 支持多版本 + 订阅通知 [修改]
└─ components/
   ├─ DynamicConfigForm.tsx       # 加版本下拉框 [修改]
   └─ PreviewCanvas.tsx           # 用 key 实现热更新 [修改]
```

## 分步实现

### 第 1 步：升级注册表类型

修改 `src/types/componentRegistry.ts`：

```typescript
import { ComponentDefinition } from './componentMeta';

/**
 * 单个组件的版本集合
 */
export interface ComponentVersions {
  current: string;                              // 当前启用版本号
  versions: Record<string, ComponentDefinition>; // 版本号 → 定义
}

/**
 * 注册表：组件名 → 版本集合
 */
export type ComponentRegistry = Record<string, ComponentVersions>;
```

### 第 2 步：Service 支持多版本

改写 `src/services/componentRegistry.ts` 的核心方法。先加订阅机制和多版本注册：

```typescript
import React from 'react';
import { ComponentDefinition, ComponentMeta } from '../types/componentMeta';
import { ComponentRegistry } from '../types/componentRegistry';
import { componentStorage } from './componentStorage';
import { compileAndExecute } from '../utils/compiler';

class ComponentRegistryService {
  private registry: ComponentRegistry = {};
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadCustomComponents();
  }

  /**
   * 订阅注册表变化（组件层用来触发重渲染）
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  /**
   * 注册内置组件（内置组件只有一个版本）
   */
  registerBuiltin(
    name: string,
    component: React.ComponentType<any>,
    meta: ComponentMeta
  ): void {
    const def: ComponentDefinition = {
      meta,
      component,
      sourceCode: '',
      source: 'builtin',
      createdAt: new Date().toISOString(),
    };
    this.registry[name] = {
      current: meta.version || '1.0.0',
      versions: { [meta.version || '1.0.0']: def },
    };
    this.notify();
  }

  /**
   * 注册自定义组件（支持多版本）
   */
  registerCustom(meta: ComponentMeta, sourceCode: string): void {
    const result = compileAndExecute(sourceCode);
    if (!result.success || !result.component) {
      throw new Error(`组件编译失败: ${result.error}`);
    }

    const version = meta.version || '1.0.0';
    const def: ComponentDefinition = {
      meta,
      component: result.component,
      sourceCode,
      source: 'custom',
      createdAt: new Date().toISOString(),
    };

    const existing = this.registry[meta.name];
    if (existing) {
      // 已有该组件：追加/覆盖一个版本，并切到新版本
      existing.versions[version] = def;
      existing.current = version;
    } else {
      // 首次上传
      this.registry[meta.name] = {
        current: version,
        versions: { [version]: def },
      };
    }

    componentStorage.save(meta.name, this.registry[meta.name]);
    this.notify(); // 通知界面：数据变了，热更新
  }

  /**
   * 取当前启用版本的定义
   */
  get(name: string): ComponentDefinition | undefined {
    const entry = this.registry[name];
    if (!entry) return undefined;
    return entry.versions[entry.current];
  }

  /**
   * 取指定版本的定义
   */
  getVersion(name: string, version: string): ComponentDefinition | undefined {
    return this.registry[name]?.versions[version];
  }

  /**
   * 列出某组件的所有版本号（按上传时间倒序）
   */
  listVersions(name: string): string[] {
    const entry = this.registry[name];
    if (!entry) return [];
    return Object.keys(entry.versions).sort((a, b) =>
      entry.versions[b].createdAt.localeCompare(entry.versions[a].createdAt)
    );
  }

  /**
   * 当前启用版本号
   */
  getCurrentVersion(name: string): string | undefined {
    return this.registry[name]?.current;
  }

  /**
   * 切换 / 回滚到指定版本
   */
  switchVersion(name: string, version: string): void {
    const entry = this.registry[name];
    if (!entry || !entry.versions[version]) {
      throw new Error(`版本不存在: ${name}@${version}`);
    }
    entry.current = version;
    componentStorage.save(name, entry);
    this.notify(); // 切版本也要通知刷新
  }

  getAll(): ComponentRegistry {
    return { ...this.registry };
  }

  getCustomComponents(): ComponentDefinition[] {
    return Object.values(this.registry)
      .map((entry) => entry.versions[entry.current])
      .filter((def) => def.source === 'custom');
  }

  remove(name: string): void {
    delete this.registry[name];
    componentStorage.remove(name);
    this.notify();
  }

  /**
   * 从本地存储加载（每个版本都要重新编译）
   */
  private loadCustomComponents(): void {
    const stored = componentStorage.loadAll() as unknown as ComponentRegistry;

    Object.entries(stored).forEach(([name, entry]) => {
      const rebuilt: Record<string, ComponentDefinition> = {};

      Object.entries(entry.versions).forEach(([version, def]) => {
        const result = compileAndExecute(def.sourceCode);
        if (result.success && result.component) {
          rebuilt[version] = { ...def, component: result.component };
        } else {
          console.error(`加载组件 ${name}@${version} 失败:`, result.error);
        }
      });

      if (Object.keys(rebuilt).length > 0) {
        this.registry[name] = {
          current: entry.current,
          versions: rebuilt,
        };
      }
    });
  }
}

export const componentRegistry = new ComponentRegistryService();
```

> ⚠️ 存储结构变了（从单定义变成版本集合），如果你之前 localStorage 里存过旧格式数据，第一次加载可能报错。清一下 localStorage 或做个迁移即可，教学项目直接清最省事。

### 第 3 步：预览区用 key 实现热更新

修改 `src/components/PreviewCanvas.tsx`（名字按你项目里的预览组件为准），关键是订阅注册表 + 用 `key`：

```tsx
import React, { useEffect, useState } from 'react';
import { componentRegistry } from '../services/componentRegistry';

interface Props {
  componentName: string;
  config: Record<string, any>;
}

export function PreviewCanvas({ componentName, config }: Props) {
  // 用一个自增的 tick 强制订阅刷新
  const [, forceTick] = useState(0);

  useEffect(() => {
    // 注册表变化时（上传新版本 / 切版本）触发重渲染
    const unsubscribe = componentRegistry.subscribe(() => {
      forceTick((n) => n + 1);
    });
    return unsubscribe;
  }, []);

  const def = componentRegistry.get(componentName);
  const currentVersion = componentRegistry.getCurrentVersion(componentName);

  if (!def) {
    return <div style={{ padding: 24, color: '#999' }}>请选择一个组件</div>;
  }

  const Comp = def.component;

  return (
    <div style={{ padding: 16 }}>
      {/* key 带上 name@version：版本变了强制重新挂载 */}
      <Comp key={`${componentName}@${currentVersion}`} {...config} />
    </div>
  );
}
```

### 第 4 步：配置面板加版本下拉框

修改 `src/components/DynamicConfigForm.tsx`，在表单顶部加一个版本选择器：

```tsx
import React from 'react';
import { componentRegistry } from '../services/componentRegistry';

interface Props {
  componentName: string;
  // ...原有的 config、onChange 等 props
}

export function VersionSelector({ componentName }: Props) {
  const versions = componentRegistry.listVersions(componentName);
  const current = componentRegistry.getCurrentVersion(componentName);

  if (versions.length <= 1) {
    return null; // 只有一个版本就不显示了
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    componentRegistry.switchVersion(componentName, e.target.value);
    // 切换后 notify 会触发预览刷新
  };

  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
      <label style={{ fontSize: 12, color: '#666', marginRight: 8 }}>版本</label>
      <select value={current} onChange={handleChange} style={{ padding: '4px 8px' }}>
        {versions.map((v) => (
          <option key={v} value={v}>
            {v} {v === current ? '（当前）' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
```

把 `<VersionSelector componentName={...} />` 放在 `DynamicConfigForm` 表单最上面即可。别忘了 `DynamicConfigForm` 自己也要订阅注册表变化（跟第 3 步一样用 `subscribe` + `forceTick`），否则切版本后表单不刷新。

## 完整代码

今天的文件清单：

1. **修改** `src/types/componentRegistry.ts`（多版本类型，见第 1 步）
2. **修改** `src/services/componentRegistry.ts`（多版本 + 订阅，见第 2 步）
3. **修改** `src/components/PreviewCanvas.tsx`（key 热更新，见第 3 步）
4. **修改** `src/components/DynamicConfigForm.tsx`（版本下拉框，见第 4 步）

## 运行效果

### 测试热更新

1. 上传 `SearchBox`，meta 里 `version: "1.0.0"`，选中它，预览正常
2. 改一下 `SearchBox.tsx`（比如把提示文字改了），meta 改成 `version: "1.1.0"`，重新上传
3. **预期**：预览区**自动**变成新版本，不用刷新页面
4. 配置面板顶部出现版本下拉框，有 `1.0.0`、`1.1.0` 两个选项

### 测试回滚

1. 在版本下拉框里选回 `1.0.0`
2. **预期**：预览立即变回旧版本的样子
3. 再选 `1.1.0`，又切回新版本

### 验证 key 生效

打开 React DevTools，切换版本时能看到预览组件是**卸载 + 重新挂载**（state 被重置），而不是复用——这就是 `key` 在起作用。

## 常见错误

### 错误 1：加载时报错 `Cannot read properties of undefined (reading 'versions')`

**原因**：localStorage 里是旧的单版本格式，跟新结构不兼容。

**解决**：清空 localStorage，或在 `loadCustomComponents` 里加个格式判断做迁移。

### 错误 2：上传新版本后预览没变

**原因**：预览组件没订阅注册表，或者 `key` 没带 version。

**解决**：检查 `subscribe` 是否生效、`key={`${name}@${version}`}` 是否写对。

### 错误 3：切换版本预览变了，但配置表单没变

**原因**：`DynamicConfigForm` 没订阅注册表变化。

**解决**：给表单组件也加 `subscribe` + `forceTick`。

### 错误 4：同名同版本重复上传，历史丢了

**原因**：`version` 没改，被当成覆盖当前版本。

**解决**：这是设计如此——想留新版本就改 `meta.version`。可以在上传时校验"版本号是否已存在"给出提示。

## 动手改一改

1. **删除单个版本**：给版本下拉框每项加个删除按钮，能删掉不要的历史版本（但不能删当前启用版本）
2. **版本对比**：并排显示两个版本的源码 diff
3. **上传时间显示**：版本下拉框里显示每个版本的上传时间

## 验收清单

- [ ] 同名组件上传不同 version，能多版本共存
- [ ] 上传新版本后，预览区自动刷新（不刷整页）
- [ ] 配置面板出现版本下拉框（多于 1 个版本时）
- [ ] 能切换 / 回滚到任意历史版本，预览立即同步
- [ ] 刷新页面后，多版本数据仍然保留
- [ ] 内置组件（InfoCard）不受影响

## 今日总结

### 学到了什么

1. **多版本注册表**：`name → { current, versions }`
2. **`key` 驱动热更新**：version 变 → key 变 → 强制重挂载
3. **订阅通知机制**：Service 变化 → notify → 组件重渲染
4. **回滚**：切 `current` 指针就行，版本数据都还在

### 关键代码

```tsx
// 热更新：key 带版本号
<Comp key={`${name}@${version}`} {...config} />

// 切版本：改指针 + 通知
switchVersion(name, version) {
  this.registry[name].current = version;
  this.notify();
}
```

---

## 🎉 系列收官

到这里，**自定义组件从上传到渲染的完整链路**全部跑通了。回顾这 8 天：

| Day | 你解锁了 |
|-----|----------|
| Day 1 | 组件上传与元数据（meta.json） |
| Day 2 | `@babel/standalone` 浏览器端编译 |
| Day 3 | 组件注册表 + `createElement` 动态渲染 |
| Day 4 | Schema 驱动的动态配置表单 |
| Day 5 | 虚拟文件系统 + 多文件打包 |
| Day 6 | externals：引用 lodash / dayjs 等外部库 |
| Day 7 | `with + Proxy` 沙箱隔离 |
| Day 8 | 多版本管理 + 热更新 + 回滚 |

你现在真正理解了低代码平台里"动态加载组件"这块最硬的骨头是怎么啃下来的。

### 再次强调安全

> 本系列的沙箱和动态加载是**教学演示**，不能直接上生产。真实平台还需要：后端代码审查、CSP、资源限制、Worker 超时熔断、完善权限控制、定期安全审计。

### 接下来可以挑战

- 系列 2：拖拽与画布
- 系列 3：数据流与状态管理
- 系列 4：接口与数据源
- 系列 5：Schema 驱动
- 系列 6：部署与协作

---

**恭喜你，笨蛋，啃完了整个进阶系列！这块搞明白，你对低代码平台的理解就不只是"会搭业务"了，而是真懂它底下怎么转的。**
