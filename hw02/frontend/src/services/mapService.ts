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
 * 路线规划 - 基础接口
 * 文档：https://lbs.amap.com/api/webservice/guide/api/direction
 */
export type RouteType = 'driving' | 'walking' | 'transit'

// 路线步骤（通用）
export interface RouteStep {
  instruction: string // 步骤说明
  road: string // 道路名称
  distance: number // 距离（米）
  duration: number // 时间（秒）
  polyline: string // 路线坐标点
  action?: string // 动作（如：左转、右转、直行等）
  assist_action?: string // 辅助动作
}

// 公共交通换乘信息
export interface TransitSegment {
  walking?: {
    distance: number
    duration: number
    steps: RouteStep[]
  }
  bus?: {
    buslines: Array<{
      name: string // 公交线路名称
      type: string // 公交类型（地铁、公交等）
      departure_stop: {
        name: string
        location: string
      }
      arrival_stop: {
        name: string
        location: string
      }
      departure_time: string
      arrival_time: string
      via_stops: Array<{
        name: string
        location: string
      }>
      distance: number
      duration: number
    }>
  }
  entrance?: {
    name: string
    location: string
  }
  exit?: {
    name: string
    location: string
  }
}

// 驾车路线结果
export interface DrivingRouteResult {
  type: 'driving'
  distance: number // 距离（米）
  duration: number // 时间（秒）
  tolls: number // 过路费（元）
  tollDistance: number // 收费路段距离（米）
  paths: Array<{
    distance: number
    duration: number
    tolls: number
    tollDistance: number
    steps: RouteStep[]
  }>
}

// 步行路线结果
export interface WalkingRouteResult {
  type: 'walking'
  distance: number // 距离（米）
  duration: number // 时间（秒）
  paths: Array<{
    distance: number
    duration: number
    steps: RouteStep[]
  }>
}

// 公共交通路线结果
export interface TransitRouteResult {
  type: 'transit'
  distance: number // 距离（米）
  duration: number // 时间（秒）
  cost: number // 费用（元）
  nightflag: boolean // 是否夜班车
  walking_distance: number // 总步行距离（米）
  transits: Array<{
    cost: number // 费用（元）
    duration: number // 时间（秒）
    nightflag: boolean // 是否夜班车
    walking_distance: number // 步行距离（米）
    distance: number // 总距离（米）
    segments: TransitSegment[] // 换乘段
  }>
}

// 路线结果（联合类型）
export type RouteResult = DrivingRouteResult | WalkingRouteResult | TransitRouteResult

/**
 * 路线规划 - 驾车路线（使用 Web 服务 API）
 * 文档：https://lbs.amap.com/api/webservice/guide/api/direction#driving
 */
