import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Pronounce from "./components/Pronounce.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Pronounce", Pronounce);

    if (typeof window !== "undefined") {
      const decorateSidebarDates = () => {
        document.querySelectorAll<HTMLAnchorElement>(".VPSidebar a[href]").forEach((link) => {
          const match = link.getAttribute("href")?.match(/^\/(?:english|ai-agent)\/(\d{4}-\d{2}-\d{2})\/?$/);
          if (!match) return;

          link.classList.add("sidebar-link--dated");
          link.dataset.sidebarDate = match[1];
        });
      };

      window.requestAnimationFrame(decorateSidebarDates);
      const observer = new MutationObserver(decorateSidebarDates);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
} satisfies Theme;
