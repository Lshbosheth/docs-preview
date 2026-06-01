import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Pronounce from "./components/Pronounce.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("Pronounce", Pronounce);
  }
} satisfies Theme;