export const planDrivingRoute = async (
  start: { lng: number; lat: number } | string,
  end: { lng: number; lat: number } | string
): Promise<DrivingRouteResult | null> => {
  try {
    console.log(`[planDrivingRoute] 开始驾车路线规划`)
    
    // 获取 API Key
    const apiKey = import.meta.env.VITE_AMAP_KEY || AMAP_CONFIG.key
    if (!apiKey) {
      console.error('[planDrivingRoute] ⚠️ 高德地图 API Key 未配置')
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
    
    console.log(`[planDrivingRoute] 起点: ${startStr}, 终点: ${endStr}`)
    
    // 使用高德地图 Web 服务 API 进行驾车路线规划
    // 文档：https://lbs.amap.com/api/webservice/guide/api/direction#driving
    const url = `https://restapi.amap.com/v3/direction/driving`
    const params = new URLSearchParams({
      key: apiKey,
      origin: startStr,
      destination: endStr,
      extensions: 'all', // 返回详细信息
      output: 'JSON'
    })

    const fullUrl = `${url}?${params.toString()}`
    console.log(`[planDrivingRoute] 调用 Web 服务 API: ${fullUrl}`)

    try {
      console.log(`[planDrivingRoute] 开始发送 fetch 请求...`)
      const fetchStartTime = Date.now()
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const fetchDuration = Date.now() - fetchStartTime
      console.log(`[planDrivingRoute] fetch 请求完成，耗时: ${fetchDuration}ms`)
      console.log(`[planDrivingRoute] 响应状态: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        console.error(`[planDrivingRoute] ⚠️ HTTP 错误: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`[planDrivingRoute] 错误内容:`, errorText)
        return null
      }

      console.log(`[planDrivingRoute] 开始解析响应 JSON...`)
      const data = await response.json()
      console.log(`[planDrivingRoute] 响应数据:`, data)
      console.log(`[planDrivingRoute] 响应数据 status:`, data.status)
      console.log(`[planDrivingRoute] 响应数据 info:`, data.info)

      if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
        const path = data.route.paths[0] // 使用第一条路径
        const route: DrivingRouteResult = {
          type: 'driving',
          distance: Number(path.distance) || 0,
          duration: Number(path.duration) || 0,
          tolls: Number(path.tolls) || 0,
          tollDistance: Number(path.tollDistance) || 0,
          paths: data.route.paths.map((p: any) => ({
            distance: Number(p.distance) || 0,
            duration: Number(p.duration) || 0,
            tolls: Number(p.tolls) || 0,
            tollDistance: Number(p.tollDistance) || 0,
            steps: p.steps?.map((step: any) => ({
              instruction: step.instruction || '',
              road: step.road || '',
              distance: Number(step.distance) || 0,
              duration: Number(step.duration) || 0,
              polyline: step.polyline || '',
              action: step.action || '',
              assist_action: step.assist_action || ''
            })) || []
          }))
        }
        
        console.log(`[planDrivingRoute] ✅ 驾车路线规划成功:`, {
          distance: route.distance,
          duration: route.duration,
          tolls: route.tolls
        })
        return route
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
            console.error(`[planDrivingRoute] ❌ 驾车路线规划限流错误:`, {
              status: data.status,
              info: data.info
            })
            // 抛出限流错误，让调用者可以重试
            throw new Error(`驾车路线规划限流: ${data.info}`)
          }
        }
        
        console.warn(`[planDrivingRoute] ⚠️ 驾车路线规划失败:`, {
          status: data.status,
          info: data.info
        })
        return null
      }
    } catch (fetchError: any) {
      console.error(`[planDrivingRoute] ❌ 网络请求异常:`, fetchError)
      console.error(`[planDrivingRoute] 错误类型:`, fetchError?.constructor?.name)
      console.error(`[planDrivingRoute] 错误消息:`, fetchError?.message)
      console.error(`[planDrivingRoute] 错误堆栈:`, fetchError?.stack)
      // 如果是限流错误，重新抛出；否则返回 null
      if (fetchError?.message?.includes('限流') || 
          fetchError?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
          fetchError?.message?.includes('EXCEEDED')) {
        throw fetchError
      }
      return null
    }
  } catch (error: any) {
    console.error(`[planDrivingRoute] ❌ 驾车路线规划错误:`, error)
    // 如果是限流错误，重新抛出；否则返回 null
    if (error?.message?.includes('限流') || 
        error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
        error?.message?.includes('EXCEEDED')) {
      throw error
    }
    return null
  }
}

/**
 * 路线规划 - 步行路线（使用 Web 服务 API）
 * 文档：https://lbs.amap.com/api/webservice/guide/api/direction#walking
 */
