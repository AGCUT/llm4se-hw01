// 地图服务 - 高德地图 API 封装
import AMapLoader from '@amap/amap-jsapi-loader'
import { AMAP_CONFIG } from '@/config/amap.config'

// 高德地图类型声明
declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: {
      securityJsCode: string
    }
  }
}

// 地图实例缓存
let mapInstance: any = null
let AMap: any = null

// 地理编码缓存（避免重复编码同一个地址）
const geocodeCache = new Map<string, { lng: number; lat: number } | null>()

/**
 * 初始化高德地图
 * @returns Promise<{ AMap, map }>
 */
export const initAMap = async (containerId: string, options?: any) => {
  try {
    // 检查容器元素是否存在
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Map container div not exist: ${containerId}`)
    }

    // 如果已经加载过，直接使用
    if (AMap && mapInstance) {
      return { AMap, map: mapInstance }
    }

    // 检查 API Key
    if (!AMAP_CONFIG.key) {
      throw new Error('高德地图 API Key 未配置，请在 .env.local 文件中设置 VITE_AMAP_KEY')
    }

    console.log('开始加载高德地图 API...')

    // 加载高德地图 API
    AMap = await AMapLoader.load({
      key: AMAP_CONFIG.key,
      version: AMAP_CONFIG.version || '2.0',
      plugins: AMAP_CONFIG.plugins || ['AMap.Marker', 'AMap.Polyline', 'AMap.Driving', 'AMap.Geocoder']
    })

    console.log('高德地图 API 加载成功')

    // 再次检查容器（可能在加载 API 期间被移除）
    const containerCheck = document.getElementById(containerId)
    if (!containerCheck) {
      throw new Error(`Map container div not exist: ${containerId}`)
    }

    // 创建地图实例
    const map = new AMap.Map(containerId, {
      zoom: options?.zoom || 12,
      center: options?.center || [116.397428, 39.90923], // 默认北京
      viewMode: '3D', // 3D视图
      mapStyle: 'amap://styles/normal', // 地图样式
      ...options
    })

    mapInstance = map

    return { AMap, map }
  } catch (error: any) {
    console.error('初始化高德地图失败:', error)
    throw new Error(`初始化高德地图失败: ${error.message}`)
  }
}

/**
 * 地理编码 - 将地址转换为坐标
 * 使用高德地图 Web 服务 API（更可靠）
 * @param address 地址
 * @param amapInstance 可选的 AMap 实例（保留参数以兼容旧代码）
 */
export const geocode = async (address: string, amapInstance?: any): Promise<{ lng: number; lat: number } | null> => {
  try {
    console.log(`[geocode] 开始地理编码: ${address}`)
    
    // 检查缓存
    if (geocodeCache.has(address)) {
      const cached = geocodeCache.get(address)
      console.log(`[geocode] ✅ 使用缓存: ${address} ->`, cached)
      return cached || null
    }
    
    // 获取 API Key
    const apiKey = import.meta.env.VITE_AMAP_KEY || AMAP_CONFIG.key
    if (!apiKey) {
      console.error('[geocode] ⚠️ 高德地图 API Key 未配置')
      geocodeCache.set(address, null)
      return null
    }
    
    console.log(`[geocode] API Key 已配置: ${apiKey.substring(0, 10)}...`)

    // 使用高德地图 Web 服务 API 进行地理编码
    // 文档：https://lbs.amap.com/api/webservice/guide/api/georegeo
    const url = `https://restapi.amap.com/v3/geocode/geo`
    const params = new URLSearchParams({
      key: apiKey,
      address: address,
      output: 'JSON'
    })

    const fullUrl = `${url}?${params.toString()}`
    console.log(`[geocode] 调用 Web 服务 API: ${fullUrl}`)
    console.log(`[geocode] 请求参数: address=${address}, key=${apiKey.substring(0, 10)}...`)

    try {
      console.log(`[geocode] 开始发送 fetch 请求...`)
      const fetchStartTime = Date.now()
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const fetchDuration = Date.now() - fetchStartTime
      console.log(`[geocode] fetch 请求完成，耗时: ${fetchDuration}ms`)
      console.log(`[geocode] 响应状态: ${response.status} ${response.statusText}`)
      console.log(`[geocode] 响应头:`, Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        console.error(`[geocode] ⚠️ HTTP 错误: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`[geocode] 错误内容:`, errorText)
        return null
      }

      console.log(`[geocode] 开始解析响应 JSON...`)
      const data = await response.json()
      console.log(`[geocode] 响应数据:`, data)
      console.log(`[geocode] 响应数据 status:`, data.status)
      console.log(`[geocode] 响应数据 info:`, data.info)
      console.log(`[geocode] 响应数据 count:`, data.count)
      console.log(`[geocode] 响应数据 geocodes:`, data.geocodes)

      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const geocode = data.geocodes[0]
        console.log(`[geocode] 第一个 geocode:`, geocode)
        const location = geocode.location // 格式: "lng,lat"
        console.log(`[geocode] location 字符串:`, location)
        
        if (location) {
          const [lng, lat] = location.split(',').map(Number)
          console.log(`[geocode] 解析后的坐标: lng=${lng}, lat=${lat}`)
          
          if (!isNaN(lng) && !isNaN(lat)) {
            console.log(`[geocode] ✅ 地理编码成功: ${address} ->`, { lng, lat })
            // 缓存结果
            geocodeCache.set(address, { lng, lat })
            return { lng, lat }
          } else {
            console.error(`[geocode] ❌ 坐标解析失败: lng=${lng}, lat=${lat}`)
            geocodeCache.set(address, null)
            return null
          }
        } else {
          console.error(`[geocode] ❌ location 为空`)
          geocodeCache.set(address, null)
          return null
        }
      } else {
        // 检查是否是限流错误
        if (data.status === '0' && data.info) {
          // 检查各种限流错误码
          const isRateLimitError = data.info.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                  data.info.includes('CUQPS') ||
                                  data.info.includes('EXCEEDED') ||
                                  data.info.includes('限流') ||
                                  data.info.includes('QPS')
          
          if (isRateLimitError) {
            console.error(`[geocode] ❌ 地理编码限流错误: ${address}`, {
              status: data.status,
              info: data.info,
              count: data.count
            })
            // 抛出限流错误，让调用者可以重试
            throw new Error(`地理编码限流: ${data.info}`)
          }
        }
        
        console.warn(`[geocode] ⚠️ 地理编码失败: ${address}`, {
          status: data.status,
          info: data.info,
          count: data.count,
          geocodes: data.geocodes
        })
        // 缓存失败结果（避免重复请求）
        geocodeCache.set(address, null)
        return null
      }
    } catch (fetchError: any) {
      console.error(`[geocode] ❌ 网络请求异常: ${address}`, fetchError)
      console.error(`[geocode] 错误类型:`, fetchError?.constructor?.name)
      console.error(`[geocode] 错误消息:`, fetchError?.message)
      console.error(`[geocode] 错误堆栈:`, fetchError?.stack)
      // 网络错误不缓存，允许重试
      throw fetchError
    }
  } catch (error: any) {
    console.error(`[geocode] ❌ 地理编码错误: ${address}`, error)
    // 限流错误抛出，其他错误返回 null
    if (error?.message?.includes('限流') || error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT')) {
      throw error
    }
    return null
  }
}

/**
 * 逆地理编码 - 将坐标转换为地址
 */
export const reverseGeocode = async (lng: number, lat: number): Promise<string | null> => {
  try {
    if (!AMap) {
      await initAMap('temp-container')
    }

    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder()

      geocoder.getAddress([lng, lat], (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          resolve(result.regeocode.formattedAddress)
        } else {
          console.warn('逆地理编码失败:', lng, lat, result)
          resolve(null)
        }
      })
    })
  } catch (error: any) {
    console.error('逆地理编码错误:', error)
    return null
  }
}

/**
 * 路线规划 - 驾车路线（使用 Web 服务 API）
 * 文档：https://lbs.amap.com/api/webservice/guide/api/direction
 */
export interface RouteResult {
  distance: number // 距离（米）
  duration: number // 时间（秒）
  tolls: number // 过路费（元）
  tollDistance: number // 收费路段距离（米）
  paths: Array<{
    distance: number
    duration: number
    tolls: number
    tollDistance: number
    steps: Array<{
      instruction: string
      road: string
      distance: number
      duration: number
      polyline: string
    }>
  }>
}

export const planRoute = async (
  start: { lng: number; lat: number } | string,
  end: { lng: number; lat: number } | string
): Promise<RouteResult | null> => {
  try {
    console.log(`[planRoute] 开始路径规划`)
    
    // 获取 API Key
    const apiKey = import.meta.env.VITE_AMAP_KEY || AMAP_CONFIG.key
    if (!apiKey) {
      console.error('[planRoute] ⚠️ 高德地图 API Key 未配置')
      return null
    }
    
    // 处理起点和终点（可能是坐标对象或地址字符串）
    let startStr: string
    let endStr: string
    
    if (typeof start === 'string') {
      startStr = start
    } else {
      startStr = `${start.lng},${start.lat}`
    }
    
    if (typeof end === 'string') {
      endStr = end
    } else {
      endStr = `${end.lng},${end.lat}`
    }
    
    console.log(`[planRoute] 起点: ${startStr}, 终点: ${endStr}`)
    
    // 使用高德地图 Web 服务 API 进行路径规划
    // 文档：https://lbs.amap.com/api/webservice/guide/api/direction
    const url = `https://restapi.amap.com/v3/direction/driving`
    const params = new URLSearchParams({
      key: apiKey,
      origin: startStr,
      destination: endStr,
      extensions: 'all', // 返回详细信息
      output: 'JSON'
    })

    const fullUrl = `${url}?${params.toString()}`
    console.log(`[planRoute] 调用 Web 服务 API: ${fullUrl}`)

    try {
      console.log(`[planRoute] 开始发送 fetch 请求...`)
      const fetchStartTime = Date.now()
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const fetchDuration = Date.now() - fetchStartTime
      console.log(`[planRoute] fetch 请求完成，耗时: ${fetchDuration}ms`)
      console.log(`[planRoute] 响应状态: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        console.error(`[planRoute] ⚠️ HTTP 错误: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`[planRoute] 错误内容:`, errorText)
        return null
      }

      console.log(`[planRoute] 开始解析响应 JSON...`)
      const data = await response.json()
      console.log(`[planRoute] 响应数据:`, data)
      console.log(`[planRoute] 响应数据 status:`, data.status)
      console.log(`[planRoute] 响应数据 info:`, data.info)

      if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
        const path = data.route.paths[0] // 使用第一条路径
        const route: RouteResult = {
          distance: path.distance || 0,
          duration: path.duration || 0,
          tolls: path.tolls || 0,
          tollDistance: path.tollDistance || 0,
          paths: data.route.paths.map((p: any) => ({
            distance: p.distance || 0,
            duration: p.duration || 0,
            tolls: p.tolls || 0,
            tollDistance: p.tollDistance || 0,
            steps: p.steps?.map((step: any) => ({
              instruction: step.instruction || '',
              road: step.road || '',
              distance: step.distance || 0,
              duration: step.duration || 0,
              polyline: step.polyline || ''
            })) || []
          }))
        }
        
        console.log(`[planRoute] ✅ 路径规划成功:`, {
          distance: route.distance,
          duration: route.duration,
          tolls: route.tolls
        })
        return route
      } else {
        console.warn(`[planRoute] ⚠️ 路径规划失败:`, {
          status: data.status,
          info: data.info
        })
        return null
      }
    } catch (fetchError: any) {
      console.error(`[planRoute] ❌ 网络请求异常:`, fetchError)
      console.error(`[planRoute] 错误类型:`, fetchError?.constructor?.name)
      console.error(`[planRoute] 错误消息:`, fetchError?.message)
      console.error(`[planRoute] 错误堆栈:`, fetchError?.stack)
      return null
    }
  } catch (error: any) {
    console.error(`[planRoute] ❌ 路径规划错误:`, error)
    return null
  }
}

/**
 * 检查高德地图是否已配置
 */
export const isAMapConfigured = (): boolean => {
  return !!AMAP_CONFIG.key && AMAP_CONFIG.key !== ''
}

/**
 * 销毁地图实例
 */
export const destroyMap = () => {
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
}
