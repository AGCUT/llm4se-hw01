// App根组件
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useAuthStore } from '@/store/authStore'
import ErrorBoundary from '@/components/common/ErrorBoundary/ErrorBoundary'
import '@/assets/styles/global.css'
// 导入 Supabase 验证函数并确保挂载到 window 对象
import { verifySupabaseSetup } from '@/config/supabase.config'
import { verifySupabaseConfig } from '@/api/trip.api'

function App() {
  const { refreshAuth, setLoading } = useAuthStore()

  // 确保验证函数挂载到 window 对象（作为备用）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).verifySupabase = verifySupabaseSetup
      (window as any).verifySupabaseConfig = verifySupabaseConfig
      console.log('✅ 验证函数已挂载到 window 对象')
      console.log('💡 在浏览器控制台运行: verifySupabase() 或 verifySupabaseConfig()')
    }
  }, [])

  // 应用启动时刷新认证状态
  useEffect(() => {
    let isCancelled = false

    const initAuth = async () => {
      try {
        // 直接调用 refreshAuth，它内部已经有超时处理
        await refreshAuth()
      } catch (error: any) {
        if (!isCancelled) {
          console.error('初始化认证失败:', error)
          // 确保 loading 为 false
          setLoading(false)
        }
      }
    }

    // 初始化认证（不阻塞页面渲染）
    initAuth()

    return () => {
      isCancelled = true
    }
  }, [refreshAuth, setLoading])

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}

export default App

