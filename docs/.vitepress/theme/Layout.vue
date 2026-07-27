<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import PageDate from "./components/PageDate.vue";
import ImmersiveToggle from "./components/ImmersiveToggle.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #doc-before>
      <PageDate />
    </template>
  </Layout>
  <ImmersiveToggle />
</template>
