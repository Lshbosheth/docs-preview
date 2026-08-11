---
title: Day 12 - 代码整理 + 最终验收
---

# Day 12：代码整理 + 最终验收

## 今天完成什么

1. 检查组件职责是否清晰
2. 提取重复的样式常量
3. 最终项目验收

今天不是把代码“擦得漂亮”就算结束，而是确认这 12 天拼起来的功能、数据流和类型检查真的闭环。整理只服务于可读性，不能为了抽象而抽象。

## 接在昨天哪里

昨天完成了性能优化，功能已经全部实现了。

今天做最后的代码整理，让项目更易维护。

## 代码整理清单

### 1. 提取样式常量

当前很多 inline style 是重复的，可以提取出来。

先只提取重复出现、含义稳定的值；一次性出现的布局细节可以继续留在组件里。这样不会把所有样式都搬到一个难以查找的“大字典”里。

新建 `src/styles/tokens.ts`：

```tsx
export const colors = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  border: '#d9d9d9',
  borderLight: '#e0e0e0',
  bg: '#fafafa',
  bgGray: '#f5f5f5',
  text: '#333',
  textLight: '#666',
  textMuted: '#999'
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px'
} as const;

export const fontSize = {
  xs: '11px',
  sm: '12px',
  base: '14px',
  lg: '16px',
  xl: '18px'
} as const;

export const borderRadius = {
  sm: '4px',
  md: '8px'
} as const;
```

然后在组件里引用：

```tsx
import { colors, spacing, fontSize } from '../styles/tokens';

<button style={{
  padding: `6px ${spacing.lg}`,
  backgroundColor: colors.primary,
  fontSize: fontSize.base
}}>
```

### 2. 检查组件职责

确保每个组件只做一件事：

| 组件 | 职责 | 是否清晰 |
|------|------|---------|
| `App.tsx` | 应用入口 | ✅ |
| `LowCodeConfigPage.tsx` | 主配置页，持有 state | ✅ |
| `ComponentSidebar.tsx` | 左侧组件列表 | ✅ |
| `ConfigPanel.tsx` | 配置面板容器 | ✅ |
| `PreviewPanel.tsx` | 预览区容器 | ✅ |
| `InfoCardPreview.tsx` | InfoCard 渲染 | ✅ |
| `BasicConfigForm.tsx` | 基础信息表单 | ✅ |
| `FieldConfigList.tsx` | 字段列表配置 | ✅ |
| `StyleConfigForm.tsx` | 样式配置 | ✅ |
| `ActionConfigList.tsx` | 按钮配置 | ✅ |
| `ConfigJsonViewer.tsx` | JSON 预览 | ✅ |

所有组件职责清晰，无需调整。

### 3. 代码注释规范

关键函数加注释：

```tsx
/**
 * 复用带 id 数组的增删改逻辑。
 * 组件负责把更新后的数组放回自己的配置对象。
 */
export function useConfigArrayUpdater<T extends { id: string }>(
  items: T[],
  onChange: (items: T[]) => void
) {
  // ...
}
```

但不要过度注释，代码本身应该足够清晰。

### 4. README 完善

更新项目 `README.md`：

```markdown
# React 低代码配置页 - InfoCard

用 React 搭建的低代码组件配置页，支持实时预览和 JSON 导出。

## 功能

- ✅ 配置 InfoCard 组件的标题、副标题、状态
- ✅ 增删改字段列表，控制字段显隐
- ✅ 配置布局、尺寸、强调色
- ✅ 增删改操作按钮，控制按钮显隐
- ✅ 实时预览配置效果
- ✅ JSON 预览和复制

## 技术栈

- React（具体版本以项目 `package.json` 为准）
- TypeScript
- Vite

## 启动

\`\`\`bash
npm install
npm run dev
\`\`\`

## 项目结构

\`\`\`
src/
├─ types/          # 类型定义
├─ hooks/          # 自定义 Hook
├─ components/     # 通用组件
├─ features/       # 功能模块
└─ styles/         # 样式常量
\`\`\`

## 核心概念

- 状态提升：config 在 LowCodeConfigPage
- 受控表单：所有输入都绑定 value + onChange
- 不可变更新：数组用 map/filter，对象用展开
- 自定义 Hook：提取复用逻辑
- 性能优化：React.memo + useCallback
```

## 最终验收清单

先不要直接把下面的项目全部打勾。每一项都要在当前代码里实际操作或运行命令后再确认。

### 功能完整性

