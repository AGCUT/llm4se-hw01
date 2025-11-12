// MapView 组件 - 地图视图
import { useState, useEffect } from 'react'
import type { Trip } from '@/config/supabase.config'
import TripMap from '@/components/trip/TripMap/TripMap'
import { geocode } from '@/services/mapService'
import './TripDetail.css'

interface MapViewProps {
  trip: Trip
}

const MapView = ({ trip }: MapViewProps) => {
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [centerOnLocation, setCenterOnLocation] = useState<{ lng: number; lat: number } | null>(null)
  const [geocodingLocation, setGeocodingLocation] = useState<string | null>(null) // 正在地理编码的地点名称

  // 验证坐标是否有效
  const isValidCoordinate = (value: any): boolean => {
    const num = Number(value)
    return !isNaN(num) && isFinite(num) && num !== null && num !== undefined
  }

  // 提取坐标（支持多种格式）
  const extractCoordinates = (location: any): { lng: number; lat: number } | null => {
    if (!location) return null

    let coordinates = null

    // 检查 coordinates 字段
    if (location.coordinates) {
      // 可能是 { lng, lat } 格式
      if (typeof location.coordinates === 'object' && !Array.isArray(location.coordinates)) {
        if (location.coordinates.lng && location.coordinates.lat) {
          const lng = Number(location.coordinates.lng)
          const lat = Number(location.coordinates.lat)
          if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
            coordinates = { lng, lat }
          }
        } else if (location.coordinates[0] && location.coordinates[1]) {
          // 可能是 [lng, lat] 数组格式（但被当作对象处理了）
          const lng = Number(location.coordinates[0])
          const lat = Number(location.coordinates[1])
          if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
            coordinates = { lng, lat }
          }
        }
      } else if (Array.isArray(location.coordinates)) {
        // 数组格式 [lng, lat]
        if (location.coordinates.length >= 2) {
          const lng = Number(location.coordinates[0])
          const lat = Number(location.coordinates[1])
          if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
            coordinates = { lng, lat }
          }
        }
      }
    }

    // 检查 lng 和 lat 是否直接在 location 下
    if (!coordinates && location.lng && location.lat) {
      const lng = Number(location.lng)
      const lat = Number(location.lat)
      if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
        coordinates = { lng, lat }
      }
    }

    return coordinates
  }

  // 提取所有地点
  const locations: Array<{
    name: string
    address: string
    coordinates?: { lng: number; lat: number }
    type: string
    day: number
    activityIndex: number
  }> = []
  
  if (trip.daily_plans) {
    trip.daily_plans.forEach((dayPlan: any, dayIndex: number) => {
      if (dayPlan.activities) {
        dayPlan.activities.forEach((activity: any, actIndex: number) => {
          if (activity.location) {
            // 详细记录原始数据
            console.log(`[MapView] 处理地点: ${activity.name} (${activity.type})`, {
              location: activity.location,
              locationKeys: Object.keys(activity.location),
              coordinates: activity.location.coordinates,
              coordinatesType: typeof activity.location.coordinates,
              isCoordinatesArray: Array.isArray(activity.location.coordinates),
              lng: activity.location.lng,
              lat: activity.location.lat
            })
            
            const coordinates = extractCoordinates(activity.location)
            if (coordinates) {
              console.log(`[MapView] ✅ 找到坐标: ${activity.name} (${activity.type})`, coordinates)
            } else {
              console.warn(`[MapView] ⚠️ 无坐标: ${activity.name} (${activity.type})`, {
                location: activity.location,
                locationString: JSON.stringify(activity.location, null, 2),
                hasCoordinates: !!activity.location.coordinates,
                hasLngLat: !!(activity.location.lng && activity.location.lat),
                coordinatesValue: activity.location.coordinates
              })
            }
            locations.push({
              name: activity.name,
              address: activity.location.address || '',
              coordinates: coordinates || undefined,
              type: activity.type,
              day: dayIndex + 1,
              activityIndex: actIndex + 1
            })
          } else {
            console.log(`[MapView] 地点无 location 字段: ${activity.name} (${activity.type})`)
          }
        })
      }
    })
  }

  console.log(`[MapView] 提取的地点总数: ${locations.length}, 有坐标的: ${locations.filter(loc => loc.coordinates).length}`)

  return (
    <div className="map-view">
      {/* 地图容器 */}
      <div className="map-container">
        <TripMap trip={trip} height="600px" centerOnLocation={centerOnLocation} />
      </div>

      {/* 地点列表 */}
      <div className="locations-list">
        <h3>📍 行程地点 ({locations.length})</h3>
        {locations.length === 0 ? (
          <div className="empty-locations">
            <p>暂无地点信息</p>
            <p className="hint">行程中的活动需要包含位置信息才能在地图上显示</p>
          </div>
        ) : (
          <div className="location-items">
            {locations.map((location, index) => (
              <div
                key={index}
                className={`location-card ${selectedLocation === location ? 'selected' : ''}`}
                onClick={async () => {
                  setSelectedLocation(location)
                  
                  // 如果地点有坐标，直接移动地图中心到该位置
                  if (location.coordinates && location.coordinates.lng && location.coordinates.lat) {
                    console.log(`[MapView] 点击地点: ${location.name}, 坐标:`, location.coordinates)
                    setCenterOnLocation({
                      lng: location.coordinates.lng,
                      lat: location.coordinates.lat
                    })
                  } else if (location.address) {
                    // 如果没有坐标但有地址，尝试地理编码
                    console.log(`[MapView] 点击的地点无坐标，尝试地理编码: ${location.name}`, {
                      address: location.address,
                      hasCoordinates: !!location.coordinates
                    })
                    
                    setGeocodingLocation(location.name)
                    try {
                      const coordinates = await geocode(location.address)
                      if (coordinates) {
                        console.log(`[MapView] ✅ 地理编码成功: ${location.name} ->`, coordinates)
                        setCenterOnLocation(coordinates)
                        // 更新 location 对象的坐标（可选，用于后续显示）
                        location.coordinates = coordinates
                      } else {
                        console.warn(`[MapView] ⚠️ 地理编码失败: ${location.name} (地址: ${location.address})`)
                        alert(`无法获取"${location.name}"的坐标信息\n\n地址: ${location.address}\n\n请检查地址是否正确，或稍后重试。`)
                      }
                    } catch (error: any) {
                      console.error(`[MapView] ❌ 地理编码异常: ${location.name}`, error)
                      alert(`地理编码失败: ${error.message || '未知错误'}\n\n地点: ${location.name}\n地址: ${location.address}`)
                    } finally {
                      setGeocodingLocation(null)
                    }
                  } else {
                    console.warn(`[MapView] 点击的地点既无坐标也无地址: ${location.name}`)
                    alert(`"${location.name}"缺少位置信息\n\n该地点没有坐标和地址信息，无法在地图上显示。`)
                  }
                }}
              >
                <div className="location-number">{location.day}-{location.activityIndex}</div>
                <div className="location-info">
                  <h4>{location.name}</h4>
                  <p>{location.address || '地址未知'}</p>
                  <span className="location-type">{getTypeText(location.type)}</span>
                </div>
                {location.coordinates ? (
                  <div className="location-coords">
                    {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
                  </div>
                ) : location.address ? (
                  <div className="location-status" style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {geocodingLocation === location.name ? '🔄 正在获取坐标...' : '📍 点击获取坐标'}
                  </div>
                ) : (
                  <div className="location-status" style={{ fontSize: '12px', color: '#ff9800', marginTop: '4px' }}>
                    ⚠️ 无位置信息
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 获取活动类型文本
const getTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    transportation: '🚗 交通',
    accommodation: '🏨 住宿',
    attraction: '🏛️ 景点',
    restaurant: '🍽️ 餐厅',
    food: '🍽️ 美食',
    meal: '🍽️ 用餐',
    sightseeing: '👁️ 观光',
    other: '📍 其他'
  }
  return typeMap[type] || '📍 其他'
}

export default MapView
