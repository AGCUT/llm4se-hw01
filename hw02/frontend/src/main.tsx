// 应用入口文件
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/styles/global.css';
// 导入 Supabase 验证函数并挂载到 window 对象
import { verifySupabaseSetup, testSupabaseConnection } from '@/config/supabase.config';
import { verifySupabaseConfig } from '@/api/trip.api';

// 将验证函数挂载到 window 对象，方便在浏览器控制台调用
if (typeof window !== 'undefined') {
  (window as any).verifySupabase = verifySupabaseSetup;
  (window as any).verifySupabaseConfig = verifySupabaseConfig;
  (window as any).testSupabaseConnection = testSupabaseConnection;
  console.log('💡 提示: 在浏览器控制台运行以下命令可以验证 Supabase 配置:');
  console.log('  - verifySupabase() - 验证 Supabase 基础配置');
  console.log('  - verifySupabaseConfig() - 验证 Supabase 详细配置（包括连接测试）');
  console.log('  - testSupabaseConnection() - 手动测试网络连接（绕过 Supabase 客户端）');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

