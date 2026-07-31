import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Pronounce from "./components/Pronounce.vue";
import ImmersiveToggle from "./components/ImmersiveToggle.vue";
import ProgressButton from "./components/ProgressButton.vue";
import CourseProgressBar from "./components/CourseProgressBar.vue";
import Layout from "./Layout.vue";
import "./style.css";
import { useCourseProgress } from "./composables/useCourseProgress";
import { watch } from "vue";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    app.component("Pronounce", Pronounce);
    app.component("ImmersiveToggle", ImmersiveToggle);
    app.component("ProgressButton", ProgressButton);
    app.component("CourseProgressBar", CourseProgressBar);

    if (typeof window !== "undefined") {
      const { getStatus, progressData } = useCourseProgress();

      // 更新侧边栏链接的进度标记
      const updateSidebarProgress = () => {
        requestAnimationFrame(() => {
          // 侧边栏自动滚动到激活项
          const activeItem = document.querySelector(".VPSidebar .VPSidebarItem.is-active");
          if (activeItem) {
            activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
          }

          // 更新所有课程 day 链接的进度状态
          const dayLinks = document.querySelectorAll<HTMLAnchorElement>('.VPSidebar .link[href*="/day-"]');
          dayLinks.forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;

            // 解析 courseId 和 dayId
            // 格式：/study/react-lowcode-course/day-01-setup
            const match = href.match(/\/study\/([^/]+)\/(day-[^/]+)/);
            if (match) {
              const [, courseId, dayId] = match;
              const status = getStatus(courseId, dayId);
              if (status !== "not-started") {
                link.setAttribute("data-progress", status);
              } else {
                link.removeAttribute("data-progress");
              }
            }
          });
        });
      };

      // 路由变化时更新
      router.onAfterRouteChanged = updateSidebarProgress;

      // 监听进度数据变化
      watch(progressData, updateSidebarProgress, { deep: true });

      // 初始化时更新一次
      updateSidebarProgress();
    }
  }
} satisfies Theme;
