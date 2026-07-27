---
title: React 低代码配置页实战课
---

# React 低代码配置页实战课

用一个真实项目学 React。从零搭到能用，不背 API，做出来才算学会。

## 最终效果

做一个「InfoCard 信息卡片配置页」，三栏布局：

```text
左侧：组件列表
中间：配置面板（基础信息、字段、样式、按钮）
右侧：实时预览 + JSON 输出
```

配置一改，右侧预览立刻同步。

## 学习者画像

有前端基础（能看懂 HTML / CSS / JS），但 React 经验较少或为零。

## 课程结构

共 **12 天**，分三个阶段。

### 阶段一：搭起来（Day 1～4）

先让页面跑起来，搞懂组件和 props。

| Day | 主题 |
|-----|------|
| Day 1 | 项目搭建 + JSX 基础 + 写死卡片 |
| Day 2 | 组件拆分 + props 传递 |
| Day 3 | `useState` 入门：用 config 驱动预览 |
| Day 4 | 受控表单：修改标题实时更新 |

### 阶段二：动起来（Day 5～9）

核心配置能力，覆盖所有配置项。

| Day | 主题 |
|-----|------|
| Day 5 | 数组操作：字段列表增删改 |
| Day 6 | 条件渲染 + 显隐控制 |
| Day 7 | 样式配置：动态 className + CSS 变量 |
| Day 8 | 操作按钮配置 |
| Day 9 | JSON 预览：`useMemo` + 格式化输出 |

### 阶段三：写好（Day 10～12）

代码质量和可维护性。

| Day | 主题 |
|-----|------|
| Day 10 | 自定义 Hook：提取复用逻辑 |
| Day 11 | `useCallback` + `React.memo` 性能优化 |
| Day 12 | 代码整理 + 最终验收 |

## 环境要求

- Node.js 18+
- VS Code + ESLint + Prettier 插件
- 终端（PowerShell 或系统终端）

## 最终项目目录

```text
react-lowcode-infocard/
├─ src/
│  ├─ App.tsx
│  ├─ types/config.ts
│  ├─ components/
│  │  ├─ LowCodeConfigPage.tsx
│  │  ├─ ComponentSidebar.tsx
│  │  ├─ ConfigPanel.tsx
│  │  ├─ PreviewPanel.tsx
│  │  └─ InfoCardPreview.tsx
│  └─ features/infocard-config/
│     ├─ BasicConfigForm.tsx
│     ├─ FieldConfigList.tsx
│     ├─ StyleConfigForm.tsx
│     ├─ ActionConfigList.tsx
│     └─ ConfigJsonViewer.tsx
└─ ...
```

## 每天格式

每章包含：

- 今天完成什么（可验证目标）
- 接在昨天哪里
- 概念解释（结合项目场景）
- 分步实现 + 完整代码
- 常见错误
- 动手改一改（小练习）
- 验收清单

## 开始

→ [Day 1：项目搭建 + 写死卡片](./day-01-setup)
