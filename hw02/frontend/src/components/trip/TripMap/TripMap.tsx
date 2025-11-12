// TripMap 组件 - 行程地图展示
import { useEffect, useRef, useState, useMemo } from 'react'
import { useMap } from '@/hooks/useMap'
import { geocode } from '@/services/mapService'
import type { Trip } from '@/config/supabase.config'
import './TripMap.module.css'

interface TripMapProps {
  trip: Trip
  height?: string
  centerOnLocation?: { lng: number; lat: number } | null // 要聚焦的坐标
}

// 验证坐标是否有效
const isValidCoordinate = (value: any): boolean => {
  const num = Number(value)
  return !isNaN(num) && isFinite(num) && num !== null && num !== undefined
}

// 验证坐标对象是否有效
const isValidCoordinates = (coords: { lng: number; lat: number } | undefined): boolean => {
  if (!coords) return false
  return isValidCoordinate(coords.lng) && isValidCoordinate(coords.lat)
}

const TripMap = ({ trip, height = '600px', centerOnLocation }: TripMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const polylinesRef = useRef<any[]>([])
  const infoWindowsRef = useRef<Map<string, any>>(new Map()) // 存储每个标记点的信息窗口，key 为坐标字符串
  const [locations, setLocations] = useState<Array<{
    name: string
    address: string
    coordinates?: { lng: number; lat: number }
    type: string
    day: number
    activityIndex: number
  }>>([])
  const [geocodingLoading, setGeocodingLoading] = useState(false)

  // 提取所有地点（使用 useMemo 避免重复计算）
  const rawLocations = useMemo(() => {
    const locations: Array<{
      name: string
      address: string
      coordinates?: { lng: number; lat: number }
      type: string
      day: number
      activityIndex: number
      needGeocode?: boolean
    }> = []

    if (trip.daily_plans) {
      console.log('=== 开始提取地点信息 ===')
      console.log('daily_plans 数据:', trip.daily_plans)
      console.log('daily_plans 类型:', typeof trip.daily_plans)
      console.log('daily_plans 长度:', Array.isArray(trip.daily_plans) ? trip.daily_plans.length : '不是数组')

      trip.daily_plans.forEach((dayPlan: any, dayIndex: number) => {
        console.log(`第 ${dayIndex + 1} 天计划:`, dayPlan)
        if (dayPlan.activities) {
          console.log(`  活动数量: ${dayPlan.activities.length}`)
          dayPlan.activities.forEach((activity: any, actIndex: number) => {
            console.log(`    活动 ${actIndex + 1}:`, {
              name: activity.name,
              type: activity.type,
              location: activity.location
            })

            // 检查 location 是否存在
            if (activity.location) {
              console.log(`      location 完整数据:`, JSON.stringify(activity.location, null, 2))
              
              // 检查 coordinates 的格式
              let coordinates = null
              if (activity.location.coordinates) {
                // 可能是 { lng, lat } 格式
                if (typeof activity.location.coordinates === 'object') {
                  if (activity.location.coordinates.lng && activity.location.coordinates.lat) {
                    const lng = Number(activity.location.coordinates.lng)
                    const lat = Number(activity.location.coordinates.lat)
                    if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
                      coordinates = { lng, lat }
                    }
                  } else if (activity.location.coordinates[0] && activity.location.coordinates[1]) {
                    // 可能是 [lng, lat] 数组格式
                    const lng = Number(activity.location.coordinates[0])
                    const lat = Number(activity.location.coordinates[1])
                    if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
                      coordinates = { lng, lat }
                    }
                  }
                } else if (Array.isArray(activity.location.coordinates)) {
                  // 数组格式 [lng, lat]
                  if (activity.location.coordinates.length >= 2) {
                    const lng = Number(activity.location.coordinates[0])
                    const lat = Number(activity.location.coordinates[1])
                    if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
                      coordinates = { lng, lat }
                    }
                  }
                }
              }
              
              // 检查 lng 和 lat 是否直接在 location 下
              if (!coordinates && activity.location.lng && activity.location.lat) {
                const lng = Number(activity.location.lng)
                const lat = Number(activity.location.lat)
                if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
                  coordinates = { lng, lat }
                }
              }
              
              if (coordinates && isValidCoordinates(coordinates)) {
                console.log(`      ✅ 找到坐标:`, coordinates)
                locations.push({
                  name: activity.name,
                  address: activity.location.address || '',
                  coordinates: coordinates,
                  type: activity.type,
                  day: dayIndex + 1,
                  activityIndex: actIndex + 1
                })
              } else if (activity.location.address) {
                // 如果有地址但没有坐标，标记为需要地理编码
                console.log(`      ⚠️ 有地址但无坐标，将进行地理编码:`, activity.location.address)
                locations.push({
                  name: activity.name,
                  address: activity.location.address,
                  coordinates: undefined,
                  type: activity.type,
                  day: dayIndex + 1,
                  activityIndex: actIndex + 1,
                  needGeocode: true
                })
              } else {
                // 如果 location 存在但没有 address 和 coordinates
                console.log(`      ⚠️ location 存在但无地址和坐标:`, activity.location)
                console.log(`      location 对象结构:`, Object.keys(activity.location))
              }
            } else {
              console.log(`      ❌ 无 location 信息`)
            }
          })
        } else {
          console.log(`  无 activities`)
        }
      })

      console.log(`=== 地点提取完成，共 ${locations.length} 个地点 ===`)
      if (locations.length > 0) {
        console.log('地点列表:', locations.map(loc => ({
          name: loc.name,
          address: loc.address,
          coordinates: loc.coordinates,
          needGeocode: loc.needGeocode,
          day: loc.day,
          index: loc.activityIndex
        })))
      } else {
        console.warn('⚠️ 没有找到任何地点信息！')
        console.log('可能的原因：')
        console.log('1. daily_plans 为空或格式不正确')
        console.log('2. activities 中没有 location 信息')
        console.log('3. location 中没有 coordinates 字段')
      }
    } else {
      console.warn('⚠️ trip.daily_plans 不存在或为空')
    }

    return locations
  }, [trip.daily_plans])

  // 地理编码：将地址转换为坐标（需要等待地图初始化完成）
  useEffect(() => {
    if (rawLocations.length === 0) {
      // 没有地点，直接设置空数组
      setLocations([])
      return
    }

    const needGeocode = rawLocations.filter(loc => loc.needGeocode && !loc.coordinates)
    
    if (needGeocode.length === 0) {
      // 所有地点都有坐标，直接设置
      setLocations(rawLocations.map(({ needGeocode, ...loc }) => loc))
      return
    }

    // 需要地理编码，等待地图初始化
    // 注意：地理编码需要 AMap 实例，所以需要等待地图初始化完成
    // 这里我们会在 onMapReady 回调中进行地理编码
    console.log(`=== 发现 ${needGeocode.length} 个地址需要地理编码 ===`)
    setGeocodingLoading(true)

    // 先设置已有的坐标
    const existingLocations = rawLocations.filter(loc => loc.coordinates)
    setLocations(existingLocations.map(({ needGeocode, ...loc }) => loc))

    // 地理编码会在 onMapReady 中执行
  }, [rawLocations])

  // 地图实例引用
  const mapInstanceRef = useRef<any>(null)
  const amapInstanceRef = useRef<any>(null)

  // 地理编码函数（在地图初始化完成后调用）
  const performGeocoding = async (locationsToGeocode: typeof rawLocations) => {
    const needGeocode = locationsToGeocode.filter(loc => loc.needGeocode && !loc.coordinates)
    
    if (needGeocode.length === 0) {
      console.log(`[TripMap] 没有需要地理编码的地址`)
      return []
    }

    console.log(`[TripMap] === 开始地理编码，共 ${needGeocode.length} 个地址需要编码 ===`)
    setGeocodingLoading(true)

    try {
      // 批量地理编码（添加延迟避免 API 限流）
      const geocodedLocations: any[] = []
      
      for (let index = 0; index < needGeocode.length; index++) {
        const loc = needGeocode[index]
        
        // 添加延迟避免 API 限流（每个请求间隔 2 秒，避免并发限制）
        // 高德地图免费版限制：QPS（每秒查询数）有限制，建议间隔 2 秒以上
        if (index > 0) {
          const waitTime = 2000 // 2 秒
          console.log(`[TripMap] 等待 ${waitTime}ms 后处理下一个地址（避免 API 限流）...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }

        console.log(`[TripMap] 正在地理编码 (${index + 1}/${needGeocode.length}): ${loc.address}`)
        const geocodeStartTime = Date.now()
        
        // 添加重试机制（最多重试 5 次，限流错误时增加重试次数）
        let retryCount = 0
        const maxRetries = 5
        let coordinates = null
        let lastError: any = null
        
        while (retryCount < maxRetries && !coordinates) {
          try {
            // 使用 Web 服务 API，不需要 AMapInstance
            coordinates = await geocode(loc.address)
            const geocodeDuration = Date.now() - geocodeStartTime
            
            if (coordinates && isValidCoordinates(coordinates)) {
              console.log(`[TripMap] ✅ 地理编码成功 (耗时 ${geocodeDuration}ms): ${loc.address} ->`, coordinates)
              geocodedLocations.push({
                ...loc,
                coordinates,
                needGeocode: undefined
              })
              break // 成功，退出重试循环
            } else {
              if (coordinates) {
                console.warn(`[TripMap] ⚠️ 地理编码返回无效坐标: ${loc.address}`, coordinates)
              }
              console.warn(`[TripMap] ⚠️ 地理编码失败 (耗时 ${geocodeDuration}ms): ${loc.address} (返回 null)`)
              retryCount++
              if (retryCount < maxRetries) {
                // 等待更长时间后重试（指数退避）
                const waitTime = Math.min(2000 * Math.pow(2, retryCount - 1), 10000)
                console.log(`[TripMap] 等待 ${waitTime}ms 后重试 (${retryCount}/${maxRetries})...`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
              }
            }
          } catch (error: any) {
            lastError = error
            const geocodeDuration = Date.now() - geocodeStartTime
            console.error(`[TripMap] ❌ 地理编码异常 (耗时 ${geocodeDuration}ms): ${loc.address}`, error)
            console.error(`[TripMap] 错误详情:`, error?.message, error?.stack)
            
            // 检查是否是限流错误
            const isRateLimitError = error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') || 
                                    error?.message?.includes('限流') ||
                                    error?.message?.includes('EXCEEDED') ||
                                    error?.message?.includes('CUQPS')
            
            if (isRateLimitError) {
              retryCount++
              if (retryCount < maxRetries) {
                // 限流错误，等待更长时间后重试（指数退避，最少 5 秒）
                const waitTime = Math.min(5000 * Math.pow(2, retryCount - 1), 30000) // 5秒、10秒、20秒、最多30秒
                console.log(`[TripMap] ⚠️ 遇到限流错误，等待 ${waitTime}ms 后重试 (${retryCount}/${maxRetries})...`)
                console.log(`[TripMap] 提示：如果持续遇到限流，请检查 API Key 的 QPS 限制或考虑升级 API Key`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
              } else {
                console.error(`[TripMap] ❌ 地理编码失败，已达到最大重试次数: ${loc.address}`)
                console.error(`[TripMap] 错误信息: ${error?.message}`)
                break
              }
            } else {
              // 其他错误，不重试
              console.error(`[TripMap] ❌ 非限流错误，不重试: ${loc.address}`)
              break
            }
          }
        }
        
        if (!coordinates) {
          console.warn(`[TripMap] ⚠️ 地理编码最终失败: ${loc.address}`)
          if (lastError) {
            console.warn(`[TripMap] 最后错误: ${lastError?.message}`)
          }
        }
      }

      // 合并已有坐标和地理编码后的地点
      const existingLocations = locationsToGeocode.filter(loc => loc.coordinates)
      const allLocations = [
        ...existingLocations.map(({ needGeocode, ...loc }) => loc),
        ...geocodedLocations.map(({ needGeocode, ...loc }) => loc)
      ]

      console.log(`[TripMap] === 地理编码完成 ===`)
      console.log(`[TripMap] 已有坐标: ${existingLocations.length} 个`)
      console.log(`[TripMap] 地理编码成功: ${geocodedLocations.length} 个`)
      console.log(`[TripMap] 总计有效地点: ${allLocations.length} 个`)
      console.log(`[TripMap] 地点列表:`, allLocations.map(loc => ({ name: loc.name, address: loc.address, coordinates: loc.coordinates })))
      
      if (allLocations.length > 0) {
        console.log(`[TripMap] 设置 locations 状态...`)
        setLocations(allLocations)
        console.log(`[TripMap] locations 状态已设置，当前 locations 长度: ${allLocations.length}`)
        
        // 地理编码完成后，更新地图标记
        if (mapInstanceRef.current && amapInstanceRef.current) {
          console.log(`[TripMap] 开始更新地图标记...`)
          // 使用 setTimeout 确保状态已更新
          setTimeout(() => {
            updateMapMarkers(mapInstanceRef.current, amapInstanceRef.current, allLocations)
          }, 200)
        } else {
          console.warn(`[TripMap] ⚠️ 地图实例不存在，无法更新标记`)
        }
      } else {
        console.warn(`[TripMap] ⚠️ 没有有效地点，无法更新地图`)
        setLocations([])
      }
      
      return allLocations
    } catch (error) {
      console.error('[TripMap] 地理编码过程中出错:', error)
      return []
    } finally {
      setGeocodingLoading(false)
    }
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

    // 计算所有地点的中心（只使用有效坐标）
    const validLocations = locations.filter(loc => isValidCoordinates(loc.coordinates))
    const lngs = validLocations
      .map(loc => loc.coordinates?.lng)
      .filter((lng): lng is number => isValidCoordinate(lng))
    const lats = validLocations
      .map(loc => loc.coordinates?.lat)
      .filter((lat): lat is number => isValidCoordinate(lat))

    if (lngs.length === 0 || lats.length === 0) {
      return [116.397428, 39.90923]
    }

    const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length
    const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length

    // 验证计算出的中心点是否有效
    if (!isValidCoordinate(centerLng) || !isValidCoordinate(centerLat)) {
      return [116.397428, 39.90923]
    }

    return [centerLng, centerLat]
  }

  const { loading, error, isConfigured } = useMap({
    containerId: `trip-map-${trip.id}`,
    zoom: locations.length > 0 ? 12 : 10,
    center: calculateCenter(),
    onMapReady: async (mapInstance, AMapInstance) => {
      if (!mapInstance || !AMapInstance) return

      console.log('地图初始化完成，开始处理地点...')
      
      // 保存地图实例引用
      mapInstanceRef.current = mapInstance
      amapInstanceRef.current = AMapInstance

      // 等待地图完全渲染（确保容器有尺寸）
      const waitForMapReady = () => {
        return new Promise<void>((resolve) => {
          const container = document.getElementById(`trip-map-${trip.id}`)
          if (container) {
            const containerWidth = container.offsetWidth || container.clientWidth
            const containerHeight = container.offsetHeight || container.clientHeight
            if (containerWidth > 0 && containerHeight > 0) {
              console.log(`[TripMap] 地图容器已就绪，尺寸: ${containerWidth}x${containerHeight}`)
              resolve()
              return
            }
          }
          // 如果容器还没有尺寸，等待一段时间后重试
          console.log('[TripMap] 等待地图容器渲染...')
          setTimeout(() => {
            waitForMapReady().then(resolve)
          }, 100)
        })
      }

      // 等待地图完全渲染
      await waitForMapReady()

      // 先显示已有的坐标
      const existingLocations = rawLocations.filter(loc => loc.coordinates)
      if (existingLocations.length > 0) {
        const existingLocationsClean = existingLocations.map(({ needGeocode, ...loc }) => loc)
        setLocations(existingLocationsClean)
        // 使用 setTimeout 确保地图完全准备好
        setTimeout(() => {
          updateMapMarkers(mapInstance, AMapInstance, existingLocationsClean)
        }, 100)
      }

      // 进行地理编码（如果有需要编码的地址）
      const needGeocode = rawLocations.filter(loc => loc.needGeocode && !loc.coordinates)
      if (needGeocode.length > 0) {
        console.log(`[TripMap] 发现 ${needGeocode.length} 个地址需要地理编码，开始编码...`)
        // 调用地理编码函数（使用 Web 服务 API，不需要 AMapInstance）
        performGeocoding(rawLocations).catch((error) => {
          console.error('[TripMap] 地理编码过程中出错:', error)
        })
      } else if (existingLocations.length === 0) {
        // 没有需要编码的，也没有已有坐标的
        console.log('[TripMap] 没有地点需要显示')
      }
    }
  })

  // 当 locations 更新时，更新地图标记
  useEffect(() => {
    if (mapInstanceRef.current && amapInstanceRef.current && locations.length > 0) {
      updateMapMarkers(mapInstanceRef.current, amapInstanceRef.current, locations)
    }
  }, [locations])

  // 当 centerOnLocation 变化时，移动地图中心到该位置并高亮标记点
  useEffect(() => {
    if (centerOnLocation && mapInstanceRef.current && amapInstanceRef.current) {
      const { lng, lat } = centerOnLocation
      
      // 验证坐标有效性
      if (isValidCoordinate(lng) && isValidCoordinate(lat)) {
        console.log(`[TripMap] 移动地图中心到: [${lng}, ${lat}]`)
        try {
          // 找到对应的标记点并高亮
          const targetMarker = markersRef.current.find((marker: any) => {
            const position = marker.getPosition()
            if (position && position.lng && position.lat) {
              // 允许小的误差（坐标可能不完全一致）
              const lngDiff = Math.abs(position.lng - lng)
              const latDiff = Math.abs(position.lat - lat)
              return lngDiff < 0.0001 && latDiff < 0.0001
            }
            return false
          })

          // 使用 setCenter 方法移动地图中心，并设置合适的缩放级别
          // 使用动画效果，使移动更平滑
          mapInstanceRef.current.setCenter([lng, lat], true) // true 表示使用动画
          mapInstanceRef.current.setZoom(15) // 设置一个合适的缩放级别，可以清楚看到地点

          // 如果找到标记点，打开信息窗口
          if (targetMarker) {
            console.log(`[TripMap] 找到对应的标记点，打开信息窗口`)
            // 查找对应的信息窗口
            const coordKey = `${lng.toFixed(6)},${lat.toFixed(6)}`
            const infoWindowData = infoWindowsRef.current.get(coordKey)
            if (infoWindowData && infoWindowData.infoWindow) {
              // 延迟一点打开，确保地图移动完成
              setTimeout(() => {
                try {
                  infoWindowData.infoWindow.open(mapInstanceRef.current, targetMarker.getPosition())
                } catch (error: any) {
                  console.error(`[TripMap] 打开信息窗口失败:`, error)
                }
              }, 300) // 等待地图移动动画完成
            }
          }
        } catch (error: any) {
          console.error(`[TripMap] 移动地图中心失败:`, error)
        }
      } else {
        console.warn(`[TripMap] 无效的坐标，无法移动地图中心:`, centerOnLocation)
      }
    }
  }, [centerOnLocation])

  // 更新地图标记点
  const updateMapMarkers = (mapInstance: any, AMapInstance: any, locationsToShow: typeof locations) => {
    if (!mapInstance || !AMapInstance || !locationsToShow || locationsToShow.length === 0) {
      console.log('没有地点需要显示')
      return
    }

    // 检查地图容器是否有有效尺寸
    const container = document.getElementById(`trip-map-${trip.id}`)
    if (!container) {
      console.warn('[TripMap] 地图容器不存在，延迟添加标记')
      // 延迟重试
      setTimeout(() => {
        if (mapInstanceRef.current && amapInstanceRef.current) {
          updateMapMarkers(mapInstanceRef.current, amapInstanceRef.current, locationsToShow)
        }
      }, 500)
      return
    }

    const containerWidth = container.offsetWidth || container.clientWidth
    const containerHeight = container.offsetHeight || container.clientHeight

    if (containerWidth === 0 || containerHeight === 0) {
      console.warn(`[TripMap] 地图容器尺寸无效 (${containerWidth}x${containerHeight})，延迟添加标记`)
      // 延迟重试
      setTimeout(() => {
        if (mapInstanceRef.current && amapInstanceRef.current) {
          updateMapMarkers(mapInstanceRef.current, amapInstanceRef.current, locationsToShow)
        }
      }, 500)
      return
    }

    console.log(`开始添加 ${locationsToShow.length} 个标记点...`)
    console.log(`[TripMap] 地图容器尺寸: ${containerWidth}x${containerHeight}`)

    // 清除之前的标记和路线
    markersRef.current.forEach(marker => marker.remove())
    polylinesRef.current.forEach(polyline => polyline.remove())
    markersRef.current = []
    polylinesRef.current = []

    // 添加标记点
    locationsToShow.forEach((location) => {
      try {
        // 验证坐标有效性
        if (!location.coordinates || !isValidCoordinates(location.coordinates)) {
          console.warn(`[TripMap] 跳过无效坐标的地点: ${location.name}`, location.coordinates)
          return
        }

        const { lng, lat } = location.coordinates
        
        // 再次验证坐标值（确保是数字且有效）
        if (!isValidCoordinate(lng) || !isValidCoordinate(lat)) {
          console.warn(`[TripMap] 坐标值无效: ${location.name}`, { lng, lat })
          return
        }

        // 最终验证：确保坐标是数字类型
        const finalLng = Number(lng)
        const finalLat = Number(lat)
        if (!isValidCoordinate(finalLng) || !isValidCoordinate(finalLat)) {
          console.warn(`[TripMap] 坐标转换后无效: ${location.name}`, { finalLng, finalLat })
          return
        }

        // 创建 Pixel 对象前验证参数
        let labelOffset
        try {
          labelOffset = new AMapInstance.Pixel(0, -30)
        } catch (pixelError) {
          console.error(`[TripMap] 创建 Pixel 对象失败:`, pixelError)
          // 如果 Pixel 创建失败，不使用 label
          labelOffset = undefined
        }

        const marker = new AMapInstance.Marker({
          position: [finalLng, finalLat],
          title: location.name,
          ...(labelOffset && {
            label: {
              content: `${location.day}-${location.activityIndex}`,
              offset: labelOffset,
              direction: 'right'
            }
          })
          // 使用默认图标，不传 icon 参数
        })

        // 添加信息窗口
        let infoWindowOffset
        try {
          infoWindowOffset = new AMapInstance.Pixel(0, -30)
        } catch (pixelError) {
          console.error(`[TripMap] 创建 InfoWindow Pixel 对象失败:`, pixelError)
          infoWindowOffset = undefined
        }

        const infoWindow = new AMapInstance.InfoWindow({
          content: `
            <div style="padding: 10px;">
              <h4 style="margin: 0 0 5px 0;">${location.name}</h4>
              <p style="margin: 0; color: #666; font-size: 12px;">${location.address}</p>
              <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">第 ${location.day} 天 - 活动 ${location.activityIndex}</p>
            </div>
          `,
          ...(infoWindowOffset && { offset: infoWindowOffset })
        })

        marker.on('click', () => {
          infoWindow.open(mapInstance, marker.getPosition())
        })

        mapInstance.add(marker)
        markersRef.current.push(marker)
      } catch (error: any) {
        console.error(`[TripMap] 添加标记点失败: ${location.name}`, error)
        console.error(`[TripMap] 错误详情:`, {
          location,
          coordinates: location.coordinates,
          errorMessage: error?.message,
          errorStack: error?.stack
        })
        // 继续处理下一个地点，不中断整个流程
      }
    })

    // 绘制路线（连接同一天的地点）
    if (locationsToShow.length > 1) {
      drawRoutes(mapInstance, AMapInstance, locationsToShow)
    }

    // 调整地图视野以包含所有标记
    if (markersRef.current.length > 0) {
      mapInstance.setFitView(markersRef.current, false, [50, 50, 50, 50])
    }
  }


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

      // 过滤并验证坐标有效性
      const path = dayLocations
        .filter((loc: any) => loc.coordinates && isValidCoordinates(loc.coordinates))
        .map((loc: any) => {
          const { lng, lat } = loc.coordinates
          // 再次验证坐标值
          if (!isValidCoordinate(lng) || !isValidCoordinate(lat)) {
            console.warn(`[TripMap] 路线绘制跳过无效坐标: ${loc.name}`, { lng, lat })
            return null
          }
          return [lng, lat]
        })
        .filter((point: any) => {
          // 严格验证每个点
          if (!point || !Array.isArray(point) || point.length !== 2) {
            return false
          }
          const [lng, lat] = point
          return isValidCoordinate(lng) && isValidCoordinate(lat)
        })

      if (path.length < 2) {
        console.warn(`[TripMap] 路线绘制跳过：有效点数量不足 (${path.length} < 2)`)
        return
      }

      // 最终验证：确保 path 中所有点都有效
      const validPath = path.filter((point: any) => {
        const [lng, lat] = point
        const isValid = isValidCoordinate(lng) && isValidCoordinate(lat)
        if (!isValid) {
          console.warn(`[TripMap] 路线绘制过滤无效点:`, point)
        }
        return isValid
      })

      if (validPath.length < 2) {
        console.warn(`[TripMap] 路线绘制跳过：验证后有效点数量不足 (${validPath.length} < 2)`)
        return
      }

      console.log(`[TripMap] 绘制路线，共 ${validPath.length} 个有效点`)

      try {
        const polyline = new AMapInstance.Polyline({
          path: validPath,
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
      } catch (error: any) {
        console.error(`[TripMap] 绘制路线失败:`, error)
        console.error(`[TripMap] 路线路径:`, validPath)
        console.error(`[TripMap] 错误详情:`, {
          errorMessage: error?.message,
          errorStack: error?.stack,
          pathLength: validPath.length,
          firstPoint: validPath[0],
          lastPoint: validPath[validPath.length - 1]
        })
        // 不抛出错误，继续处理其他路线
      }
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
      {isConfigured && (loading || geocodingLoading) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(245, 245, 245, 0.95)',
          zIndex: 10
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: '24px', 
            background: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxWidth: '400px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
              {geocodingLoading ? '正在地理编码地址...' : '正在加载地图...'}
            </p>
            {geocodingLoading && rawLocations.length > 0 && (
              <div style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                <p style={{ margin: '0 0 4px 0' }}>
                  共 {rawLocations.filter(loc => loc.needGeocode && !loc.coordinates).length} 个地址需要编码
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                  为避免 API 限流，每个地址间隔 2 秒处理
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#ff9800' }}>
                  ⚠️ 如果遇到限流错误，系统会自动重试（最多 5 次）
                </p>
              </div>
            )}
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
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '24px',
          borderRadius: '8px',
          textAlign: 'center',
          zIndex: 1000,
          maxWidth: '400px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>暂无地点信息</h3>
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
            行程中的活动需要包含位置坐标才能在地图上显示
          </p>
          <p style={{ margin: '0', color: '#999', fontSize: '12px' }}>
            请检查控制台日志查看详细数据
          </p>
        </div>
      )}
    </div>
  )
}

export default TripMap