export const planWalkingRoute = async (
  start: { lng: number; lat: number } | string,
  end: { lng: number; lat: number } | string
): Promise<WalkingRouteResult | null> => {
  try {
    console.log(`[planWalkingRoute] 开始步行路线规划`)
    
    // 获取 API Key
    const apiKey = import.meta.env.VITE_AMAP_KEY || AMAP_CONFIG.key
    if (!apiKey) {
      console.error('[planWalkingRoute] ⚠️ 高德地图 API Key 未配置')
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
    
    console.log(`[planWalkingRoute] 起点: ${startStr}, 终点: ${endStr}`)
    
    // 使用高德地图 Web 服务 API 进行步行路线规划
    // 文档：https://lbs.amap.com/api/webservice/guide/api/direction#walking
    const url = `https://restapi.amap.com/v3/direction/walking`
    const params = new URLSearchParams({
      key: apiKey,
      origin: startStr,
      destination: endStr,
      extensions: 'all', // 返回详细信息
      output: 'JSON'
    })

    const fullUrl = `${url}?${params.toString()}`
    console.log(`[planWalkingRoute] 调用 Web 服务 API: ${fullUrl}`)

    try {
      console.log(`[planWalkingRoute] 开始发送 fetch 请求...`)
      const fetchStartTime = Date.now()
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const fetchDuration = Date.now() - fetchStartTime
      console.log(`[planWalkingRoute] fetch 请求完成，耗时: ${fetchDuration}ms`)
      console.log(`[planWalkingRoute] 响应状态: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        console.error(`[planWalkingRoute] ⚠️ HTTP 错误: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`[planWalkingRoute] 错误内容:`, errorText)
        return null
      }

      console.log(`[planWalkingRoute] 开始解析响应 JSON...`)
      const data = await response.json()
      console.log(`[planWalkingRoute] 响应数据:`, data)
      console.log(`[planWalkingRoute] 响应数据 status:`, data.status)
      console.log(`[planWalkingRoute] 响应数据 info:`, data.info)

      if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
        const path = data.route.paths[0] // 使用第一条路径
        const route: WalkingRouteResult = {
          type: 'walking',
          distance: Number(path.distance) || 0,
          duration: Number(path.duration) || 0,
          paths: data.route.paths.map((p: any) => ({
            distance: Number(p.distance) || 0,
            duration: Number(p.duration) || 0,
            steps: p.steps?.map((step: any) => ({
              instruction: step.instruction || '',
              road: step.road || '',
              distance: Number(step.distance) || 0,
              duration: Number(step.duration) || 0,
              polyline: step.polyline || '',
              action: step.action || '',
              assist_action: step.assist_action || ''
            })) || []
          }))
        }
        
        console.log(`[planWalkingRoute] ✅ 步行路线规划成功:`, {
          distance: route.distance,
          duration: route.duration
        })
        return route
      } else {
        // 检查是否是限流错误
        if (data.status === '0' && data.info) {
          const isRateLimitError = data.info.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                  data.info.includes('CUQPS') ||
                                  data.info.includes('EXCEEDED') ||
                                  data.info.includes('限流') ||
                                  data.info.includes('QPS')
          
          if (isRateLimitError) {
            console.error(`[planWalkingRoute] ❌ 步行路线规划限流错误:`, {
              status: data.status,
              info: data.info
            })
            throw new Error(`步行路线规划限流: ${data.info}`)
          }
        }
        
        console.warn(`[planWalkingRoute] ⚠️ 步行路线规划失败:`, {
          status: data.status,
          info: data.info
        })
        return null
      }
    } catch (fetchError: any) {
      console.error(`[planWalkingRoute] ❌ 网络请求异常:`, fetchError)
      if (fetchError?.message?.includes('限流') || 
          fetchError?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
          fetchError?.message?.includes('EXCEEDED')) {
        throw fetchError
      }
      return null
    }
  } catch (error: any) {
    console.error(`[planWalkingRoute] ❌ 步行路线规划错误:`, error)
    if (error?.message?.includes('限流') || 
        error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
        error?.message?.includes('EXCEEDED')) {
      throw error
    }
    return null
  }
}

/**
 * 路线规划 - 公共交通路线（使用 Web 服务 API）
 * 文档：https://lbs.amap.com/api/webservice/guide/api/direction#transit
 */
