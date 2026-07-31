import { ref, computed } from 'vue';
import { API_ENDPOINTS } from '../config/api';

export type ProgressStatus = 'not-started' | 'in-progress' | 'completed';

export interface CourseProgress {
  [courseId: string]: {
    [dayId: string]: ProgressStatus;
  };
}

const STORAGE_KEY = 'docs-preview-course-progress';

// 全局状态
const progressData = ref<CourseProgress>({});
let isInitialized = false;

// 初始化：优先从 API 加载，失败则从 localStorage 加载
async function loadProgress(): Promise<CourseProgress> {
  if (typeof window === 'undefined') return {};

  try {
    // 先尝试从 API 加载
    const response = await fetch(API_ENDPOINTS.courseProgress.export);
    if (response.ok) {
      const data = await response.json();
      // 同步到 localStorage 作为缓存
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.warn('Failed to load progress from API, falling back to localStorage:', error);
  }

  // API 失败，从 localStorage 加载
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// 保存到 API 和 localStorage
async function saveProgress(data: CourseProgress): Promise<void> {
  if (typeof window === 'undefined') return;

  // 先保存到 localStorage（快速响应）
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save course progress to localStorage:', error);
  }

  // 异步同步到 API（不阻塞）
  try {
    await fetch(API_ENDPOINTS.courseProgress.import, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
  } catch (error) {
    console.error('Failed to sync progress to API:', error);
  }
}

// 确保初始化
async function ensureInitialized(): Promise<void> {
  if (!isInitialized && typeof window !== 'undefined') {
    progressData.value = await loadProgress();
    isInitialized = true;
  }
}

export function useCourseProgress() {
  // 确保数据已初始化（改成异步）
  if (!isInitialized) {
    ensureInitialized();
  }

  // 获取某个课程某一天的状态
  const getStatus = (courseId: string, dayId: string): ProgressStatus => {
    return progressData.value[courseId]?.[dayId] ?? 'not-started';
  };

  // 设置某个课程某一天的状态
  const setStatus = async (courseId: string, dayId: string, status: ProgressStatus): Promise<void> => {
    if (!progressData.value[courseId]) {
      progressData.value[courseId] = {};
    }
    progressData.value[courseId][dayId] = status;
    await saveProgress(progressData.value);
  };

  // 切换状态：not-started -> in-progress -> completed -> not-started
  const cycleStatus = async (courseId: string, dayId: string): Promise<ProgressStatus> => {
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

    await setStatus(courseId, dayId, next);
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
  const resetCourse = async (courseId: string): Promise<void> => {
    if (progressData.value[courseId]) {
      delete progressData.value[courseId];
      await saveProgress(progressData.value);
    }
  };

  // 重置所有进度
  const resetAll = async (): Promise<void> => {
    progressData.value = {};
    await saveProgress(progressData.value);
  };

  // 导出进度数据
  const exportProgress = (): string => {
    return JSON.stringify(progressData.value, null, 2);
  };

  // 导入进度数据
  const importProgress = async (jsonData: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonData);
      progressData.value = data;
      await saveProgress(progressData.value);
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
