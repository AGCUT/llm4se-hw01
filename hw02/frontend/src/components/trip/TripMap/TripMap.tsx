// TripMap 组件 - 行程地图展示
import { useEffect, useRef } from 'react'
import { useMap } from '@/hooks/useMap'
import type { Trip } from '@/config/supabase.config'
import './TripMap.module.css'

interface TripMapProps {
  trip: Trip
  height?: string
}

const TripMap = ({ trip, height = '600px' }: TripMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])

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
          if (activity.location && activity.location.coordinates) {
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

  // 计算地图中心点
  const calculateCenter = (): [number, number] => {
    if (locations.length === 0) {
      // 如果没有地点，使用目的地坐标（如果有）
      if (trip.map_center && trip.map_center.lng && trip.map_center.lat) {
        return [trip.map_center.lng, trip.map_center.lat]
      }
      // 默认北京
      return [116.397428, 39.90923]
    }

    // 计算所有地点的中心
    const lngs = locations.map(loc => loc.coordinates?.lng).filter(Boolean) as number[]
    const lats = locations.map(loc => loc.coordinates?.lat).filter(Boolean) as number[]

    if (lngs.length === 0 || lats.length === 0) {
      return [116.397428, 39.90923]
    }

    const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length
    const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length

    return [centerLng, centerLat]
  }

  const { map, AMap, loading, error, isConfigured } = useMap({
    containerId: `trip-map-${trip.id}`,
    zoom: locations.length > 0 ? 12 : 10,
    center: calculateCenter(),
    onMapReady: (mapInstance, AMapInstance) => {
      if (!mapInstance || !AMapInstance) return

      console.log('地图初始化完成，开始添加标记点...')

      // 清除之前的标记和路线
      markersRef.current.forEach(marker => marker.remove())
      polylinesRef.current.forEach(polyline => polyline.remove())
      markersRef.current = []
      polylinesRef.current = []

      // 添加标记点
      locations.forEach((location, index) => {
        if (!location.coordinates) return

        const marker = new AMapInstance.Marker({
          position: [location.coordinates.lng, location.coordinates.lat],
          title: location.name,
          label: {
            content: `${location.day}-${location.activityIndex}`,
            offset: new AMapInstance.Pixel(0, -30),
            direction: 'right'
          }
          // 使用默认图标，不传 icon 参数
        })

        // 添加信息窗口
        const infoWindow = new AMapInstance.InfoWindow({
          content: `
            <div style="padding: 10px;">
              <h4 style="margin: 0 0 5px 0;">${location.name}</h4>
              <p style="margin: 0; color: #666; font-size: 12px;">${location.address}</p>
              <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">第 ${location.day} 天 - 活动 ${location.activityIndex}</p>
            </div>
          `,
          offset: new AMapInstance.Pixel(0, -30)
        })

        marker.on('click', () => {
          infoWindow.open(mapInstance, marker.getPosition())
        })

        mapInstance.add(marker)
        markersRef.current.push(marker)
      })

      // 绘制路线（连接同一天的地点）
      if (locations.length > 1) {
        drawRoutes(mapInstance, AMapInstance, locations)
      }

      // 调整地图视野以包含所有标记
      if (markersRef.current.length > 0) {
        mapInstance.setFitView(markersRef.current, false, [50, 50, 50, 50])
      }
    }
  })


  // 绘制路线
  const drawRoutes = (mapInstance: any, AMapInstance: any, locations: any[]) => {
    // 按天分组
    const locationsByDay = locations.reduce((acc, loc) => {
      if (!acc[loc.day]) {
        acc[loc.day] = []
      }
      acc[loc.day].push(loc)
      return acc
    }, {} as Record<number, typeof locations>)

    // 为每一天绘制路线
    Object.values(locationsByDay).forEach((dayLocations: any) => {
      if (dayLocations.length < 2) return

      const path = dayLocations
        .filter((loc: any) => loc.coordinates)
        .map((loc: any) => [loc.coordinates.lng, loc.coordinates.lat])

      if (path.length < 2) return

      const polyline = new AMapInstance.Polyline({
        path,
        isOutline: true,
        outlineColor: '#ffeeff',
        borderWeight: 3,
        strokeColor: '#3366FF',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 50
      })

      mapInstance.add(polyline)
      polylinesRef.current.push(polyline)
    })
  }

  // 容器 ID
  const containerId = `trip-map-${trip.id}`

  // 确保容器元素始终存在，即使是在加载或错误状态下
  // 这样 useMap Hook 才能找到容器元素
  return (
    <div style={{ position: 'relative', height }}>
      {/* 地图容器 - 始终渲染，即使配置未完成或加载中 */}
      <div
        id={containerId}
        ref={mapContainerRef}
        style={{ 
          width: '100%', 
          height: '100%',
          display: (!isConfigured || loading || error) ? 'none' : 'block'
        }}
      />

      {/* 未配置状态 */}
      {!isConfigured && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <h3>地图功能未配置</h3>
            <p>请在 .env.local 文件中配置 VITE_AMAP_KEY</p>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
              目的地：{trip.destination} | 共 {locations.length} 个地点
            </p>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isConfigured && loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <p>正在加载地图...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {isConfigured && error && !loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff1f0',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3>地图加载失败</h3>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* 无地点信息提示 */}
      {isConfigured && !loading && !error && locations.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '16px',
          borderRadius: '8px',
          textAlign: 'center',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <p>暂无地点信息</p>
        </div>
      )}
    </div>
  )
}

export default TripMap
