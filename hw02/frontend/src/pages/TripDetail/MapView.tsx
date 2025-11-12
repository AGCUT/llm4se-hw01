// MapView 组件 - 地图视图
import { useState } from 'react'
import type { Trip } from '@/config/supabase.config'
import TripMap from '@/components/trip/TripMap/TripMap'
import './TripDetail.css'

interface MapViewProps {
  trip: Trip
}

const MapView = ({ trip }: MapViewProps) => {
  const [selectedLocation, setSelectedLocation] = useState<any>(null)

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
            locations.push({
              name: activity.name,
              address: activity.location.address || '',
              coordinates: activity.location.coordinates,
              type: activity.type,
              day: dayIndex + 1,
              activityIndex: actIndex + 1
            })
          }
        })
      }
    })
  }

  return (
    <div className="map-view">
      {/* 地图容器 */}
      <div className="map-container">
        <TripMap trip={trip} height="600px" />
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
                onClick={() => setSelectedLocation(location)}
              >
                <div className="location-number">{location.day}-{location.activityIndex}</div>
                <div className="location-info">
                  <h4>{location.name}</h4>
                  <p>{location.address || '地址未知'}</p>
                  <span className="location-type">{getTypeText(location.type)}</span>
                </div>
                {location.coordinates && (
                  <div className="location-coords">
                    {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
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
