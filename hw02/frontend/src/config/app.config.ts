// 应用配置
// TODO: 配置应用参数
export const APP_CONFIG = {
  name: 'AI旅行规划师',
  version: '1.0.0',
  apiBaseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  wsURL: import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
};

