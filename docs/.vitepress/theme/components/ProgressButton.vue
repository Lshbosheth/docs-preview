<template>
  <div class="progress-control">
    <div class="progress-control-inner">
      <div class="progress-status">
        <span class="progress-dot" :data-status="currentStatus"></span>
        <span class="progress-label">{{ statusLabel }}</span>
      </div>
      <button
        v-if="currentStatus !== 'completed'"
        class="progress-button"
        @click="handleComplete"
      >
        标记完成
      </button>
      <button
        v-else
        class="progress-button progress-button--secondary"
        @click="handleReset"
      >
        重新开始
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCourseProgress } from '../composables/useCourseProgress';

const props = defineProps<{
  courseId: string;
  dayId: string;
}>();

const { getStatus, setStatus } = useCourseProgress();

const currentStatus = computed(() => getStatus(props.courseId, props.dayId));

const statusLabel = computed(() => {
  switch (currentStatus.value) {
    case 'not-started':
    case 'in-progress':
      return '进行中';
    case 'completed':
      return '已完成 ✓';
    default:
      return '进行中';
  }
});

// 进入页面自动标记为"进行中"
onMounted(() => {
  if (currentStatus.value === 'not-started') {
    setStatus(props.courseId, props.dayId, 'in-progress');
  }
});

const handleComplete = () => {
  setStatus(props.courseId, props.dayId, 'completed');
};

const handleReset = () => {
  setStatus(props.courseId, props.dayId, 'in-progress');
};
</script>

<style scoped>
.progress-control {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
}

.progress-control-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.2rem 1.5rem;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.progress-status {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.progress-dot {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  transition: background 200ms ease, box-shadow 200ms ease;
}

.progress-dot[data-status="not-started"],
.progress-dot[data-status="in-progress"] {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.progress-dot[data-status="completed"] {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.progress-label {
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.progress-button {
  padding: 0.5rem 1.2rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 999px;
  background: var(--vp-c-brand-1);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 180ms ease;
  white-space: nowrap;
}

.progress-button:hover {
  background: var(--vp-c-brand-2);
  border-color: var(--vp-c-brand-2);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(11, 99, 206, 0.25);
}

.progress-button:active {
  transform: translateY(0);
}

.progress-button--secondary {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-border);
  color: var(--vp-c-text-1);
}

.progress-button--secondary:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
  box-shadow: 0 4px 12px rgba(29, 29, 31, 0.08);
}

@media (max-width: 640px) {
  .progress-control-inner {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .progress-status {
    justify-content: center;
  }

  .progress-button {
    width: 100%;
    text-align: center;
  }
}
</style>