export const planTransitRoute = async (
  start: { lng: number; lat: number } | string,
  end: { lng: number; lat: number } | string,
  city?: string // 城市代码或名称（可选，建议提供以提高准确性）
): Promise<TransitRouteResult | null> => {
  try {
    console.log(`[planTransitRoute] 开始公共交通路线规划`)
    
    // 获取 API Key
    const apiKey = import.meta.env.VITE_AMAP_KEY || AMAP_CONFIG.key
    if (!apiKey) {
      console.error('[planTransitRoute] ⚠️ 高德地图 API Key 未配置')
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
    
    console.log(`[planTransitRoute] 起点: ${startStr}, 终点: ${endStr}, 城市: ${city || '未指定'}`)
    
    // 使用高德地图 Web 服务 API 进行公共交通路线规划
    // 文档：https://lbs.amap.com/api/webservice/guide/api/direction#transit
    const url = `https://restapi.amap.com/v3/direction/transit/integrated`
    const params = new URLSearchParams({
      key: apiKey,
      origin: startStr,
      destination: endStr,
      city: city || '全国', // 默认全国，建议提供具体城市
      cityd: city || '', // 目的地城市
      extensions: 'all', // 返回详细信息
      output: 'JSON',
      strategy: '0' // 0: 最快捷模式, 1: 最经济模式, 2: 最少换乘, 3: 最少步行, 5: 不乘地铁
    })

    const fullUrl = `${url}?${params.toString()}`
    console.log(`[planTransitRoute] 调用 Web 服务 API: ${fullUrl}`)

    try {
      console.log(`[planTransitRoute] 开始发送 fetch 请求...`)
      const fetchStartTime = Date.now()
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const fetchDuration = Date.now() - fetchStartTime
      console.log(`[planTransitRoute] fetch 请求完成，耗时: ${fetchDuration}ms`)
      console.log(`[planTransitRoute] 响应状态: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        console.error(`[planTransitRoute] ⚠️ HTTP 错误: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`[planTransitRoute] 错误内容:`, errorText)
        return null
      }

      console.log(`[planTransitRoute] 开始解析响应 JSON...`)
      const data = await response.json()
      console.log(`[planTransitRoute] 响应数据:`, data)
      console.log(`[planTransitRoute] 响应数据 status:`, data.status)
      console.log(`[planTransitRoute] 响应数据 info:`, data.info)

      if (data.status === '1' && data.route && data.route.transits && data.route.transits.length > 0) {
        const transit = data.route.transits[0] // 使用第一条路线
        const route: TransitRouteResult = {
          type: 'transit',
          distance: Number(transit.distance) || 0,
          duration: Number(transit.duration) || 0,
          cost: Number(transit.cost) || 0,
          nightflag: transit.nightflag || false,
          walking_distance: Number(transit.walking_distance) || 0,
          transits: data.route.transits.map((t: any) => ({
            cost: Number(t.cost) || 0,
            duration: Number(t.duration) || 0,
            nightflag: t.nightflag || false,
            walking_distance: Number(t.walking_distance) || 0,
            distance: Number(t.distance) || 0,
            segments: t.segments?.map((segment: any) => {
              const transitSegment: TransitSegment = {}
              
              // 步行段
              if (segment.walking) {
                transitSegment.walking = {
                  distance: Number(segment.walking.distance) || 0,
                  duration: Number(segment.walking.duration) || 0,
                  steps: segment.walking.steps?.map((step: any) => ({
                    instruction: step.instruction || '',
                    road: step.road || '',
                    distance: Number(step.distance) || 0,
                    duration: Number(step.duration) || 0,
                    polyline: step.polyline || '',
                    action: step.action || '',
                    assist_action: step.assist_action || ''
                  })) || []
                }
              }
              
              // 公交段
              if (segment.bus && segment.bus.buslines) {
                transitSegment.bus = {
                  buslines: segment.bus.buslines.map((busline: any) => ({
                    name: busline.name || '',
                    type: busline.type || '',
                    departure_stop: {
                      name: busline.departure_stop?.name || '',
                      location: busline.departure_stop?.location || ''
                    },
                    arrival_stop: {
                      name: busline.arrival_stop?.name || '',
                      location: busline.arrival_stop?.location || ''
                    },
                    departure_time: busline.departure_time || '',
                    arrival_time: busline.arrival_time || '',
                    via_stops: busline.via_stops?.map((stop: any) => ({
                      name: stop.name || '',
                      location: stop.location || ''
                    })) || [],
                    distance: Number(busline.distance) || 0,
                    duration: Number(busline.duration) || 0
                  }))
                }
              }
              
              // 地铁入口/出口
              if (segment.entrance) {
                transitSegment.entrance = {
                  name: segment.entrance.name || '',
                  location: segment.entrance.location || ''
                }
              }
              
              if (segment.exit) {
                transitSegment.exit = {
                  name: segment.exit.name || '',
                  location: segment.exit.location || ''
                }
              }
              
              return transitSegment
            }) || []
          }))
        }
        
        console.log(`[planTransitRoute] ✅ 公共交通路线规划成功:`, {
          distance: route.distance,
          duration: route.duration,
          cost: route.cost,
          walking_distance: route.walking_distance
        })
        return route
      } else {
        // 检查是否是限流错误
        if (data.status === '0' && data.info) {
          const isRateLimitError = data.info.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
                                  data.info.includes('CUQPS') ||
                                  data.info.includes('EXCEEDED') ||
                                  data.info.includes('限流') ||
                                  data.info.includes('QPS')
          
          if (isRateLimitError) {
            console.error(`[planTransitRoute] ❌ 公共交通路线规划限流错误:`, {
              status: data.status,
              info: data.info
            })
            throw new Error(`公共交通路线规划限流: ${data.info}`)
          }
        }
        
        console.warn(`[planTransitRoute] ⚠️ 公共交通路线规划失败:`, {
          status: data.status,
          info: data.info
        })
        return null
      }
    } catch (fetchError: any) {
      console.error(`[planTransitRoute] ❌ 网络请求异常:`, fetchError)
      if (fetchError?.message?.includes('限流') || 
          fetchError?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
          fetchError?.message?.includes('EXCEEDED')) {
        throw fetchError
      }
      return null
    }
  } catch (error: any) {
    console.error(`[planTransitRoute] ❌ 公共交通路线规划错误:`, error)
    if (error?.message?.includes('限流') || 
        error?.message?.includes('CUQPS_HAS_EXCEEDED_THE_LIMIT') ||
        error?.message?.includes('EXCEEDED')) {
      throw error
    }
    return null
  }
}

/**
 * 路线规划 - 通用接口（兼容旧代码）
 * @deprecated 请使用 planDrivingRoute, planWalkingRoute, planTransitRoute
 */
export const planRoute = planDrivingRoute

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
