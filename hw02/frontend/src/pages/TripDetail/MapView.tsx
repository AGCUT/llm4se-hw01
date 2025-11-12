// MapView 组件 - 地图视图
import type { Trip } from '@/config/supabase.config'
import './TripDetail.css'

interface MapViewProps {
  trip: Trip
}

const MapView = ({ trip }: MapViewProps) => {
  // 提取所有地点
  const locations: any[] = []
  
  if (trip.daily_plans) {
    trip.daily_plans.forEach((dayPlan: any) => {
      if (dayPlan.activities) {
        dayPlan.activities.forEach((activity: any) => {
          if (activity.location) {
            locations.push({
              name: activity.name,
              address: activity.location.address,
              coordinates: activity.location.coordinates,
              type: activity.type
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
        <div className="map-placeholder">
          <div className="map-placeholder-content">
            <div className="map-icon">🗺️</div>
            <h3>地图功能</h3>
            <p>集成高德地图 API 后可显示行程地图</p>
            <p className="map-hint">
              目的地：{trip.destination}<br/>
              共 {locations.length} 个地点
            </p>
          </div>
        </div>
      </div>

      {/* 地点列表 */}
      <div className="locations-list">
        <h3>📍 行程地点 ({locations.length})</h3>
        <div className="location-items">
          {locations.map((location, index) => (
            <div key={index} className="location-card">
              <div className="location-number">{index + 1}</div>
              <div className="location-info">
                <h4>{location.name}</h4>
                <p>{location.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MapView
