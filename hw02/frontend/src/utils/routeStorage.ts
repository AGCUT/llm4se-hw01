// 路径数据本地存储管理
import type { RouteResult } from '@/services/mapService'

interface RouteCache {
  route: RouteResult
  timestamp: number // 缓存时间戳
  tripId: string
  day: number
  startIndex: number
  endIndex: number
}

const STORAGE_KEY_PREFIX = 'trip_route_'

/**
 * 生成路径缓存 Key
 */
const getRouteKey = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number
): string => {
  return `${STORAGE_KEY_PREFIX}${tripId}_${day}_${startIndex}_${endIndex}`
}

/**
 * 保存路径到本地存储
 */
export const saveRoute = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number,
  route: RouteResult
): void => {
  try {
    const key = getRouteKey(tripId, day, startIndex, endIndex)
    const cache: RouteCache = {
      route,
      timestamp: Date.now(),
      tripId,
      day,
      startIndex,
      endIndex
    }
    localStorage.setItem(key, JSON.stringify(cache))
    console.log(`[routeStorage] ✅ 路径已保存: ${key}`)
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
  endIndex: number
): RouteResult | null => {
  try {
    const key = getRouteKey(tripId, day, startIndex, endIndex)
    const cached = localStorage.getItem(key)
    
    if (!cached) {
      console.log(`[routeStorage] 未找到缓存: ${key}`)
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
    
    console.log(`[routeStorage] ✅ 从缓存读取路径: ${key}`)
    return cache.route
  } catch (error) {
    console.error(`[routeStorage] ❌ 读取路径失败:`, error)
    return null
  }
}

/**
 * 检查路径是否已缓存
 */
export const hasRoute = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number
): boolean => {
  const route = loadRoute(tripId, day, startIndex, endIndex)
  return route !== null
}

/**
 * 删除路径缓存
 */
export const deleteRoute = (
  tripId: string,
  day: number,
  startIndex: number,
  endIndex: number
): void => {
  try {
    const key = getRouteKey(tripId, day, startIndex, endIndex)
    localStorage.removeItem(key)
    console.log(`[routeStorage] ✅ 路径缓存已删除: ${key}`)
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

