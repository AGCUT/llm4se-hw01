// Timeline 组件 - 展示行程时间轴
import { useState, useEffect } from 'react'
import type { Trip } from '@/config/supabase.config'
import { planRoute, geocode, type RouteResult } from '@/services/mapService'
import { saveRoute, loadRoute, hasRoute } from '@/utils/routeStorage'
import './TripDetail.css'

interface TimelineProps {
  trip: Trip
}

const Timeline = ({ trip }: TimelineProps) => {
  const [activeDay, setActiveDay] = useState(1)
  const [loadingRoutes, setLoadingRoutes] = useState<Record<string, boolean>>({})
  const [routeData, setRouteData] = useState<Record<string, RouteResult>>({})

  const dailyPlans = trip.daily_plans || []
  const overview = trip.overview || { highlights: [], tips: [], summary: '' }

  // 生成路径 Key
  const getRouteKey = (tripId: string, day: number, startIndex: number, endIndex: number): string => {
    return `${tripId}_${day}_${startIndex}_${endIndex}`
  }

  // 加载已缓存的路径
  useEffect(() => {
    const cachedRoutes: Record<string, RouteResult> = {}
    
    dailyPlans.forEach((dayPlan: any) => {
      if (dayPlan.activities && dayPlan.activities.length > 1) {
        for (let i = 0; i < dayPlan.activities.length - 1; i++) {
          const routeKey = getRouteKey(trip.id, dayPlan.day, i, i + 1)
          const cached = loadRoute(trip.id, dayPlan.day, i, i + 1)
          if (cached) {
            cachedRoutes[routeKey] = cached
          }
        }
      }
    })
    
    if (Object.keys(cachedRoutes).length > 0) {
      setRouteData(cachedRoutes)
      console.log(`[Timeline] 已加载 ${Object.keys(cachedRoutes).length} 条缓存路径`)
    }
  }, [trip.id, dailyPlans])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transportation': return '🚗'
      case 'accommodation': return '🏨'
      case 'attraction': return '🎯'
      case 'restaurant': return '🍽️'
      default: return '📍'
    }
  }

  const getActivityTypeName = (type: string) => {
    switch (type) {
      case 'transportation': return '交通'
      case 'accommodation': return '住宿'
      case 'attraction': return '景点'
      case 'restaurant': return '餐饮'
      default: return '其他'
    }
  }

  // 查询路径
  const handleQueryRoute = async (
    day: number,
    startIndex: number,
    endIndex: number,
    startActivity: any,
    endActivity: any
  ) => {
    const routeKey = getRouteKey(trip.id, day, startIndex, endIndex)
    
    // 检查是否已有缓存
    if (hasRoute(trip.id, day, startIndex, endIndex)) {
      const cached = loadRoute(trip.id, day, startIndex, endIndex)
      if (cached) {
        setRouteData(prev => ({ ...prev, [routeKey]: cached }))
        console.log(`[Timeline] 使用缓存路径: ${routeKey}`)
        return
      }
    }

    // 检查是否有坐标
    let startCoord: { lng: number; lat: number } | null = null
    let endCoord: { lng: number; lat: number } | null = null

    // 获取起点坐标
    if (startActivity.location?.coordinates) {
      if (typeof startActivity.location.coordinates === 'object') {
        if (startActivity.location.coordinates.lng && startActivity.location.coordinates.lat) {
          startCoord = {
            lng: Number(startActivity.location.coordinates.lng),
            lat: Number(startActivity.location.coordinates.lat)
          }
        } else if (Array.isArray(startActivity.location.coordinates)) {
          startCoord = {
            lng: Number(startActivity.location.coordinates[0]),
            lat: Number(startActivity.location.coordinates[1])
          }
        }
      }
    } else if (startActivity.location?.address) {
      // 如果没有坐标，尝试地理编码
      console.log(`[Timeline] 地理编码起点: ${startActivity.location.address}`)
      startCoord = await geocode(startActivity.location.address)
    }

    // 获取终点坐标
    if (endActivity.location?.coordinates) {
      if (typeof endActivity.location.coordinates === 'object') {
        if (endActivity.location.coordinates.lng && endActivity.location.coordinates.lat) {
          endCoord = {
            lng: Number(endActivity.location.coordinates.lng),
            lat: Number(endActivity.location.coordinates.lat)
          }
        } else if (Array.isArray(endActivity.location.coordinates)) {
          endCoord = {
            lng: Number(endActivity.location.coordinates[0]),
            lat: Number(endActivity.location.coordinates[1])
          }
        }
      }
    } else if (endActivity.location?.address) {
      // 如果没有坐标，尝试地理编码
      console.log(`[Timeline] 地理编码终点: ${endActivity.location.address}`)
      endCoord = await geocode(endActivity.location.address)
    }

    if (!startCoord || !endCoord) {
      alert('无法获取起点或终点的坐标，请检查地点信息')
      return
    }

    // 设置加载状态
    setLoadingRoutes(prev => ({ ...prev, [routeKey]: true }))

    try {
      console.log(`[Timeline] 开始查询路径: ${routeKey}`)
      const route = await planRoute(startCoord, endCoord)
      
      if (route) {
        // 保存到本地存储
        saveRoute(trip.id, day, startIndex, endIndex, route)
        // 更新状态
        setRouteData(prev => ({ ...prev, [routeKey]: route }))
        console.log(`[Timeline] ✅ 路径查询成功: ${routeKey}`)
      } else {
        alert('路径查询失败，请重试')
      }
    } catch (error: any) {
      console.error(`[Timeline] ❌ 路径查询失败: ${routeKey}`, error)
      alert(`路径查询失败: ${error.message || '未知错误'}`)
    } finally {
      setLoadingRoutes(prev => ({ ...prev, [routeKey]: false }))
    }
  }

  // 格式化距离
  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${distance}米`
    } else {
      return `${(distance / 1000).toFixed(1)}公里`
    }
  }

  // 格式化时间
  const formatDuration = (duration: number): string => {
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else {
      return `${minutes}分钟`
    }
  }

  return (
    <div className="timeline-view">
      {/* 行程概览 */}
      {overview.highlights && overview.highlights.length > 0 && (
        <div className="overview-section">
          <h3>✨ 行程亮点</h3>
          <ul className="highlights-list">
            {overview.highlights.map((highlight: string, index: number) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 天数选择 */}
      <div className="day-selector">
        {dailyPlans.map((dayPlan: any) => (
          <button
            key={dayPlan.day}
            className={`day-btn ${activeDay === dayPlan.day ? 'active' : ''}`}
            onClick={() => setActiveDay(dayPlan.day)}
          >
            Day {dayPlan.day}
          </button>
        ))}
      </div>

      {/* 当日行程 */}
      {dailyPlans.map((dayPlan: any) => (
        activeDay === dayPlan.day && (
          <div key={dayPlan.day} className="day-content">
            <div className="day-info">
              <h3>第 {dayPlan.day} 天</h3>
              {dayPlan.date && <span>{dayPlan.date}</span>}
              <span className="day-budget">¥{dayPlan.estimatedCost?.toLocaleString() || 0}</span>
            </div>

            <div className="activities-timeline">
              {dayPlan.activities && dayPlan.activities.map((activity: any, index: number) => (
                <div key={index}>
                  <div className="activity-item">
                    <div className="activity-time">{activity.time}</div>
                    <div className="activity-dot"></div>
                    <div className="activity-card">
                      <div className="activity-header">
                        <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                        <span className="activity-type">{getActivityTypeName(activity.type)}</span>
                        <span className="activity-cost">¥{activity.estimatedCost}</span>
                      </div>
                      <h4>{activity.name}</h4>
                      <p>{activity.description}</p>
                      {activity.location && (
                        <p className="activity-location">📍 {activity.location.address}</p>
                      )}
                      {activity.duration && (
                        <p className="activity-duration">⏱️ {activity.duration}</p>
                      )}
                      {activity.tips && activity.tips.length > 0 && (
                        <div className="activity-tips">
                          <strong>💡 小贴士：</strong>
                          <ul>
                            {activity.tips.map((tip: string, i: number) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 路径查询按钮和结果（在两个相邻地点之间） */}
                  {index < dayPlan.activities.length - 1 && (
                    <div className="route-section">
                      <div className="route-connector"></div>
                      <div className="route-query-card">
                        {(() => {
                          const routeKey = getRouteKey(trip.id, dayPlan.day, index, index + 1)
                          const route = routeData[routeKey]
                          const loading = loadingRoutes[routeKey]
                          const nextActivity = dayPlan.activities[index + 1]
                          
                          return (
                            <>
                              {!route && !loading && (
                                <button
                                  className="route-query-btn"
                                  onClick={() => handleQueryRoute(
                                    dayPlan.day,
                                    index,
                                    index + 1,
                                    activity,
                                    nextActivity
                                  )}
                                >
                                  🗺️ 查询路径
                                </button>
                              )}
                              
                              {loading && (
                                <div className="route-loading">
                                  <span>🔄 正在查询路径...</span>
                                </div>
                              )}
                              
                              {route && (
                                <div className="route-result">
                                  <div className="route-info">
                                    <span className="route-distance">📏 {formatDistance(route.distance)}</span>
                                    <span className="route-duration">⏱️ {formatDuration(route.duration)}</span>
                                    {route.tolls > 0 && (
                                      <span className="route-tolls">💰 过路费 ¥{route.tolls.toFixed(2)}</span>
                                    )}
                                  </div>
                                  <button
                                    className="route-refresh-btn"
                                    onClick={() => handleQueryRoute(
                                      dayPlan.day,
                                      index,
                                      index + 1,
                                      activity,
                                      nextActivity
                                    )}
                                  >
                                    🔄 刷新
                                  </button>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {/* 预算统计 */}
      {trip.budget_breakdown && (
        <div className="budget-stats">
          <h3>💰 预算统计</h3>
          <div className="budget-chart">
            {Object.entries(trip.budget_breakdown).map(([key, value]: [string, any]) => (
              <div key={key} className="budget-bar-item">
                <span className="budget-category">{getCategoryName(key)}</span>
                <div className="budget-bar-bg">
                  <div 
                    className={`budget-bar-fill ${key}`}
                    style={{ width: `${(value / trip.budget) * 100}%` }}
                  ></div>
                </div>
                <span className="budget-amount">¥{value?.toLocaleString() || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const getCategoryName = (key: string) => {
  const names: Record<string, string> = {
    transportation: '交通',
    accommodation: '住宿',
    food: '餐饮',
    attractions: '景点',
    other: '其他'
  }
  return names[key] || key
}

export default Timeline