- [ ] 能配置标题、副标题、状态文案、状态类型、边框
- [ ] 能增删改字段，控制字段显隐
- [ ] 能配置布局（纵向/紧凑）、尺寸（小/中）、强调色
- [ ] 能增删改按钮，控制按钮显隐、类型
- [ ] 右侧预览实时同步
- [ ] JSON 预览和复制

### 代码质量

- [ ] 每个组件职责清晰，不超过 150 行
- [ ] 没有直接修改 state（所有更新都用 `{ ...prev }`）
- [ ] 数组操作用 map/filter，不用 push/splice
- [ ] 列表渲染都有 key，且 key 不是索引
- [ ] 所有 props 有类型定义
- [ ] 提取了可复用的数组更新逻辑
- [ ] 只在有证据的地方使用 React.memo + useCallback

### 推荐验收顺序

1. 运行 `npm run build`，先确认 TypeScript 和生产构建都能通过。
2. 运行 `npm run dev`，逐项修改标题、状态、字段、按钮和样式，确认预览同步。
3. 删除一条字段、隐藏一条字段、修改按钮类型，再刷新页面，确认没有控制台报错或 React key 警告。
4. 打开 JSON 预览，复制内容；再用一份合法 JSON 导入，确认配置能整体替换。
5. 故意导入非法 JSON，确认页面保留原配置，并给出明确错误提示。
6. 打开 React DevTools Profiler，只记录一次实际观察到的优化结果，不凭感觉宣称“性能变好了”。

### 验收时要区分的三件事

- **功能通过**：用户操作后界面和配置数据都正确。
- **类型通过**：`npm run build` 没有 TypeScript 错误，不靠 `as unknown as` 压制问题。
- **结构通过**：组件职责和数据流能用自己的话讲清楚，而不是只记住目录结构。

如果某一项暂时没实现，就保留未勾选并写下缺口。最终验收不是把清单涂满，而是知道项目现在真实完成到哪里。

### 学习目标

回顾 12 天学到的内容：

| 概念 | 掌握程度 |
|------|---------|
| JSX 和组件 | ⭐⭐⭐ |
| props 传递 | ⭐⭐⭐ |
| useState | ⭐⭐⭐ |
| 受控表单 | ⭐⭐⭐ |
| 数组不可变更新 | ⭐⭐⭐ |
| 条件渲染 | ⭐⭐⭐ |
| 动态样式 | ⭐⭐⭐ |
| useMemo | ⭐⭐⭐ |
| 自定义 Hook | ⭐⭐⭐ |
| useCallback | ⭐⭐⭐ |
| React.memo | ⭐⭐⭐ |

## 下一步扩展方向

完成这个项目后，可以继续挑战：

### 扩展 1：引入状态管理

- 用 `useContext` + `useReducer` 替换 props 透传
- 或者引入 Zustand

### 扩展 2：Schema 驱动表单

- 根据 JSON Schema 自动渲染表单
- 支持嵌套配置

### 扩展 3：第二个组件

- 加一个 `StatCard` 统计卡片
- 验证配置框架的复用性

### 扩展 4：接口交互

- 从后端加载配置
- 保存配置到后端
- 加载态、错误态处理

### 扩展 5：拖拽排序

- 用 `dnd-kit` 实现字段拖拽排序
- 多组件画布

### 扩展 6：撤销重做

- 基于 `useReducer` + 历史栈
- 支持 Ctrl+Z / Ctrl+Y

## 动手改一改

1. 给配置面板加一个「重置」按钮，点击后恢复初始配置
2. 给 JSON 预览加一个「导入」按钮，支持粘贴 JSON 并覆盖当前配置
3. 处理导入时的 JSON 解析错误

## 最终总结

### 你已经掌握

- React 组件化思想
- 状态管理基本模式
- 表单处理和数组操作
- 性能优化思路

### 建议

- 多写几个类似项目巩固
- 遇到问题先查 React 官方文档
- 代码写完后自己 review 一遍
- 尝试挑战上面的扩展方向

### 参考资源

- [React 官方文档](https://react.dev)
- [TypeScript 官方文档](https://www.typescriptlang.org)
- [MDN Web Docs](https://developer.mozilla.org)

---

恭喜完成 React 低代码配置页实战课！

你已经能够独立搭建一个完整的 React 配置页项目了。

接下来可以把这个项目加入你的作品集，或者继续挑战更复杂的功能。

继续加油！💪

<ProgressButton courseId="react-lowcode-course" dayId="day-12-final-review" />
