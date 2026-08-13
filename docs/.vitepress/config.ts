import { defineConfig } from "vitepress";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type SidebarItem = {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
};

const configDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(configDir, "..");
const englishDir = path.join(docsDir, "english");
const aiAgentDir = path.join(docsDir, "ai-agent");

function getEnglishLessonDates(): string[] {
  if (!fs.existsSync(englishDir)) {
    return [];
  }

  return fs
    .readdirSync(englishDir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .map((name) => name.replace(/\.md$/, ""))
    .sort((a, b) => b.localeCompare(a));
}

function stripMarkdown(value: string): string {
  return value
    .replace(/<Pronounce\s+text=["']([^"']+)["'][^>]*\/?\s*>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getEnglishLessonTitle(date: string): string {
  const filePath = path.join(englishDir, `${date}.md`);
  if (!fs.existsSync(filePath)) {
    return "技术英语练习";
  }

  const content = fs.readFileSync(filePath, "utf8");
  const frontmatterTitle = content.match(/^---\r?\n[\s\S]*?\ntitle:\s*["']?(.+?)["']?\r?\n[\s\S]*?\n---/);
  if (frontmatterTitle?.[1]) {
    return frontmatterTitle[1].trim();
  }

  const goalSection = content.match(/##\s+今日目标\s*\r?\n+([\s\S]*?)(?=\r?\n##\s|\r?\n来源类型：|$)/);
  const goalParagraph = goalSection?.[1]
    ?.split(/\r?\n\s*\r?\n/)
    .map(stripMarkdown)
    .find(Boolean);

  if (goalParagraph) {
    return goalParagraph.length > 34 ? `${goalParagraph.slice(0, 34)}…` : goalParagraph;
  }

  return "技术英语练习";
}

function getEnglishDailyItems(): SidebarItem[] {
  const lessons = getEnglishLessonDates();

  const recentItems = lessons.slice(0, 3).map((date) => ({
    text: getEnglishLessonTitle(date),
    link: `/english/${date}`
  }));

  const olderGroups = new Map<string, SidebarItem[]>();

  for (const date of lessons.slice(3)) {
    const month = date.slice(0, 7);
    const items = olderGroups.get(month) ?? [];
    items.push({
      text: getEnglishLessonTitle(date),
      link: `/english/${date}`
    });
    olderGroups.set(month, items);
  }

  const olderItems = Array.from(olderGroups.entries()).map(([month, items]) => ({
    text: month,
    collapsed: true,
    items
  }));

  return [...recentItems, ...olderItems];
}

const latestEnglishLesson = getEnglishLessonDates()[0] ?? "2026-07-05";

function getAiAgentLessonDates(): string[] {
  if (!fs.existsSync(aiAgentDir)) {
    return [];
  }

  return fs
    .readdirSync(aiAgentDir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .map((name) => name.replace(/\.md$/, ""))
    .sort((a, b) => b.localeCompare(a));
}

function getMarkdownTitle(filePath: string, fallback: string): string {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const frontmatterTitle = content.match(/^---\r?\n[\s\S]*?\ntitle:\s*["']?(.+?)["']?\r?\n[\s\S]*?\n---/);
  if (frontmatterTitle?.[1]) {
    return frontmatterTitle[1].trim();
  }

  const h1Title = content.match(/^#\s+(.+)$/m);
  return h1Title?.[1]?.trim() ?? fallback;
}

function getAiAgentDailyItems(): SidebarItem[] {
  const lessons = getAiAgentLessonDates();

  return [
    { text: "总览", link: "/ai-agent/" },
    { text: "年度学习检查表", link: "/ai-agent/checklist" },
    ...lessons.map((date) => {
      const title = getMarkdownTitle(path.join(aiAgentDir, `${date}.md`), date);

      return {
        text: title,
        link: `/ai-agent/${date}`
      };
    })
  ];
}

const latestAiAgentLesson = getAiAgentLessonDates()[0] ?? "";

function countMarkdownFiles(dir: string): number {
  const target = path.join(docsDir, dir);
  if (!fs.existsSync(target)) {
    return 0;
  }

  let total = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      total += countMarkdownFiles(path.join(dir, entry.name));
    } else if (entry.name.endsWith(".md")) {
      total += 1;
    }
  }

  return total;
}

/* 构建机基本都跑在 UTC，直接 new Date() 取日期会在北京时间凌晨那几个小时差一天。
   这里手动偏 8 小时，按北京时间算"今天"。 */
function getBeijingToday(): string {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(beijingTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLessonDate(date: string): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${Number(match[2])} 月 ${Number(match[3])} 日` : date;
}

function formatShortDate(date: string): string {
  const match = date.match(/^\d{4}-(\d{2}-\d{2})$/);
  return match ? match[1] : date;
}

function getLatestCourseDayLink(dir: string, fallback: string): string {
  const target = path.join(docsDir, "study", dir);
  if (!fs.existsSync(target)) {
    return fallback;
  }

  const days = fs
    .readdirSync(target)
    .filter((name) => /^day-\d+.*\.md$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/^day-(\d+)/)?.[1] ?? "0");
      const nb = parseInt(b.match(/^day-(\d+)/)?.[1] ?? "0");
      return nb - na;
    });

  if (days.length === 0) return fallback;

  const latest = days[0].replace(/\.md$/, "");
  return `/study/${dir}/${latest}`;
}

function countCourseDays(dir: string): number {
  const target = path.join(docsDir, "study", dir);
  if (!fs.existsSync(target)) {
    return 0;
  }

  return fs.readdirSync(target).filter((name) => /^day-\d+.*\.md$/.test(name)).length;
}

function getCoursedayFiles(dir: string): string[] {
  const target = path.join(docsDir, "study", dir);
  if (!fs.existsSync(target)) {
    return [];
  }

  return fs
    .readdirSync(target)
    .filter((name) => /^day-\d+.*\.md$/.test(name))
    .map((name) => name.replace(/\.md$/, ""))
    .sort((a, b) => {
      const na = parseInt(a.match(/^day-(\d+)/)?.[1] ?? "0");
      const nb = parseInt(b.match(/^day-(\d+)/)?.[1] ?? "0");
      return na - nb;
    });
}

const courseMeta = [
  {
    dir: "react-lowcode-course",
    text: "低代码配置页实战课",
    note: "从写死一张卡片开始，一路做到 useMemo 和 React.memo。"
  },
  {
    dir: "react-lowcode-essentials",
    text: "核心补全课",
    note: "useEffect、useRef、useReducer、Context，绕过去的都捡回来。"
  },
  {
    dir: "react-lowcode-advanced-custom-components",
    text: "自定义组件动态加载",
    note: "上传、编译、注册、沙箱隔离，把低代码做到能收外部组件。"
  },
  {
    dir: "python-agent-course",
    text: "Python × DeepSeek Agent",
    note: "从终端输入练到 LangGraph 条件路由与会话状态。"
  }
];

const homeData = {
  latestEnglish: `/english/${latestEnglishLesson}`,
  latestAiAgent: latestAiAgentLesson ? `/ai-agent/${latestAiAgentLesson}` : "/ai-agent/",
  today: latestAiAgentLesson
    ? {
        link: `/ai-agent/${latestAiAgentLesson}`,
        date: formatLessonDate(latestAiAgentLesson),
        /* 断更的时候最新一篇不是今天的，标签就别硬说"今天这篇" */
        label: latestAiAgentLesson === getBeijingToday() ? "今天这篇" : "最近一篇",
        title: getMarkdownTitle(path.join(aiAgentDir, `${latestAiAgentLesson}.md`), latestAiAgentLesson)
      }
    : null,
  aiAgentRecent: getAiAgentLessonDates()
    .slice(1, 5)
    .map((date) => ({
      date: formatShortDate(date),
      link: `/ai-agent/${date}`,
      title: getMarkdownTitle(path.join(aiAgentDir, `${date}.md`), date)
    })),
  englishRecent: getEnglishLessonDates()
    .slice(0, 4)
    .map((date) => ({
      date: formatShortDate(date),
      link: `/english/${date}`,
      title: getEnglishLessonTitle(date)
    })),
  courses: courseMeta.map((course, index) => ({
    index: String(index + 1).padStart(2, "0"),
    dir: course.dir,
    text: course.text,
    link: getLatestCourseDayLink(course.dir, `/study/${course.dir}/`),
    note: course.note,
    days: countCourseDays(course.dir),
    dayFiles: getCoursedayFiles(course.dir)
  })),
  stats: [
    { label: "每日英语", value: `${getEnglishLessonDates().length} 篇` },
    { label: "AI Agent 每日一课", value: `${getAiAgentLessonDates().length} 篇` },
    { label: "学习计划与课程", value: `${countMarkdownFiles("study")} 篇` },
    {
      label: "最近更新",
      value: latestAiAgentLesson ? formatLessonDate(latestAiAgentLesson) : "—"
    }
  ]
};

export default defineConfig({
  title: "过境笔记",
  description: "学习计划、技术英语、AI Agent 每日一课与系统记录",
  lang: "zh-CN",
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#0b63ce" }]
  ],
  themeConfig: {
    home: homeData,
    nav: [
      { text: "每日一课", link: homeData.latestAiAgent, activeMatch: "^/ai-agent/" },
      { text: "每日英语", link: homeData.latestEnglish, activeMatch: "^/english/" },
      {
        text: "学习",
        activeMatch: "^/study/",
        items: [
          {
            text: "React 低代码",
            items: [
              { text: "系列总规划", link: "/study/react-lowcode-series-plan" },
              { text: "配置页实战课", link: "/study/react-lowcode-course/" },
              { text: "核心补全课", link: "/study/react-lowcode-essentials/" },
              { text: "自定义组件动态加载", link: "/study/react-lowcode-advanced-custom-components/" }
            ]
          },
          {
            text: "Python 与 Agent",
            items: [
              { text: "15 天计划", link: "/study/python-agent-learning-plan" },
              { text: "DeepSeek Agent 实战课", link: "/study/python-agent-course/" }
            ]
          },
          {
            text: "其他",
            items: [
              { text: "河南师大马理论考研 8 月计划", link: "/study/henan-normal-university-marxism-2026-08-plan" },
              { text: "8 月 3 日考研试运行", link: "/study/henan-normal-university-marxism-2026-08-03" },
              { text: "React 学习路线", link: "/study/react-learning-roadmap" },
              { text: "React 查漏补缺清单", link: "/study/react-skill-gaps-plan" },
              { text: "Go 学习启动计划", link: "/study/go-learning-plan" }
            ]
          }
        ]
      },
      {
        text: "系统",
        activeMatch: "^/(memory|personal-context-layer|wx-agent-bridge)/",
        items: [
          {
            text: "主线",
            items: [
              { text: "Personal Context Layer", link: "/personal-context-layer/" },
              { text: "自研微信链路交付路线图", link: "/wx-agent-bridge/delivery-roadmap/" },
              { text: "现有链路兼容基线", link: "/wx-agent-bridge/cc-connect-compatibility-baseline" },
              { text: "切换与回滚手册", link: "/wx-agent-bridge/delivery-roadmap/cutover-playbook" }
            ]
          },
          {
            text: "记忆系统",
            items: [
              { text: "RAG 名词地图", link: "/memory/rag-learning-map" },
              { text: "zvec 记忆检索改造", link: "/memory/zvec-memory-plan" },
              { text: "text-embedding-v4 接入", link: "/memory/dashscope-embedding-v4-guide" }
            ]
          },
          {
            text: "归档",
            items: [
              { text: "微信 Agent Bridge", link: "/wx-agent-bridge/" },
              { text: "Markdown 文档站方案", link: "/markdown-preview-site-plan" }
            ]
          }
        ]
      }
    ],
    sidebar: [
      {
        text: "学习",
        items: [
          { text: "河南师大马理论考研 8 月计划", link: "/study/henan-normal-university-marxism-2026-08-plan" },
          { text: "8 月 3 日考研试运行", link: "/study/henan-normal-university-marxism-2026-08-03" },
          { text: "Python × AI Agent 15 天计划", link: "/study/python-agent-learning-plan" },
          { text: "Python × DeepSeek Agent 课程设计", link: "/study/python-agent-course-design" },
          {
            text: "Python × DeepSeek Agent 实战课",
            collapsed: true,
            items: [
              { text: "课程首页", link: "/study/python-agent-course/" },
              { text: "Day 1 终端输入与学习记录", link: "/study/python-agent-course/day-01-cli-input" },
              { text: "Day 2 把用户输入变成消息字典", link: "/study/python-agent-course/day-02-message-dict" },
              { text: "Day 3 分类一条用户消息", link: "/study/python-agent-course/day-03-message-classifier" },
              { text: "Day 4 把分类逻辑封装成函数", link: "/study/python-agent-course/day-04-functions" },
              { text: "Day 5 把单文件变成小项目", link: "/study/python-agent-course/day-05-project-setup" },
              { text: "Day 6 把对话保存成 JSON", link: "/study/python-agent-course/day-06-json-storage" },
              { text: "Day 7 第一次调用 DeepSeek", link: "/study/python-agent-course/day-07-deepseek-api" },
              { text: "Day 8 用类封装模型客户端", link: "/study/python-agent-course/day-08-client-class" },
              { text: "Day 9 类型标注与结构化任务", link: "/study/python-agent-course/day-09-types-pydantic" },
              { text: "Day 10 让 API 调用可恢复", link: "/study/python-agent-course/day-10-errors-logging" },
              { text: "Day 11 用 LangChain 表达模型与消息", link: "/study/python-agent-course/day-11-langchain-chat" },
              { text: "Day 12 Prompt 与结构化输出", link: "/study/python-agent-course/day-12-structured-output" },
              { text: "Day 13 让模型选择工具", link: "/study/python-agent-course/day-13-tool-calling" },
              { text: "Day 14 用 LangGraph 串起流程", link: "/study/python-agent-course/day-14-langgraph-basics" },
              { text: "Day 15 条件路由与会话状态", link: "/study/python-agent-course/day-15-state-checkpoint" }
            ]
          },
          { text: "React 低代码组件配置页设计", link: "/study/low-code-component-config-page-design" },
          { text: "React 学习路线", link: "/study/react-learning-roadmap" },
          { text: "React 查漏补缺清单", link: "/study/react-skill-gaps-plan" },
          { text: "React 低代码进阶系列总规划", link: "/study/react-lowcode-series-plan" },
          {
            text: "React 低代码配置页实战课",
            collapsed: true,
            items: [
              { text: "课程首页", link: "/study/react-lowcode-course/" },
              { text: "Day 1 项目搭建 + 写死卡片", link: "/study/react-lowcode-course/day-01-setup" },
              { text: "Day 2 组件拆分 + props 传递", link: "/study/react-lowcode-course/day-02-components-props" },
              { text: "Day 3 useState 入门：用 config 驱动预览", link: "/study/react-lowcode-course/day-03-config-state" },
              { text: "Day 4 受控表单：修改标题实时更新", link: "/study/react-lowcode-course/day-04-controlled-form" },
              { text: "Day 5 数组操作：字段列表增删改", link: "/study/react-lowcode-course/day-05-field-list" },
              { text: "Day 6 条件渲染 + 显隐控制", link: "/study/react-lowcode-course/day-06-conditional-render" },
              { text: "Day 7 样式配置：动态 className + CSS 变量", link: "/study/react-lowcode-course/day-07-style-config" },
              { text: "Day 8 操作按钮配置", link: "/study/react-lowcode-course/day-08-action-buttons" },
              { text: "Day 9 JSON 预览：useMemo + 格式化输出", link: "/study/react-lowcode-course/day-09-json-viewer" },
              { text: "Day 10 自定义 Hook：提取复用逻辑", link: "/study/react-lowcode-course/day-10-custom-hook" },
              { text: "Day 11 useCallback + React.memo 性能优化", link: "/study/react-lowcode-course/day-11-memo-callback" },
              { text: "Day 12 代码整理 + 最终验收", link: "/study/react-lowcode-course/day-12-final-review" }
            ]
          },
          { text: "React 低代码核心补全课 · 设计", link: "/study/react-lowcode-essentials-design" },
          {
            text: "React 低代码核心补全课",
            collapsed: true,
            items: [
              { text: "系列首页", link: "/study/react-lowcode-essentials/" },
              { text: "Day 1 useEffect 入门：配置自动保存", link: "/study/react-lowcode-essentials/day-01-useeffect-autosave" },
              { text: "Day 2 依赖、清理与防抖保存", link: "/study/react-lowcode-essentials/day-02-useeffect-cleanup-debounce" },
              { text: "Day 3 useRef：DOM 引用与可变值", link: "/study/react-lowcode-essentials/day-03-useref" },
              { text: "Day 4 useReducer：收敛配置变更", link: "/study/react-lowcode-essentials/day-04-usereducer" },
              { text: "Day 5 useContext：消灭 props 透传", link: "/study/react-lowcode-essentials/day-05-usecontext" },
              { text: "Day 6 React Router：多页面应用", link: "/study/react-lowcode-essentials/day-06-router" },
              { text: "Day 7 异步数据三态与竞态", link: "/study/react-lowcode-essentials/day-07-async-data" },
              { text: "Day 8 错误边界与课程收尾", link: "/study/react-lowcode-essentials/day-08-error-boundary-review" }
            ]
          },
          { text: "React 低代码进阶 · 自定义组件设计", link: "/study/react-lowcode-advanced-custom-components-design" },
          {
            text: "React 低代码进阶 · 自定义组件动态加载",
            collapsed: true,
            items: [
              { text: "系列首页", link: "/study/react-lowcode-advanced-custom-components/" },
              { text: "Day 1 组件上传与元数据解析", link: "/study/react-lowcode-advanced-custom-components/day-01-upload-and-meta" },
              { text: "Day 2 动态编译 React 组件", link: "/study/react-lowcode-advanced-custom-components/day-02-dynamic-compile" },
              { text: "Day 3 组件注册与实例化", link: "/study/react-lowcode-advanced-custom-components/day-03-register-and-render" },
              { text: "Day 4 属性面板动态生成", link: "/study/react-lowcode-advanced-custom-components/day-04-dynamic-props-form" },
              { text: "Day 5 多文件组件支持", link: "/study/react-lowcode-advanced-custom-components/day-05-multi-file-support" },
              { text: "Day 6 依赖管理与外部库", link: "/study/react-lowcode-advanced-custom-components/day-06-external-dependencies" },
              { text: "Day 7 沙箱与安全隔离", link: "/study/react-lowcode-advanced-custom-components/day-07-sandbox-isolation" },
              { text: "Day 8 版本管理与热更新", link: "/study/react-lowcode-advanced-custom-components/day-08-version-and-hmr" }
            ]
          },
          { text: "Go 学习启动计划", link: "/study/go-learning-plan" }
        ]
      },
      {
        text: "English Daily",
        items: getEnglishDailyItems()
      },
      {
        text: "AI Agent Daily",
        items: getAiAgentDailyItems()
      },
      {
        text: "文档站",
        items: [
          { text: "Ranran GSAP 迁移计划", link: "/ranran-gsap-migration" },
          { text: "Markdown 文档站方案", link: "/markdown-preview-site-plan" }
        ]
      },
      {
        text: "自研微信链路",
        collapsed: false,
        items: [
          { text: "交付路线图总览", link: "/wx-agent-bridge/delivery-roadmap/" },
          { text: "Phase 0 · 工程地基", link: "/wx-agent-bridge/delivery-roadmap/phase-0-foundation" },
          { text: "Phase 1 · 微信与可靠会话", link: "/wx-agent-bridge/delivery-roadmap/phase-1-weixin-conversation" },
          { text: "Phase 2 · Memory MVP", link: "/wx-agent-bridge/delivery-roadmap/phase-2-memory-mvp" },
          { text: "Phase 3 · 人话回复层", link: "/wx-agent-bridge/delivery-roadmap/phase-3-humanized-response" },
          { text: "Phase 4 · Handoff 人工闭环", link: "/wx-agent-bridge/delivery-roadmap/phase-4-handoff-draft" },
          { text: "Phase 5 · 上下文披露", link: "/wx-agent-bridge/delivery-roadmap/phase-5-context-disclosure" },
          { text: "Phase 6 · Admin Web", link: "/wx-agent-bridge/delivery-roadmap/phase-6-admin-web" },
          { text: "Phase 7 · 外部 Agent 适配", link: "/wx-agent-bridge/delivery-roadmap/phase-7-external-agent-adapter" },
          { text: "现有链路兼容基线", link: "/wx-agent-bridge/cc-connect-compatibility-baseline" },
          { text: "风险台账", link: "/wx-agent-bridge/delivery-roadmap/risk-register" },
          { text: "切换与回滚手册", link: "/wx-agent-bridge/delivery-roadmap/cutover-playbook" },
          { text: "工作项模板", link: "/wx-agent-bridge/delivery-roadmap/work-item-template" }
        ]
      },
      {
        text: "记忆系统",
        items: [
          { text: "RAG 常用技术路线和名词地图", link: "/memory/rag-learning-map" },
          { text: "zvec 记忆检索改造方案", link: "/memory/zvec-memory-plan" },
          { text: "阿里 text-embedding-v4 接入指南", link: "/memory/dashscope-embedding-v4-guide" }
        ]
      },
      
    ],
    outline: {
      level: [2, 3],
      label: "页面导航"
    },
    docFooter: {
      prev: "上一篇",
      next: "下一篇"
    },
    lastUpdated: {
      text: "更新于"
    },
    returnToTopLabel: "返回顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "浅色模式",
    darkModeSwitchTitle: "深色模式"
  }
});
