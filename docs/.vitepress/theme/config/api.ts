// API 配置
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://lshbosheth-nest.vercel.app';

export const API_ENDPOINTS = {
  courseProgress: {
    getStatus: `${API_BASE_URL}/course-progress/status`,
    getCourse: `${API_BASE_URL}/course-progress/course`,
    set: `${API_BASE_URL}/course-progress/set`,
    stats: `${API_BASE_URL}/course-progress/stats`,
    reset: `${API_BASE_URL}/course-progress/reset`,
    export: `${API_BASE_URL}/course-progress/export`,
    import: `${API_BASE_URL}/course-progress/import`,
  },
};
