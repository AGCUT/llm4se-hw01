// 行程详情页面
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTripById, deleteTrip } from '@/api/trip.api'
import type { Trip } from '@/config/supabase.config'
import Button from '@/components/common/Button/Button'
import Timeline from './Timeline'
import MapView from './MapView'
import ExpenseView from './ExpenseView'
import './TripDetail.css'

const TripDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'timeline' | 'map' | 'expense'>('timeline')

  useEffect(() => {
    if (id) {
      loadTrip(id)
    }
  }, [id])

  const loadTrip = async (tripId: string) => {
    try {
      setLoading(true)
      const data = await getTripById(tripId)
      setTrip(data)
    } catch (error) {
      console.error('加载行程失败:', error)
      alert('加载行程失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !trip) return

    if (confirm(`确定要删除行程"${trip.title}"吗？`)) {
      try {
        await deleteTrip(id)
        alert('行程已删除')
        navigate('/dashboard')
      } catch (error) {
        console.error('删除失败:', error)
        alert('删除失败，请重试')
      }
    }
  }

  if (loading) {
    return (
      <div className="trip-detail-loading">
        <div className="loading-spinner">加载中...</div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="trip-detail-error">
        <h2>行程不存在</h2>
        <Button onClick={() => navigate('/dashboard')}>返回</Button>
      </div>
    )
  }

  return (
    <div className="trip-detail-container">
      {/* 行程头部 */}
      <div className="trip-header">
        <div className="trip-title-section">
          <h1>{trip.title}</h1>
          <div className="trip-meta">
            <span>📍 {trip.destination}</span>
            <span>📅 {trip.start_date} ~ {trip.end_date}</span>
            <span>👥 {trip.travelers} 人</span>
            <span>💰 ¥{trip.budget.toLocaleString()}</span>
          </div>
        </div>
        <div className="trip-actions">
          <Button variant="danger" onClick={handleDelete}>
            删除
          </Button>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveView('timeline')}
        >
          📅 时间轴
        </button>
        <button
          className={`view-tab ${activeView === 'map' ? 'active' : ''}`}
          onClick={() => setActiveView('map')}
        >
          🗺️ 地图
        </button>
        <button
          className={`view-tab ${activeView === 'expense' ? 'active' : ''}`}
          onClick={() => setActiveView('expense')}
        >
          💰 记账
        </button>
      </div>

      {/* 内容区域 */}
      <div className="trip-content">
        {activeView === 'timeline' && <Timeline trip={trip} />}
        {activeView === 'map' && <MapView trip={trip} />}
        {activeView === 'expense' && <ExpenseView trip={trip} />}
      </div>
    </div>
  )
}

export default TripDetail

