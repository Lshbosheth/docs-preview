<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vitepress";

const route = useRoute();

const pageDate = computed(() => {
  return route.path.match(/^\/(?:english|ai-agent)\/(\d{4}-\d{2}-\d{2})(?:\.html)?\/?$/)?.[1] ?? "";
});
</script>

<template>
  <div v-if="pageDate" class="page-date">
    <time :datetime="pageDate">{{ pageDate }}</time>
  </div>
</template>
