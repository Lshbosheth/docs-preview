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
      { text: "学习", link: "/study/go-learning-plan" },
      { text: "记忆系统", link: "/memory/zvec-memory-plan" },
      { text: "Personal Context", link: "/personal-context-layer/" },
      { text: "Agent Bridge", link: "/wx-agent-bridge/" }
    ],
    sidebar: [
      {
        text: "学习",
        items: [
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
      {
        text: "Personal Context Layer",
        items: [
          { text: "总览", link: "/personal-context-layer/" },
          { text: "定位修正 V2", link: "/personal-context-layer/positioning-v2-personal-context-layer" },
          { text: "实施路线图", link: "/personal-context-layer/implementation-roadmap" },
          { text: "MVP 范围", link: "/personal-context-layer/mvp-scope" },
          { text: "Agent Handoff 协议", link: "/personal-context-layer/handoff-protocol" },
          { text: "上下文披露策略", link: "/personal-context-layer/context-disclosure-policy" },
          { text: "Handoff 权限边界", link: "/personal-context-layer/handoff-permission-policy" },
          { text: "旧文档迁移说明", link: "/personal-context-layer/legacy-docs-migration" }
        ]
      },
      {
        text: "微信 Agent Bridge",
        items: [
          { text: "项目总览", link: "/wx-agent-bridge/" },
          { text: "代码学习导览", link: "/wx-agent-bridge/code-learning-map" },
          { text: "实施路线图", link: "/wx-agent-bridge/implementation-roadmap" },
          {
            text: "Day 1 启动骨架",
            collapsed: true,
            items: [
              { text: "计划", link: "/wx-agent-bridge/day-1-bootstrap" },
              { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-1-implementation-prompt" }
            ]
          },
          {
            text: "Day 2 微信入口",
            collapsed: false,
            items: [
              {
                text: "2.0 基础入口",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-2-weixin-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-2-implementation-prompt" }
                ]
              },
              {
                text: "2.5 iLink 接入",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-2-5-ilink-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-2-5-ilink-implementation-prompt" }
                ]
              },
              {
                text: "2.6 长轮询",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-2-6-ilink-long-poll-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-2-6-ilink-long-poll-implementation-prompt" }
                ]
              },
              {
                text: "2.7 扫码登录",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-2-7-ilink-qr-login-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-2-7-ilink-qr-login-implementation-prompt" }
                ]
              },
              {
                text: "2.8 发送修正",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-2-8-ilink-send-fix-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-2-8-ilink-send-fix-implementation-prompt" }
                ]
              },
              {
                text: "2.9 SDK 接入修正",
                collapsed: false,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-2-9-ilink-sdk-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-2-9-ilink-sdk-implementation-prompt" },
                  { text: "二维码绑定测试清单", link: "/wx-agent-bridge/day-2-9-sdk-qr-binding-test" }
                ]
              }
            ]
          },
          {
            text: "Day 3-6 核心能力",
            collapsed: true,
            items: [
              {
                text: "Day 3 模型和聊天层",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-3-model-provider-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-3-model-provider-implementation-prompt" }
                ]
              },
              {
                text: "Day 4 Planner 和 TaskSchema",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-4-planner-task-schema-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-4-planner-task-schema-implementation-prompt" }
                ]
              },
              {
                text: "Day 5 Validator 和 Guard",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-5-validator-guard-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-5-validator-guard-implementation-prompt" }
                ]
              },
              {
                text: "Day 6 Executor 和 Response",
                collapsed: true,
                items: [
                  { text: "计划", link: "/wx-agent-bridge/day-6-executor-response-plan" },
                  { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-6-executor-response-implementation-prompt" }
                ]
              }
            ]
          },
          {
            text: "Day 7 管理后台",
            collapsed: false,
            items: [
              { text: "计划", link: "/wx-agent-bridge/day-7-admin-console-plan" },
              { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-7-admin-console-implementation-prompt" }
            ]
          },
          {
            text: "Day 8 记忆系统",
            collapsed: false,
            items: [
              { text: "聊天记忆系统设计", link: "/wx-agent-bridge/day-8-chat-memory-system-design" },
              { text: "Agent 工具权限设计", link: "/wx-agent-bridge/day-8-agent-tool-permission-design" },
              { text: "8.1 会话上下文计划", link: "/wx-agent-bridge/day-8-1-session-context-plan" },
              { text: "8.1 Qwen 提示词", link: "/wx-agent-bridge/qwen-day-8-1-session-context-implementation-prompt" }
            ]
          },
          {
            text: "Day 9 配置中心",
            collapsed: false,
            items: [
              { text: "计划", link: "/wx-agent-bridge/day-9-admin-config-center-plan" },
              { text: "Qwen 提示词", link: "/wx-agent-bridge/qwen-day-9-admin-config-center-implementation-prompt" },
              { text: "9.1 收尾 Qwen", link: "/wx-agent-bridge/qwen-day-9-1-admin-config-center-finish-prompt" }
            ]
          },
          {
            text: "Day 10-11 Agent Runtime（Deprecated）",
            collapsed: true,
            items: [
              { text: "Day 10 工具权限 MVP（Deprecated）", link: "/wx-agent-bridge/qwen-day-10-agent-runtime-tool-permission-mvp-prompt" },
              { text: "Day 11 记忆接入权限（Deprecated）", link: "/wx-agent-bridge/qwen-day-11-memory-permission-integration-prompt" }
            ]
          },
          {
            text: "参考资料",
            collapsed: true,
            items: [
              { text: "模块设计", link: "/wx-agent-bridge/module-design" },
              { text: "开发任务 Backlog", link: "/wx-agent-bridge/task-backlog" },
              { text: "验收用例", link: "/wx-agent-bridge/acceptance-tests" }
            ]
          }
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
