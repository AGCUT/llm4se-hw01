// App根组件
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useAuthStore } from '@/store/authStore'
import ErrorBoundary from '@/components/common/ErrorBoundary/ErrorBoundary'
import '@/assets/styles/global.css'

function App() {
  const { refreshAuth, setLoading } = useAuthStore()

  // 应用启动时刷新认证状态
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let isCompleted = false
    let isCancelled = false

    const initAuth = async () => {
      try {
        // 使用 Promise.race 来设置超时
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('认证初始化超时'))
          }, 3000) // 减少超时时间为 3 秒
        })

        // 刷新认证状态，但设置超时
        await Promise.race([
          refreshAuth(),
          timeoutPromise
        ])

        if (!isCancelled) {
          isCompleted = true
          // 初始化完成后，清除超时
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
        }
      } catch (error: any) {
        if (!isCancelled) {
          isCompleted = true
          
          // 如果是超时错误，只在控制台输出，不显示 alert
          if (error?.message === '认证初始化超时') {
            console.warn('⚠️ 认证初始化超时（超过 3 秒）')
            console.warn('这可能是因为：')
            console.warn('1. 网络连接较慢')
            console.warn('2. Supabase 服务响应较慢')
            console.warn('3. 首次访问需要初始化连接')
            console.warn('')
            console.warn('不影响正常使用，您可以继续操作。')
          } else {
            console.error('初始化认证失败:', error)
          }
          
          // 即使失败，也要设置 loading 为 false，避免一直加载
          setLoading(false)
          
          // 清除超时
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
        }
      }
    }

    // 初始化认证
    initAuth()

    return () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [refreshAuth, setLoading])

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}

export default App

