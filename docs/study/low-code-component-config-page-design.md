# React 低代码组件配置页设计文档

日期：2026-07-07

## 1. 项目定位

做一个小型低代码组件配置页面，用来练 React 的真实业务能力。

它不是完整低代码平台，也不是拖拽编辑器。第一版只解决一件事：

> 通过表单配置一个组件，并在右侧实时预览组件效果。

学习目标是把 React 的状态、组件拆分、表单、配置数据、预览渲染、JSON schema 这几块串起来。

## 2. 第一版做什么组件

第一版组件选择：`InfoCard` 信息卡片。

原因：

- 足够简单，不会一上来被表格、拖拽、权限、复杂联动拖死。
- 足够像业务组件，后续可以自然扩展到列表、统计卡片、详情面板。
- 配置项覆盖面刚好：文本、颜色、开关、枚举、数组、数据字段映射。

### InfoCard 展示效果

`InfoCard` 用来展示一条业务对象信息，例如：

- 客户信息卡片
- 工单信息卡片
- 项目信息卡片
- 设备信息卡片

卡片内容包括：

- 标题
- 副标题
- 状态标签
- 关键字段列表
- 操作按钮

示例：

```text
客户资料
郑州某某科技有限公司        跟进中

联系人：张三
手机号：138****8888
来源：官网表单

[查看详情] [新建跟进]
```

## 3. 页面结构

页面采用三栏布局：

```text
左侧：组件列表
中间：配置面板
右侧：实时预览 + JSON 输出
```

第一版可以先只做一个组件，但保留左侧组件列表的位置。

### 左侧组件列表

第一版只有：

- 信息卡片 `InfoCard`

后续可扩展：

- 统计卡片 `StatCard`
- 标题栏 `TitleBar`
- 数据列表 `DataList`
- 表单区块 `FormSection`

### 中间配置面板

配置面板分为 4 组：

1. 基础信息
2. 内容字段
3. 样式设置
4. 操作按钮

### 右侧预览区

右侧分成上下两块：

- 上方：组件实时预览
- 下方：当前配置 JSON

配置一改，预览和 JSON 都要同步变化。

## 4. InfoCard 配置项

### 基础信息

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 卡片标题 |
| `subtitle` | string | 卡片副标题 |
| `statusText` | string | 状态标签文案 |
| `statusType` | enum | 状态类型 |
| `showBorder` | boolean | 是否显示边框 |

`statusType` 可选值：

- `default`
- `success`
- `warning`
- `danger`

### 内容字段

字段列表使用数组配置。

```ts
type InfoCardField = {
  id: string;
  label: string;
  value: string;
  visible: boolean;
};
```

第一版要支持：

- 新增字段
- 删除字段
- 修改字段名
- 修改字段值
- 控制字段是否显示

### 样式设置

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `layout` | enum | 布局方式 |
| `size` | enum | 卡片尺寸 |
| `accentColor` | string | 强调色 |

`layout` 可选：

- `vertical`
- `compact`

`size` 可选：

- `small`
- `medium`

第一版不做复杂主题系统，只用几个固定选项。

### 操作按钮

```ts
type InfoCardAction = {
  id: string;
  text: string;
  type: "primary" | "default";
  visible: boolean;
};
```

第一版支持：

- 新增按钮
- 删除按钮
- 修改按钮文案
- 修改按钮类型
- 控制按钮是否显示

按钮点击第一版只弹出 `alert` 或写入日志，不接业务接口。

## 5. 核心数据结构

第一版用一个 `InfoCardConfig` 管全部配置。

```ts
type InfoCardConfig = {
  title: string;
  subtitle: string;
  statusText: string;
  statusType: "default" | "success" | "warning" | "danger";
  showBorder: boolean;
  layout: "vertical" | "compact";
  size: "small" | "medium";
  accentColor: string;
  fields: InfoCardField[];
  actions: InfoCardAction[];
};
```

初始配置：

```ts
const initialInfoCardConfig: InfoCardConfig = {
  title: "客户资料",
  subtitle: "郑州某某科技有限公司",
  statusText: "跟进中",
  statusType: "success",
  showBorder: true,
  layout: "vertical",
  size: "medium",
  accentColor: "#1677ff",
  fields: [
    { id: "contact", label: "联系人", value: "张三", visible: true },
    { id: "phone", label: "手机号", value: "138****8888", visible: true },
    { id: "source", label: "来源", value: "官网表单", visible: true }
  ],
  actions: [
    { id: "detail", text: "查看详情", type: "primary", visible: true },
    { id: "follow", text: "新建跟进", type: "default", visible: true }
  ]
};
```

## 6. React 组件拆分

建议先拆成这些组件：

