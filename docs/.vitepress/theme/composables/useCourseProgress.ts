import { ref, computed } from 'vue';

export type ProgressStatus = 'not-started' | 'in-progress' | 'completed';

export interface CourseProgress {
  [courseId: string]: {
    [dayId: string]: ProgressStatus;
  };
}

const STORAGE_KEY = 'docs-preview-course-progress';

// 全局状态
const progressData = ref<CourseProgress>({});

// 初始化：从 localStorage 加载
function loadProgress(): CourseProgress {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// 保存到 localStorage
function saveProgress(data: CourseProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save course progress:', error);
  }
}

// 初始化数据
if (typeof window !== 'undefined') {
  progressData.value = loadProgress();
}

export function useCourseProgress() {
  // 获取某个课程某一天的状态
  const getStatus = (courseId: string, dayId: string): ProgressStatus => {
    return progressData.value[courseId]?.[dayId] ?? 'not-started';
  };

  // 设置某个课程某一天的状态
  const setStatus = (courseId: string, dayId: string, status: ProgressStatus): void => {
    if (!progressData.value[courseId]) {
      progressData.value[courseId] = {};
    }
    progressData.value[courseId][dayId] = status;
    saveProgress(progressData.value);
  };

  // 切换状态：not-started -> in-progress -> completed -> not-started
  const cycleStatus = (courseId: string, dayId: string): ProgressStatus => {
    const current = getStatus(courseId, dayId);
    let next: ProgressStatus;

    switch (current) {
      case 'not-started':
        next = 'in-progress';
        break;
      case 'in-progress':
        next = 'completed';
        break;
      case 'completed':
        next = 'not-started';
        break;
      default:
        next = 'not-started';
    }

    setStatus(courseId, dayId, next);
    return next;
  };

  // 获取课程的完成统计
  const getCourseStats = (courseId: string, totalDays: number) => {
    const course = progressData.value[courseId] || {};
    const statuses = Object.values(course);

    const completed = statuses.filter(s => s === 'completed').length;
    const inProgress = statuses.filter(s => s === 'in-progress').length;
    const notStarted = totalDays - completed - inProgress;

    return {
      completed,
      inProgress,
      notStarted,
      total: totalDays,
      percentage: totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0
    };
  };

  // 重置某个课程的所有进度
  const resetCourse = (courseId: string): void => {
    if (progressData.value[courseId]) {
      delete progressData.value[courseId];
      saveProgress(progressData.value);
    }
  };

  // 重置所有进度
  const resetAll = (): void => {
    progressData.value = {};
    saveProgress(progressData.value);
  };

  // 导出进度数据
  const exportProgress = (): string => {
    return JSON.stringify(progressData.value, null, 2);
  };

  // 导入进度数据
  const importProgress = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      progressData.value = data;
      saveProgress(progressData.value);
      return true;
    } catch {
      return false;
    }
  };

  return {
    progressData: computed(() => progressData.value),
    getStatus,
    setStatus,
    cycleStatus,
    getCourseStats,
    resetCourse,
    resetAll,
    exportProgress,
    importProgress
  };
}
