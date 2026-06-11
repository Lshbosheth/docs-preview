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

function getEnglishDailyItems(): SidebarItem[] {
  if (!fs.existsSync(englishDir)) {
    return [];
  }

  const lessons = fs
    .readdirSync(englishDir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .map((name) => name.replace(/\.md$/, ""))
    .sort((a, b) => b.localeCompare(a));

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

export default defineConfig({
  title: "lshbosheth 文档",
  description: "Codex 生成的 Markdown 文档预览",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "每日英语", link: "/english/2026-06-10" }
    ],
    sidebar: [
      {
        text: "学习",
        items: [
          { text: "Go 学习启动计划", link: "/study/go-learning-plan" }
        ]
      },
      {
        text: "每日英语",
        items: getEnglishDailyItems()
      },
      {
        text: "文档站",
        items: [
          { text: "Ranran GSAP 迁移计划", link: "/ranran-gsap-migration" },
          { text: "Markdown 文档站方案", link: "/markdown-preview-site-plan" }
        ]
      }
    ]
  }
});
