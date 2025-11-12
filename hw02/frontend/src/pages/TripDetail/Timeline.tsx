// Timeline 组件 - 展示行程时间轴
import { useState, useEffect } from 'react'
import type { Trip } from '@/config/supabase.config'
import { 
  planDrivingRoute, 
  planWalkingRoute, 
  planTransitRoute,
  geocode, 
  type RouteResult,
  type RouteType,
  type DrivingRouteResult,
  type WalkingRouteResult,
  type TransitRouteResult
} from '@/services/mapService'
import { saveRoute, loadRoute, hasRoute, loadAllRoutes } from '@/utils/routeStorage'
import './TripDetail.css'

interface TimelineProps {
  trip: Trip
}

const Timeline = ({ trip }: TimelineProps) => {
  const [activeDay, setActiveDay] = useState(1)
  const [loadingRoutes, setLoadingRoutes] = useState<Record<string, boolean>>({})
  const [routeData, setRouteData] = useState<Record<string, RouteResult>>({})
  const [selectedRouteTypes, setSelectedRouteTypes] = useState<Record<string, RouteType>>({}) // 每个路径段选择的路线类型
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({}) // 展开的路线详情

  const dailyPlans = trip.daily_plans || []
  const overview = trip.overview || { highlights: [], tips: [], summary: '' }

  // 生成路径 Key（包含路线类型）
  const getRouteKey = (
    tripId: string, 
    day: number, 
    startIndex: number, 
    endIndex: number, 
    routeType: RouteType = 'driving'
  ): string => {
    return `${tripId}_${day}_${startIndex}_${endIndex}_${routeType}`
  }
  
  // 生成路径段 Key（不包含路线类型）
  const getRouteSegmentKey = (
    tripId: string, 
    day: number, 
    startIndex: number, 
    endIndex: number
  ): string => {
    return `${tripId}_${day}_${startIndex}_${endIndex}`
  }

  // 加载已缓存的路径（所有类型）
  useEffect(() => {
    const cachedRoutes: Record<string, RouteResult> = {}
    const defaultRouteTypes: Record<string, RouteType> = {}
    
    dailyPlans.forEach((dayPlan: any) => {
      if (dayPlan.activities && dayPlan.activities.length > 1) {
        for (let i = 0; i < dayPlan.activities.length - 1; i++) {
          const segmentKey = getRouteSegmentKey(trip.id, dayPlan.day, i, i + 1)
          
          // 尝试加载所有类型的路径，优先使用驾车路线
          const allRoutes = loadAllRoutes(trip.id, dayPlan.day, i, i + 1)
          
          // 优先显示驾车路线，如果没有则显示其他类型
          if (allRoutes.driving) {
            const routeKey = getRouteKey(trip.id, dayPlan.day, i, i + 1, 'driving')
            cachedRoutes[routeKey] = allRoutes.driving
            defaultRouteTypes[segmentKey] = 'driving'
          } else if (allRoutes.walking) {
            const routeKey = getRouteKey(trip.id, dayPlan.day, i, i + 1, 'walking')
            cachedRoutes[routeKey] = allRoutes.walking
            defaultRouteTypes[segmentKey] = 'walking'
          } else if (allRoutes.transit) {
            const routeKey = getRouteKey(trip.id, dayPlan.day, i, i + 1, 'transit')
            cachedRoutes[routeKey] = allRoutes.transit
            defaultRouteTypes[segmentKey] = 'transit'
          }
        }
      }
    })
    
    if (Object.keys(cachedRoutes).length > 0) {
      setRouteData(cachedRoutes)
      setSelectedRouteTypes(defaultRouteTypes)
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

  // 查询路径（带重试机制和限流处理）
  const handleQueryRoute = async (
    day: number,
    startIndex: number,
    endIndex: number,
    startActivity: any,
    endActivity: any,
    routeType: RouteType = 'driving' // 默认驾车
  ) => {
    const segmentKey = getRouteSegmentKey(trip.id, day, startIndex, endIndex)
    const routeKey = getRouteKey(trip.id, day, startIndex, endIndex, routeType)
    
    // 检查是否已有缓存
    if (routeData[routeKey]) {
      console.log(`[Timeline] 使用状态中的路径: ${routeKey} (类型: ${routeType})`)
      setSelectedRouteTypes(prev => ({ ...prev, [segmentKey]: routeType }))
      return
    }
    
    if (hasRoute(trip.id, day, startIndex, endIndex, routeType)) {
      const cached = loadRoute(trip.id, day, startIndex, endIndex, routeType)
      if (cached) {
        setRouteData(prev => ({ ...prev, [routeKey]: cached }))
        setSelectedRouteTypes(prev => ({ ...prev, [segmentKey]: routeType }))
        console.log(`[Timeline] 使用缓存路径: ${routeKey} (类型: ${routeType})`)
        return
      }
    }

    // 设置加载状态
    setLoadingRoutes(prev => ({ ...prev, [routeKey]: true }))

    try {
      // 检查是否有坐标
      let startCoord: { lng: number; lat: number } | null = null
      let endCoord: { lng: number; lat: number } | null = null

      // 获取起点坐标（带重试机制）
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
        // 如果没有坐标，尝试地理编码（带重试机制）
        console.log(`[Timeline] 地理编码起点: ${startActivity.location.address}`)
        try {
          startCoord = await geocodeWithRetry(startActivity.location.address, '起点')
        } catch (error: any) {
          console.error(`[Timeline] ❌ 地理编码起点失败:`, error)
          // 检查是否是限流错误
          const isRateLimitError = error?.message?.includes('限流') || 
                                  error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                  error?.message?.includes('EXCEEDED')
          
          if (isRateLimitError) {
            alert('⚠️ API 限流（起点）\n\n请求过于频繁，系统已自动重试但仍失败。\n\n建议：\n1. 等待 30-60 秒后再次点击"查询路径"\n2. 检查 API Key 的 QPS 限制\n3. 考虑升级 API Key 以获取更高配额')
          } else {
            alert(`无法获取起点的坐标: ${error.message || '未知错误'}\n\n请检查地点信息是否正确`)
          }
          return
        }
      }

      // 如果起点编码失败，显示错误并返回
      if (!startCoord) {
        alert('无法获取起点的坐标，请检查地点信息或稍后重试（可能遇到 API 限流）')
        return
      }

      // 等待 2 秒，避免限流（如果起点需要编码）
      if (!startActivity.location?.coordinates && startActivity.location?.address) {
        console.log(`[Timeline] 等待 2 秒后编码终点（避免 API 限流）...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // 获取终点坐标（带重试机制）
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
        // 如果没有坐标，尝试地理编码（带重试机制）
        console.log(`[Timeline] 地理编码终点: ${endActivity.location.address}`)
        try {
          endCoord = await geocodeWithRetry(endActivity.location.address, '终点')
        } catch (error: any) {
          console.error(`[Timeline] ❌ 地理编码终点失败:`, error)
          // 检查是否是限流错误
          const isRateLimitError = error?.message?.includes('限流') || 
                                  error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                  error?.message?.includes('EXCEEDED')
          
          if (isRateLimitError) {
            alert('⚠️ API 限流（终点）\n\n请求过于频繁，系统已自动重试但仍失败。\n\n建议：\n1. 等待 30-60 秒后再次点击"查询路径"\n2. 检查 API Key 的 QPS 限制\n3. 考虑升级 API Key 以获取更高配额')
          } else {
            alert(`无法获取终点的坐标: ${error.message || '未知错误'}\n\n请检查地点信息是否正确`)
          }
          return
        }
      }

      // 如果终点编码失败，显示错误并返回
      if (!endCoord) {
        alert('无法获取终点的坐标，请检查地点信息或稍后重试（可能遇到 API 限流）')
        return
      }

      // 查询路径（根据路线类型）
      console.log(`[Timeline] 开始查询路径: ${routeKey} (类型: ${routeType})`)
      let route: RouteResult | null = null
      
      try {
        if (routeType === 'driving') {
          route = await planDrivingRouteWithRetry(startCoord, endCoord)
        } else if (routeType === 'walking') {
          route = await planWalkingRouteWithRetry(startCoord, endCoord)
        } else if (routeType === 'transit') {
          // 公共交通需要城市信息，尝试从目的地获取
          const city = trip.destination || undefined
          route = await planTransitRouteWithRetry(startCoord, endCoord, city)
        }
        
        if (route) {
          // 保存到本地存储
          saveRoute(trip.id, day, startIndex, endIndex, route, routeType)
          // 更新状态
          setRouteData(prev => ({ ...prev, [routeKey]: route! }))
          setSelectedRouteTypes(prev => ({ ...prev, [segmentKey]: routeType }))
          console.log(`[Timeline] ✅ 路径查询成功: ${routeKey} (类型: ${routeType})`)
        } else {
          alert(`路径查询失败，请稍后重试（可能遇到 API 限流）`)
        }
      } catch (routeError: any) {
        console.error(`[Timeline] ❌ 路径规划失败: ${routeKey}`, routeError)
        // 检查是否是限流错误
        const isRateLimitError = routeError?.message?.includes('限流') || 
                                routeError?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                routeError?.message?.includes('EXCEEDED')
        
        if (isRateLimitError) {
          alert(`⚠️ API 限流（${routeType === 'driving' ? '驾车' : routeType === 'walking' ? '步行' : '公共交通'}）\n\n请求过于频繁，系统已自动重试但仍失败。\n\n建议：\n1. 等待 30-60 秒后再次点击"查询路径"\n2. 检查 API Key 的 QPS 限制\n3. 考虑升级 API Key 以获取更高配额`)
        } else {
          throw routeError // 重新抛出，让外层 catch 处理
        }
      }
    } catch (error: any) {
      console.error(`[Timeline] ❌ 路径查询失败: ${routeKey}`, error)
      
      // 检查是否是限流错误
      const isRateLimitError = error?.message?.includes('限流') || 
                              error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                              error?.message?.includes('EXCEEDED')
      
      if (isRateLimitError) {
        alert('⚠️ API 限流\n\n请求过于频繁，请稍后再试。\n\n提示：\n1. 等待 30 秒后重试\n2. 检查 API Key 的 QPS 限制\n3. 考虑升级 API Key')
      } else {
        alert(`路径查询失败: ${error.message || '未知错误'}`)
      }
    } finally {
      setLoadingRoutes(prev => ({ ...prev, [routeKey]: false }))
    }
  }

  // 地理编码（带重试机制）
  const geocodeWithRetry = async (
    address: string,
    label: string,
    maxRetries: number = 3
  ): Promise<{ lng: number; lat: number } | null> => {
    let retryCount = 0
    let lastError: any = null

    while (retryCount < maxRetries) {
      try {
        console.log(`[Timeline] 地理编码 ${label} (${retryCount + 1}/${maxRetries}): ${address}`)
        const coord = await geocode(address)
        
        if (coord) {
          return coord
        }
        
        // 如果返回 null，可能是地址无效，不重试
        console.warn(`[Timeline] ⚠️ 地理编码 ${label} 失败: ${address} (返回 null)`)
        return null
      } catch (error: any) {
        lastError = error
        
        // 检查是否是限流错误
        const isRateLimitError = error?.message?.includes('限流') || 
                                error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                error?.message?.includes('EXCEEDED')
        
        if (isRateLimitError) {
          retryCount++
          if (retryCount < maxRetries) {
            // 限流错误，等待更长时间后重试（指数退避）
            const waitTime = Math.min(5000 * Math.pow(2, retryCount - 1), 30000) // 5秒、10秒、20秒、最多30秒
            console.log(`[Timeline] ⚠️ 地理编码 ${label} 遇到限流，等待 ${waitTime}ms 后重试 (${retryCount}/${maxRetries})...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          } else {
            console.error(`[Timeline] ❌ 地理编码 ${label} 失败，已达到最大重试次数: ${address}`)
            throw error
          }
        } else {
          // 其他错误，不重试
          console.error(`[Timeline] ❌ 地理编码 ${label} 失败: ${address}`, error)
          throw error
        }
      }
    }

    // 如果所有重试都失败，抛出最后一个错误
    if (lastError) {
      throw lastError
    }
    
    return null
  }

  // 驾车路线规划（带重试机制）
  const planDrivingRouteWithRetry = async (
    start: { lng: number; lat: number },
    end: { lng: number; lat: number },
    maxRetries: number = 3
  ): Promise<DrivingRouteResult | null> => {
    let retryCount = 0
    let lastError: any = null

    while (retryCount < maxRetries) {
      try {
        console.log(`[Timeline] 驾车路线规划 (${retryCount + 1}/${maxRetries})...`)
        const route = await planDrivingRoute(start, end)
        
        if (route) {
          return route
        }
        
        console.warn(`[Timeline] ⚠️ 驾车路线规划失败 (返回 null)`)
        return null
      } catch (error: any) {
        lastError = error
        
        const isRateLimitError = error?.message?.includes('限流') || 
                                error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                error?.message?.includes('EXCEEDED')
        
        if (isRateLimitError) {
          retryCount++
          if (retryCount < maxRetries) {
            const waitTime = Math.min(5000 * Math.pow(2, retryCount - 1), 30000)
            console.log(`[Timeline] ⚠️ 驾车路线规划遇到限流，等待 ${waitTime}ms 后重试 (${retryCount}/${maxRetries})...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          } else {
            throw error
          }
        } else {
          throw error
        }
      }
    }

    if (lastError) {
      throw lastError
    }
    
    return null
  }

  // 步行路线规划（带重试机制）
  const planWalkingRouteWithRetry = async (
    start: { lng: number; lat: number },
    end: { lng: number; lat: number },
    maxRetries: number = 3
  ): Promise<WalkingRouteResult | null> => {
    let retryCount = 0
    let lastError: any = null

    while (retryCount < maxRetries) {
      try {
        console.log(`[Timeline] 步行路线规划 (${retryCount + 1}/${maxRetries})...`)
        const route = await planWalkingRoute(start, end)
        
        if (route) {
          return route
        }
        
        console.warn(`[Timeline] ⚠️ 步行路线规划失败 (返回 null)`)
        return null
      } catch (error: any) {
        lastError = error
        
        const isRateLimitError = error?.message?.includes('限流') || 
                                error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                error?.message?.includes('EXCEEDED')
        
        if (isRateLimitError) {
          retryCount++
          if (retryCount < maxRetries) {
            const waitTime = Math.min(5000 * Math.pow(2, retryCount - 1), 30000)
            console.log(`[Timeline] ⚠️ 步行路线规划遇到限流，等待 ${waitTime}ms 后重试 (${retryCount}/${maxRetries})...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          } else {
            throw error
          }
        } else {
          throw error
        }
      }
    }

    if (lastError) {
      throw lastError
    }
    
    return null
  }

  // 公共交通路线规划（带重试机制）
  const planTransitRouteWithRetry = async (
    start: { lng: number; lat: number },
    end: { lng: number; lat: number },
    city?: string,
    maxRetries: number = 3
  ): Promise<TransitRouteResult | null> => {
    let retryCount = 0
    let lastError: any = null

    while (retryCount < maxRetries) {
      try {
        console.log(`[Timeline] 公共交通路线规划 (${retryCount + 1}/${maxRetries})...`)
        const route = await planTransitRoute(start, end, city)
        
        if (route) {
          return route
        }
        
        console.warn(`[Timeline] ⚠️ 公共交通路线规划失败 (返回 null)`)
        return null
      } catch (error: any) {
        lastError = error
        
        const isRateLimitError = error?.message?.includes('限流') || 
                                error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                error?.message?.includes('EXCEEDED')
        
        if (isRateLimitError) {
          retryCount++
          if (retryCount < maxRetries) {
            const waitTime = Math.min(5000 * Math.pow(2, retryCount - 1), 30000)
            console.log(`[Timeline] ⚠️ 公共交通路线规划遇到限流，等待 ${waitTime}ms 后重试 (${retryCount}/${maxRetries})...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          } else {
            throw error
          }
        } else {
          throw error
        }
      }
    }

    if (lastError) {
      throw lastError
    }
    
    return null
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
                          const segmentKey = getRouteSegmentKey(trip.id, dayPlan.day, index, index + 1)
                          const selectedType = selectedRouteTypes[segmentKey] || 'driving'
                          const routeKey = getRouteKey(trip.id, dayPlan.day, index, index + 1, selectedType)
                          const route = routeData[routeKey]
                          const loading = loadingRoutes[routeKey]
                          const nextActivity = dayPlan.activities[index + 1]
                          const isExpanded = expandedRoutes[routeKey] || false
                          
                          return (
                            <>
                              {/* 出行方式选择 */}
                              {!route && !loading && (
                                <div className="route-type-selector">
                                  <button
                                    className="route-type-btn"
                                    onClick={() => handleQueryRoute(
                                      dayPlan.day,
                                      index,
                                      index + 1,
                                      activity,
                                      nextActivity,
                                      'driving'
                                    )}
                                  >
                                    🚗 驾车
                                  </button>
                                  <button
                                    className="route-type-btn"
                                    onClick={() => handleQueryRoute(
                                      dayPlan.day,
                                      index,
                                      index + 1,
                                      activity,
                                      nextActivity,
                                      'walking'
                                    )}
                                  >
                                    🚶 步行
                                  </button>
                                  <button
                                    className="route-type-btn"
                                    onClick={() => handleQueryRoute(
                                      dayPlan.day,
                                      index,
                                      index + 1,
                                      activity,
                                      nextActivity,
                                      'transit'
                                    )}
                                  >
                                    🚌 公共交通
                                  </button>
                                </div>
                              )}
                              
                              {loading && (
                                <div className="route-loading">
                                  <span>🔄 正在查询路径...</span>
                                  <p style={{ fontSize: '12px', color: '#999', marginTop: '8px', margin: 0 }}>
                                    如果遇到限流，系统会自动重试
                                  </p>
                                </div>
                              )}
                              
                              {route && (
                                <div className="route-result">
                                  {/* 路线类型切换 */}
                                  <div className="route-type-tabs">
                                    <button
                                      className={`route-type-tab ${selectedType === 'driving' ? 'active' : ''}`}
                                      onClick={() => {
                                        const newType: RouteType = 'driving'
                                        const newRouteKey = getRouteKey(trip.id, dayPlan.day, index, index + 1, newType)
                                        if (routeData[newRouteKey]) {
                                          setSelectedRouteTypes(prev => ({ ...prev, [segmentKey]: newType }))
                                        } else {
                                          handleQueryRoute(dayPlan.day, index, index + 1, activity, nextActivity, newType)
                                        }
                                      }}
                                    >
                                      🚗 驾车
                                    </button>
                                    <button
                                      className={`route-type-tab ${selectedType === 'walking' ? 'active' : ''}`}
                                      onClick={() => {
                                        const newType: RouteType = 'walking'
                                        const newRouteKey = getRouteKey(trip.id, dayPlan.day, index, index + 1, newType)
                                        if (routeData[newRouteKey]) {
                                          setSelectedRouteTypes(prev => ({ ...prev, [segmentKey]: newType }))
                                        } else {
                                          handleQueryRoute(dayPlan.day, index, index + 1, activity, nextActivity, newType)
                                        }
                                      }}
                                    >
                                      🚶 步行
                                    </button>
                                    <button
                                      className={`route-type-tab ${selectedType === 'transit' ? 'active' : ''}`}
                                      onClick={() => {
                                        const newType: RouteType = 'transit'
                                        const newRouteKey = getRouteKey(trip.id, dayPlan.day, index, index + 1, newType)
                                        if (routeData[newRouteKey]) {
                                          setSelectedRouteTypes(prev => ({ ...prev, [segmentKey]: newType }))
                                        } else {
                                          handleQueryRoute(dayPlan.day, index, index + 1, activity, nextActivity, newType)
                                        }
                                      }}
                                    >
                                      🚌 公共交通
                                    </button>
                                  </div>
                                  
                                  {/* 路线摘要信息 */}
                                  <div className="route-info">
                                    <span className="route-distance">📏 {formatDistance(route.distance)}</span>
                                    <span className="route-duration">⏱️ {formatDuration(route.duration)}</span>
                                    {route.type === 'driving' && (() => {
                                      const drivingRoute = route as DrivingRouteResult
                                      const tolls = typeof drivingRoute.tolls === 'number' ? drivingRoute.tolls : parseFloat(String(drivingRoute.tolls || 0))
                                      return tolls > 0 && (
                                        <span className="route-tolls">💰 过路费 ¥{tolls.toFixed(2)}</span>
                                      )
                                    })()}
                                    {route.type === 'transit' && (() => {
                                      const transitRoute = route as TransitRouteResult
                                      const cost = typeof transitRoute.cost === 'number' ? transitRoute.cost : parseFloat(String(transitRoute.cost || 0))
                                      return cost > 0 && (
                                        <span className="route-cost">💰 费用 ¥{cost.toFixed(2)}</span>
                                      )
                                    })()}
                                  </div>
                                  
                                  {/* 展开/收起按钮 */}
                                  <button
                                    className="route-expand-btn"
                                    onClick={() => setExpandedRoutes(prev => ({ ...prev, [routeKey]: !isExpanded }))}
                                  >
                                    {isExpanded ? '▼ 收起详情' : '▶ 查看详情'}
                                  </button>
                                  
                                  {/* 详细路线步骤 */}
                                  {isExpanded && (
                                    <div className="route-details">
                                      {route.type === 'driving' && (
                                        <div className="route-steps">
                                          <h4>🚗 驾车路线</h4>
                                          {(route as DrivingRouteResult).paths[0]?.steps.map((step, stepIndex) => (
                                            <div key={stepIndex} className="route-step">
                                              <div className="step-instruction">{step.instruction}</div>
                                              {step.road && (
                                                <div className="step-road">道路: {step.road}</div>
                                              )}
                                              <div className="step-info">
                                                <span>距离: {formatDistance(step.distance)}</span>
                                                <span>时间: {formatDuration(step.duration)}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {route.type === 'walking' && (
                                        <div className="route-steps">
                                          <h4>🚶 步行路线</h4>
                                          {(route as WalkingRouteResult).paths[0]?.steps.map((step, stepIndex) => (
                                            <div key={stepIndex} className="route-step">
                                              <div className="step-instruction">{step.instruction}</div>
                                              {step.road && (
                                                <div className="step-road">道路: {step.road}</div>
                                              )}
                                              <div className="step-info">
                                                <span>距离: {formatDistance(step.distance)}</span>
                                                <span>时间: {formatDuration(step.duration)}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {route.type === 'transit' && (
                                        <div className="route-transit">
                                          <h4>🚌 公共交通方案</h4>
                                          {(route as TransitRouteResult).walking_distance > 0 && (
                                            <div className="transit-summary">
                                              <span>总步行距离: {formatDistance((route as TransitRouteResult).walking_distance)}</span>
                                            </div>
                                          )}
                                          {(route as TransitRouteResult).transits[0]?.segments.map((segment, segmentIndex) => (
                                            <div key={segmentIndex} className="transit-segment">
                                              {/* 步行段 */}
                                              {segment.walking && (
                                                <div className="transit-walking">
                                                  <strong>🚶 步行 {formatDistance(segment.walking.distance)}</strong>
                                                  {segment.walking.steps.map((step, stepIndex) => (
                                                    <div key={stepIndex} className="transit-step">
                                                      {step.instruction}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              
                                              {/* 公交/地铁段 */}
                                              {segment.bus && segment.bus.buslines.map((busline, buslineIndex) => (
                                                <div key={buslineIndex} className="transit-busline">
                                                  <div className="busline-header">
                                                    <strong>
                                                      {busline.type === '地铁' ? '🚇' : '🚌'} {busline.name}
                                                    </strong>
                                                  </div>
                                                  <div className="busline-info">
                                                    <div>起点: {busline.departure_stop.name}</div>
                                                    <div>终点: {busline.arrival_stop.name}</div>
                                                    {busline.departure_time && (
                                                      <div>发车时间: {busline.departure_time}</div>
                                                    )}
                                                    {busline.via_stops && busline.via_stops.length > 0 && (
                                                      <div>
                                                        途经: {busline.via_stops.length} 站
                                                      </div>
                                                    )}
                                                    <div>
                                                      距离: {formatDistance(busline.distance)} | 
                                                      时间: {formatDuration(busline.duration)}
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                              
                                              {/* 地铁入口/出口 */}
                                              {segment.entrance && (
                                                <div className="transit-entrance">
                                                  🚇 地铁入口: {segment.entrance.name}
                                                </div>
                                              )}
                                              {segment.exit && (
                                                <div className="transit-exit">
                                                  🚇 地铁出口: {segment.exit.name}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* 刷新按钮 */}
                                  <button
                                    className="route-refresh-btn"
                                    onClick={() => handleQueryRoute(
                                      dayPlan.day,
                                      index,
                                      index + 1,
                                      activity,
                                      nextActivity,
                                      selectedType
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
