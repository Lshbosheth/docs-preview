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

export default defineConfig({
  title: "lshbosheth 文档",
  description: "学习计划、技术英语、项目记录",
  lang: "zh-CN",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "English Daily", link: `/english/${latestEnglishLesson}` },
      { text: "AI Agent Daily", link: latestAiAgentLesson ? `/ai-agent/${latestAiAgentLesson}` : "/ai-agent/" },
      { text: "学习", link: "/study/python-agent-learning-plan" },
      { text: "记忆系统", link: "/memory/zvec-memory-plan" }
    ],
    sidebar: [
      {
        text: "学习",
        items: [
          { text: "Python × AI Agent 15 天计划", link: "/study/python-agent-learning-plan" },
          { text: "Python × DeepSeek Agent 课程设计", link: "/study/python-agent-course-design" },
          {
            text: "Python × DeepSeek Agent 实战课",
            collapsed: false,
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
          { text: "Markdown 文档站方案", link: "/markdown-preview-site-plan" },
          { text: "文档站界面升级方案", link: "/docs-ui-refresh-plan" }
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
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "搜索", buttonAriaLabel: "搜索" },
          modal: {
            noResultsText: "没有找到结果",
            resetButtonTitle: "清除",
            backButtonTitle: "返回",
            footer: { selectText: "选择", navigateText: "切换", closeText: "关闭" }
          }
        }
      }
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
