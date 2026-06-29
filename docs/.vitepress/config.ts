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

function getEnglishDailyItems(): SidebarItem[] {
  const lessons = getEnglishLessonDates();

  const recentItems = lessons.slice(0, 3).map((date) => ({
    text: date,
    link: `/english/${date}`
  }));

  const olderGroups = new Map<string, SidebarItem[]>();

  for (const date of lessons.slice(3)) {
    const month = date.slice(0, 7);
    const items = olderGroups.get(month) ?? [];
    items.push({
      text: date,
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

const latestEnglishLesson = getEnglishLessonDates()[0] ?? "2026-06-24";

export default defineConfig({
  title: "lshbosheth 文档",
  description: "学习计划、技术英语、项目记录",
  lang: "zh-CN",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "English Daily", link: `/english/${latestEnglishLesson}` },
      { text: "学习", link: "/study/go-learning-plan" },
      { text: "记忆系统", link: "/memory/zvec-memory-plan" },
      { text: "Agent Bridge", link: "/wx-agent-bridge/" }
    ],
    sidebar: [
      {
        text: "学习",
        items: [
          { text: "Go 学习启动计划", link: "/study/go-learning-plan" }
        ]
      },
      {
        text: "English Daily",
        items: getEnglishDailyItems()
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
      {
        text: "微信 Agent Bridge",
        items: [
          { text: "项目总览", link: "/wx-agent-bridge/" },
          { text: "实施路线图", link: "/wx-agent-bridge/implementation-roadmap" },
          { text: "Day 1 启动任务清单", link: "/wx-agent-bridge/day-1-bootstrap" },
          { text: "Qwen Day 1 实施提示词", link: "/wx-agent-bridge/qwen-day-1-implementation-prompt" },
          { text: "Day 2 微信入口计划", link: "/wx-agent-bridge/day-2-weixin-plan" },
          { text: "Qwen Day 2 微信入口实施提示词", link: "/wx-agent-bridge/qwen-day-2-implementation-prompt" },
          { text: "Day 2.5 iLink 微信接入计划", link: "/wx-agent-bridge/day-2-5-ilink-plan" },
          { text: "Qwen Day 2.5 iLink 微信接入实施提示词", link: "/wx-agent-bridge/qwen-day-2-5-ilink-implementation-prompt" },
          { text: "Day 2.6 iLink 长轮询改造计划", link: "/wx-agent-bridge/day-2-6-ilink-long-poll-plan" },
          { text: "Qwen Day 2.6 iLink 长轮询改造实施提示词", link: "/wx-agent-bridge/qwen-day-2-6-ilink-long-poll-implementation-prompt" },
          { text: "Day 2.7 iLink 扫码登录计划", link: "/wx-agent-bridge/day-2-7-ilink-qr-login-plan" },
          { text: "Qwen Day 2.7 iLink 扫码登录实施提示词", link: "/wx-agent-bridge/qwen-day-2-7-ilink-qr-login-implementation-prompt" },
          { text: "Day 2.8 iLink 发送接口修正计划", link: "/wx-agent-bridge/day-2-8-ilink-send-fix-plan" },
          { text: "Qwen Day 2.8 iLink 发送接口修正实施提示词", link: "/wx-agent-bridge/qwen-day-2-8-ilink-send-fix-implementation-prompt" },
          { text: "Day 3 模型 Provider 和 Chat Layer 计划", link: "/wx-agent-bridge/day-3-model-provider-plan" },
          { text: "Qwen Day 3 模型 Provider 和 Chat Layer 实施提示词", link: "/wx-agent-bridge/qwen-day-3-model-provider-implementation-prompt" },
          { text: "Day 4 Planner 和 TaskSchema 计划", link: "/wx-agent-bridge/day-4-planner-task-schema-plan" },
          { text: "Qwen Day 4 Planner 和 TaskSchema 实施提示词", link: "/wx-agent-bridge/qwen-day-4-planner-task-schema-implementation-prompt" },
          { text: "Day 5 SchemaValidator 和 Guard 计划", link: "/wx-agent-bridge/day-5-validator-guard-plan" },
          { text: "Qwen Day 5 SchemaValidator 和 Guard 实施提示词", link: "/wx-agent-bridge/qwen-day-5-validator-guard-implementation-prompt" },
          { text: "Day 6 Executor 和 ResponseBuilder 计划", link: "/wx-agent-bridge/day-6-executor-response-plan" },
          { text: "Qwen Day 6 Executor 和 ResponseBuilder 实施提示词", link: "/wx-agent-bridge/qwen-day-6-executor-response-implementation-prompt" },
          { text: "模块设计", link: "/wx-agent-bridge/module-design" },
          { text: "开发任务 Backlog", link: "/wx-agent-bridge/task-backlog" },
          { text: "验收用例", link: "/wx-agent-bridge/acceptance-tests" }
        ]
      }
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
