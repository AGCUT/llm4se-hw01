// Dashboard页面 - 行程列表
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrips } from '@/api/trip.api'
import type { Trip } from '@/config/supabase.config'
import Button from '@/components/common/Button/Button'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async () => {
    try {
      setLoading(true)
      console.log('开始加载行程...')
      const data = await getTrips()
      console.log('行程加载成功:', data)
      setTrips(data || [])
    } catch (error: any) {
      console.error('加载行程失败:', error)
      const errorMessage = error?.message || '加载失败'
      alert(`❌ 加载行程失败: ${errorMessage}\n\n请检查：\n1. 是否已登录\n2. 网络连接是否正常\n3. 浏览器控制台是否有错误信息`)
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

