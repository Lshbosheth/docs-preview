<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";

// 沉浸阅读模式：隐藏左侧栏与顶部导航，仅保留内容与一个浮动开关。
// 快捷键：按 I 进入/退出，按 Esc 退出（在输入框中或带修饰键时不会误触）。
const isImmersive = ref(false);
const STORAGE_KEY = "docs-preview:immersive-mode";

function apply() {
  const root = document.documentElement;
  root.classList.toggle("immersive-mode", isImmersive.value);
}

function toggle() {
  isImmersive.value = !isImmersive.value;
}

function exit() {
  isImmersive.value = false;
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  const editable =
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target?.isContentEditable === true;
  if (editable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === "Escape") {
    if (isImmersive.value) exit();
    return;
  }
  if (e.key === "i" || e.key === "I") {
    e.preventDefault();
    toggle();
  }
}

onMounted(() => {
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") isImmersive.value = true;
  } catch {
    /* localStorage 不可用（如隐私模式）时忽略 */
  }
  apply();
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});

watch(isImmersive, (val) => {
  apply();
  try {
    localStorage.setItem(STORAGE_KEY, val ? "1" : "0");
  } catch {
    /* 忽略写入失败 */
  }
});
</script>

<template>
  <button
    class="immersive-toggle"
    :class="{ 'immersive-toggle--active': isImmersive }"
    type="button"
    :title="isImmersive ? '退出沉浸阅读（Esc）' : '沉浸阅读（快捷键 I）'"
    :aria-label="isImmersive ? '退出沉浸阅读' : '进入沉浸阅读'"
    :aria-pressed="isImmersive"
    @click="toggle"
  >
    <span class="immersive-toggle__icon" aria-hidden="true">
      <svg
        v-if="!isImmersive"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
        <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M9 3v4a2 2 0 0 1-2 2H3" />
        <path d="M21 9h-4a2 2 0 0 1-2-2V3" />
        <path d="M3 15h4a2 2 0 0 1 2 2v4" />
        <path d="M15 21v-4a2 2 0 0 1 2-2h4" />
      </svg>
    </span>
    <span class="immersive-toggle__label">{{ isImmersive ? "退出" : "沉浸" }}</span>
  </button>
</template>
