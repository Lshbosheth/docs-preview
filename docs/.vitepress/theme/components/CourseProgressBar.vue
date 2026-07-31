<template>
  <div class="course-progress-bar" v-if="stats.total > 0">
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ width: `${stats.percentage}%` }"
      ></div>
    </div>
    <div class="progress-text">
      {{ stats.completed }} / {{ stats.total }} 完成
      <span v-if="stats.inProgress > 0" class="progress-in-progress">
        · {{ stats.inProgress }} 进行中
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCourseProgress } from '../composables/useCourseProgress';

const props = defineProps<{
  courseId: string;
  totalDays: number;
}>();

const { getCourseStats } = useCourseProgress();

const stats = computed(() => getCourseStats(props.courseId, props.totalDays));
</script>

<style scoped>
.course-progress-bar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.8rem;
}

.progress-track {
  height: 0.4rem;
  border-radius: 999px;
  background: var(--vp-c-bg-mute);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  transition: width 320ms ease;
}

.progress-text {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.progress-in-progress {
  color: #f59e0b;
}
</style>
