// Dashboard页面 - 行程列表
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getTrips } from '@/api/trip.api'
import type { Trip } from '@/config/supabase.config'
import Button from '@/components/common/Button/Button'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuthStore()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false
    
    const load = async () => {
      // 等待认证状态初始化完成
      if (authLoading) {
        console.log('等待认证状态初始化...')
        // 最多等待 3 秒
        let waitCount = 0
        while (authLoading && waitCount < 30 && !isCancelled) {
          await new Promise(resolve => setTimeout(resolve, 100))
          waitCount++
          // 重新获取 authLoading 状态
          const currentAuthLoading = useAuthStore.getState().loading
          if (!currentAuthLoading) {
            break
          }
        }
      }
      
      // 重新获取用户状态（可能已经更新）
      const currentUser = useAuthStore.getState().user
      
      // 如果用户未登录，显示提示
      if (!currentUser && !useAuthStore.getState().loading) {
        console.warn('用户未登录，无法加载行程')
        alert('❌ 用户未登录\n\n请先登录后再访问此页面。')
        navigate('/login')
        return
      }
      
      if (!isCancelled && currentUser) {
        await loadTrips()
      } else if (!isCancelled) {
        // 如果还是没有用户，尝试加载（可能会从 session 获取）
        await loadTrips()
      }
    }
    
    load()

    return () => {
      isCancelled = true
    }
  }, []) // 只在组件挂载时执行一次

  const loadTrips = async () => {
    try {
      setLoading(true)
      console.log('开始加载行程...')
      
      // 添加重试逻辑
      let retries = 3
      let data = null
      let lastError = null
      
      while (retries > 0) {
        try {
          console.log(`尝试加载行程（第 ${4 - retries} 次）...`)
          data = await getTrips()
          console.log('行程加载成功，数据条数:', data?.length || 0)
          break
        } catch (error: any) {
          lastError = error
          console.warn(`加载行程失败，剩余重试次数: ${retries - 1}`, error)
          retries--
          
          // 如果是用户未登录错误，不重试
          if (error?.message?.includes('用户未登录')) {
            break
          }
          
          // 如果是超时错误，等待更长时间后重试
          if (error?.message?.includes('超时')) {
            if (retries > 0) {
              console.log('等待 2 秒后重试...')
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
          } else {
            // 其他错误，等待 1 秒后重试
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }
      }
      
      if (data) {
        setTrips(data || [])
      } else {
        throw lastError || new Error('加载行程失败')
      }
    } catch (error: any) {
      console.error('加载行程失败:', error)
      const errorMessage = error?.message || '加载失败'
      
      // 如果是用户未登录错误，显示更友好的提示
      if (errorMessage.includes('用户未登录')) {
        alert('❌ 用户未登录\n\n请先登录后再访问此页面。')
        // 可以在这里跳转到登录页面
        // navigate('/login')
      } else {
        alert(`❌ 加载行程失败: ${errorMessage}\n\n请检查：\n1. 是否已登录\n2. 网络连接是否正常\n3. 浏览器控制台是否有错误信息`)
      }
      
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      DRAFT: '草稿',
      CONFIRMED: '已确认',
      ONGOING: '进行中',
      COMPLETED: '已完成',
      CANCELLED: '已取消'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      DRAFT: '#a0aec0',
      CONFIRMED: '#4299e1',
      ONGOING: '#48bb78',
      COMPLETED: '#667eea',
      CANCELLED: '#f56565'
    }
    return colorMap[status] || '#a0aec0'
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-text">加载中...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 我的行程</h1>
        <Button onClick={() => navigate('/trip/create')}>
          ✈️ 创建新行程
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h3>还没有行程</h3>
          <p>点击上方按钮创建您的第一个 AI 行程规划</p>
          <Button onClick={() => navigate('/trip/create')}>
            开始创建
          </Button>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="trip-card"
              onClick={() => navigate(`/trip/${trip.id}`)}
            >
              <div className="trip-card-header">
                <h3>{trip.title}</h3>
                <span 
                  className="trip-status"
                  style={{ background: getStatusColor(trip.status) }}
                >
                  {getStatusText(trip.status)}
                </span>
              </div>
              <div className="trip-card-body">
                <p className="trip-destination">📍 {trip.destination}</p>
                <p className="trip-dates">
                  📅 {trip.start_date} ~ {trip.end_date}
                </p>
                <div className="trip-card-footer">
                  <span>👥 {trip.travelers} 人</span>
                  <span>⏱️ {trip.days} 天</span>
                  <span>💰 ¥{trip.budget.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard

