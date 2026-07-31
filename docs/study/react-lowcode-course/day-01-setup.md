---
title: Day 1 - 项目搭建 + 写死卡片
---

# Day 1：项目搭建 + 写死卡片

## 今天完成什么

1. 用 Vite 创建 React + TypeScript 项目
2. 搭出三栏布局
3. 写死一个 InfoCard 卡片组件

## 概念解释

### 什么是 JSX

JSX 是 JavaScript 的语法扩展，让你可以在 JS 里写类似 HTML 的代码：

```tsx
const title = "客户资料";
return <h2>{title}</h2>;
```

编译后会变成 `React.createElement()` 调用，但你不用关心，直接写 JSX 就行。

### 什么是组件

组件就是一个返回 JSX 的函数：

```tsx
function InfoCard() {
  return <div className="card">卡片内容</div>;
}
```

组件名必须大写开头，这样 React 才能区分组件和普通 HTML 标签。

### Flexbox 布局

三栏布局用 Flexbox 最简单：

```css
.container {
  display: flex;
}
.left { flex: 0 0 200px; }
.middle { flex: 1; }
.right { flex: 1; }
```

## 动手实现

### 第 1 步：创建项目

打开终端，执行：

```bash
npm create vite@latest react-lowcode-infocard -- --template react-ts
cd react-lowcode-infocard
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`，能看到 Vite 默认页面就算成功。

### 第 2 步：清理默认代码

删除这些文件：

```text
src/App.css
src/index.css
```

修改 `src/main.tsx`：

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 第 3 步：搭三栏布局

修改 `src/App.tsx`：

```tsx
function App() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      {/* 左侧：组件列表 */}
      <div style={{
        flex: '0 0 200px',
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRight: '1px solid #ddd'
      }}>
        <h3>组件列表</h3>
        <div style={{
          padding: '10px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          InfoCard
        </div>
      </div>

      {/* 中间：配置面板 */}
      <div style={{
        flex: '1',
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2>配置面板</h2>
        <p style={{ color: '#999' }}>后续章节会在这里加表单</p>
      </div>

      {/* 右侧：预览区 */}
      <div style={{
        flex: '1',
        padding: '20px',
        backgroundColor: '#fafafa',
        overflowY: 'auto'
      }}>
        <h2>预览</h2>
        <p style={{ color: '#999' }}>卡片会显示在这里</p>
      </div>
    </div>
  );
}

export default App;
```

保存后浏览器自动刷新，能看到三栏布局。

### 第 4 步：写死一个 InfoCard

新建 `src/components/InfoCardPreview.tsx`：

```tsx
function InfoCardPreview() {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '400px'
    }}>
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>客户资料</h3>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            郑州某某科技有限公司
          </p>
        </div>
        <span style={{
          padding: '4px 12px',
          backgroundColor: '#52c41a',
          color: '#fff',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          跟进中
        </span>
      </div>

      {/* 字段列表 */}
      <div style={{
        borderTop: '1px solid #f0f0f0',
        paddingTop: '12px',
        marginBottom: '12px'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#999', fontSize: '14px' }}>联系人：</span>
          <span style={{ fontSize: '14px' }}>张三</span>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#999', fontSize: '14px' }}>手机号：</span>
          <span style={{ fontSize: '14px' }}>138****8888</span>
        </div>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#999', fontSize: '14px' }}>来源：</span>
          <span style={{ fontSize: '14px' }}>官网表单</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={{
          padding: '6px 16px',
          backgroundColor: '#1890ff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          查看详情
        </button>
        <button style={{
          padding: '6px 16px',
          backgroundColor: '#fff',
          color: '#333',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          新建跟进
        </button>
      </div>
    </div>
  );
}

export default InfoCardPreview;
```

### 第 5 步：把卡片放进右侧预览区

修改 `src/App.tsx`，导入并使用 `InfoCardPreview`：

```tsx
import InfoCardPreview from './components/InfoCardPreview';

function App() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      {/* 左侧：组件列表 */}
      <div style={{
        flex: '0 0 200px',
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRight: '1px solid #ddd'
      }}>
        <h3>组件列表</h3>
        <div style={{
          padding: '10px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          InfoCard
        </div>
      </div>

      {/* 中间：配置面板 */}
      <div style={{
        flex: '1',
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2>配置面板</h2>
        <p style={{ color: '#999' }}>后续章节会在这里加表单</p>
      </div>

      {/* 右侧：预览区 */}
      <div style={{
        flex: '1',
        padding: '20px',
        backgroundColor: '#fafafa',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginTop: 0 }}>预览</h2>
        <InfoCardPreview />
      </div>
    </div>
  );
}

export default App;
```

## 运行效果

保存后浏览器自动刷新，能看到：

- 左侧灰色面板，一个「InfoCard」选项
- 中间白色配置面板，占位文字
- 右侧浅灰色预览区，一个完整的客户资料卡片

## 常见错误

### 1. 组件名小写开头

```tsx
// ❌ 错误
function infoCard() { ... }

// ✅ 正确
function InfoCard() { ... }
```

组件名必须大写开头，否则 React 会把它当成普通 HTML 标签。

### 2. 忘记 export

```tsx
// ❌ 错误
function InfoCardPreview() { ... }

// ✅ 正确
function InfoCardPreview() { ... }
export default InfoCardPreview;
```

其他文件才能 `import` 进来。

### 3. 端口被占用

如果 `5173` 端口被占，Vite 会自动换成 `5174`、`5175`...

终端里会显示实际端口，看清楚再访问。

## 动手改一改

1. 把卡片标题改成「项目信息」，副标题改成你喜欢的公司名
2. 把状态标签改成红色（`#f5222d`），文字改成「已关闭」
3. 给左侧组件列表加第二个选项「StatCard」（写死就行，不用实现）

## 验收清单

- [ ] 项目能正常启动，访问 `http://localhost:5173`
- [ ] 能看到三栏布局：左侧灰、中间白、右侧浅灰
- [ ] 右侧能看到一个完整的客户资料卡片
- [ ] 卡片有标题、副标题、状态标签、字段列表、两个按钮
- [ ] 修改 `InfoCardPreview.tsx` 里的文字，刷新后能看到变化

## 今日记录

**今天跑通：**
- Vite 创建 React 项目
- 三栏 Flexbox 布局
- 写死的 InfoCard 组件

**现在能解释：**
- JSX 是什么
- 函数组件怎么写
- 组件怎么导入导出

**明天先做：**
- 把配置项定义成 TypeScript 类型
- 用 `useState` 管理配置状态
- 让卡片从状态读数据，而不是写死

## 留给明天的接口

当前 `InfoCardPreview` 里所有数据都是硬编码：

```tsx
<h3>客户资料</h3>
<p>郑州某某科技有限公司</p>
<span>跟进中</span>
```

明天要把这些数据提取成一个配置对象，让卡片从配置读取。

<ProgressButton courseId="react-lowcode-course" dayId="day-01-setup" />
