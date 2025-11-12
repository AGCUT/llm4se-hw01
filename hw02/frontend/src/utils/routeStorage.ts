// 路径数据本地存储管理
import type { RouteResult, RouteType } from '@/services/mapService'

interface RouteCache {
  route: RouteResult
  routeType: RouteType // 路线类型
  timestamp: number // 缓存时间戳
  tripId: string
  day: number
  startIndex: number
  endIndex: number
}

const STORAGE_KEY_PREFIX = 'trip_route_'

/**
 * 生成路径缓存 Key（包含路线类型）
 */
const getRouteKey = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number,
  routeType: RouteType = 'driving' // 默认驾车
): string => {
  return `${STORAGE_KEY_PREFIX}${tripId}_${day}_${startIndex}_${endIndex}_${routeType}`
}

/**
 * 保存路径到本地存储
 */
export const saveRoute = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number,
  route: RouteResult,
  routeType?: RouteType // 可选，如果不提供则从 route.type 获取
): void => {
  try {
    const type = routeType || route.type || 'driving'
    const key = getRouteKey(tripId, day, startIndex, endIndex, type)
    const cache: RouteCache = {
      route,
      routeType: type,
      timestamp: Date.now(),
      tripId,
      day,
      startIndex,
      endIndex
    }
    localStorage.setItem(key, JSON.stringify(cache))
    console.log(`[routeStorage] ✅ 路径已保存: ${key} (类型: ${type})`)
  } catch (error) {
    console.error(`[routeStorage] ❌ 保存路径失败:`, error)
  }
}

/**
 * 从本地存储读取路径
 */
export const loadRoute = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number,
  routeType: RouteType = 'driving' // 默认驾车
): RouteResult | null => {
  try {
    const key = getRouteKey(tripId, day, startIndex, endIndex, routeType)
    const cached = localStorage.getItem(key)
    
    if (!cached) {
      console.log(`[routeStorage] 未找到缓存: ${key} (类型: ${routeType})`)
      return null
    }
    
    const cache: RouteCache = JSON.parse(cached)
    
    // 检查缓存是否过期（7天）
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7天
    const now = Date.now()
    if (now - cache.timestamp > CACHE_EXPIRY) {
      console.log(`[routeStorage] 缓存已过期: ${key}`)
      localStorage.removeItem(key)
      return null
    }
    
    console.log(`[routeStorage] ✅ 从缓存读取路径: ${key} (类型: ${cache.routeType})`)
    return cache.route
  } catch (error) {
    console.error(`[routeStorage] ❌ 读取路径失败:`, error)
    return null
  }
}

/**
 * 从本地存储读取所有类型的路径
 */
export const loadAllRoutes = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number
): Record<RouteType, RouteResult | null> => {
  const routes: Record<RouteType, RouteResult | null> = {
    driving: null,
    walking: null,
    transit: null
  }
  
  const routeTypes: RouteType[] = ['driving', 'walking', 'transit']
  
  routeTypes.forEach(type => {
    const route = loadRoute(tripId, day, startIndex, endIndex, type)
    if (route) {
      routes[type] = route
    }
  })
  
  return routes
}

/**
 * 检查路径是否已缓存
 */
export const hasRoute = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number,
  routeType: RouteType = 'driving' // 默认驾车
): boolean => {
  const route = loadRoute(tripId, day, startIndex, endIndex, routeType)
  return route !== null
}

/**
 * 删除路径缓存
 */
export const deleteRoute = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number,
  routeType?: RouteType // 可选，如果不提供则删除所有类型
): void => {
  try {
    if (routeType) {
      // 删除特定类型的路径
      const key = getRouteKey(tripId, day, startIndex, endIndex, routeType)
      localStorage.removeItem(key)
      console.log(`[routeStorage] ✅ 路径缓存已删除: ${key} (类型: ${routeType})`)
    } else {
      // 删除所有类型的路径
      const routeTypes: RouteType[] = ['driving', 'walking', 'transit']
      routeTypes.forEach(type => {
        const key = getRouteKey(tripId, day, startIndex, endIndex, type)
        localStorage.removeItem(key)
      })
      console.log(`[routeStorage] ✅ 所有类型的路径缓存已删除: ${tripId}_${day}_${startIndex}_${endIndex}`)
    }
  } catch (error) {
    console.error(`[routeStorage] ❌ 删除路径缓存失败:`, error)
  }
}

/**
 * 清除所有路径缓存（可选：仅清除特定行程的缓存）
 */
export const clearAllRoutes = (tripId?: string): void => {
  try {
    if (tripId) {
      // 清除特定行程的所有路径缓存
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX) && key.includes(tripId)) {
          localStorage.removeItem(key)
        }
      })
      console.log(`[routeStorage] ✅ 已清除行程 ${tripId} 的所有路径缓存`)
    } else {
      // 清除所有路径缓存
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
      console.log(`[routeStorage] ✅ 已清除所有路径缓存`)
    }
  } catch (error) {
    console.error(`[routeStorage] ❌ 清除路径缓存失败:`, error)
  }
}