```text
LowCodeConfigPage
├─ ComponentSidebar
├─ ConfigPanel
│  ├─ BasicConfigForm
│  ├─ FieldConfigList
│  ├─ StyleConfigForm
│  └─ ActionConfigList
├─ PreviewPanel
│  ├─ InfoCardPreview
│  └─ ConfigJsonViewer
```

### 组件职责

`LowCodeConfigPage`

- 持有 `config` 状态。
- 把配置传给配置面板和预览面板。
- 提供更新配置的方法。

`ConfigPanel`

- 负责展示所有配置表单。
- 不直接关心预览长什么样。

`InfoCardPreview`

- 只负责根据 `config` 渲染卡片。
- 不负责修改配置。

`ConfigJsonViewer`

- 把当前配置格式化成 JSON 展示。

## 7. 状态管理策略

第一版只用 React 内置状态：

- `useState`
- 必要时用 `useMemo`
- 暂时不引入 Redux、Zustand、React Query

核心状态：

```ts
const [config, setConfig] = useState<InfoCardConfig>(initialInfoCardConfig);
```

更新单个字段：

```ts
setConfig(prev => ({
  ...prev,
  title: nextTitle
}));
```

更新数组字段时保持不可变更新：

```ts
setConfig(prev => ({
  ...prev,
  fields: prev.fields.map(field =>
    field.id === id ? { ...field, value: nextValue } : field
  )
}));
```

## 8. 每天推进计划

按工作日上午 `10:00 - 11:30` 推进。

每天只做一个小功能。

### Day 1：搭页面骨架

目标：

- 创建 React 项目或在现有项目中新建页面。
- 搭出三栏布局。
- 写死一个 `InfoCardPreview`。

产出：

- 页面能打开。
- 右侧能看到写死的卡片。

### Day 2：接入配置状态

目标：

- 定义 `InfoCardConfig`。
- 用 `useState` 管配置。
- 让预览从 `config` 读取数据。

产出：

- 改 `initialInfoCardConfig`，预览会变。

### Day 3：基础信息表单

目标：

- 做 `BasicConfigForm`。
- 支持修改标题、副标题、状态文案、状态类型、是否显示边框。

产出：

- 表单一改，预览实时变化。

### Day 4：字段列表配置

目标：

- 做 `FieldConfigList`。
- 支持新增、删除、修改字段、显示/隐藏字段。

产出：

- 字段配置能驱动卡片字段列表。

### Day 5：样式配置

目标：

- 做 `StyleConfigForm`。
- 支持布局、尺寸、强调色配置。

产出：

- 卡片样式能被配置改变。

### Day 6：操作按钮配置

目标：

- 做 `ActionConfigList`。
- 支持新增、删除、修改按钮、显示/隐藏按钮。

产出：

- 卡片按钮来自配置。

### Day 7：JSON 预览与整理

目标：

- 做 `ConfigJsonViewer`。
- 整理组件边界。
- 给配置更新函数命名，减少重复代码。

产出：

- 页面能完整展示配置和预览。
- 每个组件职责清楚。

## 9. 暂时不做什么

第一版明确不做：

- 拖拽布局
- 多组件画布
- 接口请求
- 权限系统
- 组件市场
- 代码生成
- schema 表单自动渲染
- 保存到后端

这些都可以以后做，但第一版碰它们只会拖慢学习。

## 10. 第一版完成标准

满足下面条件就算第一版完成：

- 能打开一个配置页面。
- 能配置 `InfoCard` 的基础信息、字段、样式和按钮。
- 右侧预览实时变化。
- 能看到当前配置 JSON。
- 代码里至少拆出 5 个清晰组件。
- 每天学习后在 `docs/study/react-hooks-daily-log.md` 写一条短记录。

## 11. 推荐文件结构

如果新建独立练习项目，可以用：

```text
src/
├─ App.tsx
├─ components/
│  ├─ ComponentSidebar.tsx
│  ├─ ConfigPanel.tsx
│  ├─ PreviewPanel.tsx
│  └─ InfoCardPreview.tsx
├─ features/
│  └─ lowcode-config/
│     ├─ types.ts
│     ├─ initialConfig.ts
│     ├─ BasicConfigForm.tsx
│     ├─ FieldConfigList.tsx
│     ├─ StyleConfigForm.tsx
│     └─ ActionConfigList.tsx
└─ styles/
   └─ lowcode-config.css
```

如果后续接入真实项目，再按项目现有结构调整。

## 12. 学习重点

这次不是为了做一个多厉害的低代码平台。

这次真正要练的是：

- React 组件拆分
- 状态向下传递
- 事件向上更新
- 表单受控组件
- 数组状态更新
- 配置驱动 UI
- 预览与配置分离

先把这几块吃稳，再往 schema 自动渲染、拖拽、保存、代码生成走。
