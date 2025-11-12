// 全局类型声明
declare global {
  interface Window {
    verifySupabase?: () => Promise<any>;
    verifySupabaseConfig?: () => Promise<any>;
  }
}

export {};

