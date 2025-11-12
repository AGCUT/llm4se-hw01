// useMap Hook - 地图相关功能
import { useEffect, useRef, useState } from 'react'
import { initAMap, destroyMap, geocode, reverseGeocode, planRoute, isAMapConfigured } from '@/services/mapService'
import type { AMap } from '@amap/amap-jsapi-loader'

interface UseMapOptions {
  containerId: string
  zoom?: number
  center?: [number, number]
  onMapReady?: (map: any, AMap: any) => void
}

interface UseMapReturn {
  map: any | null
  AMap: any | null
  loading: boolean
  error: string | null
  geocode: (address: string) => Promise<{ lng: number; lat: number } | null>
  reverseGeocode: (lng: number, lat: number) => Promise<string | null>
  planRoute: (start: { lng: number; lat: number }, end: { lng: number; lat: number }) => Promise<any>
  isConfigured: boolean
}

export const useMap = (options: UseMapOptions): UseMapReturn => {
  const [map, setMap] = useState<any>(null)
  const [amap, setAmap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    let isCancelled = false
    let retryCount = 0
    const maxRetries = 10 // 最多重试10次
    const retryDelay = 100 // 每次重试间隔100ms

    const checkContainerAndInit = async () => {
      // 检查容器元素是否存在
      const container = document.getElementById(options.containerId)
      
      if (!container) {
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`容器 ${options.containerId} 不存在，等待重试 (${retryCount}/${maxRetries})...`)
          setTimeout(checkContainerAndInit, retryDelay)
          return
        } else {
          if (!isCancelled) {
            setError(`地图容器 ${options.containerId} 不存在`)
            setLoading(false)
          }
          return
        }
      }

      // 容器存在，开始初始化
      await init()
    }

    const init = async () => {
      if (initializedRef.current) {
        return
      }

      // 再次检查容器（双重保险）
      const container = document.getElementById(options.containerId)
      if (!container) {
        if (!isCancelled) {
          setError(`地图容器 ${options.containerId} 不存在`)
          setLoading(false)
        }
        return
      }

      // 检查配置
      if (!isAMapConfigured()) {
        setError('高德地图 API Key 未配置')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log(`开始初始化地图，容器ID: ${options.containerId}`)
        const { AMap: AMapInstance, map: mapInstance } = await initAMap(options.containerId, {
          zoom: options.zoom,
          center: options.center
        })

        if (!isCancelled) {
          setMap(mapInstance)
          setAmap(AMapInstance)
          initializedRef.current = true

          // 调用回调
          if (options.onMapReady) {
            options.onMapReady(mapInstance, AMapInstance)
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || '初始化地图失败')
          console.error('地图初始化失败:', err)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    // 开始检查容器并初始化
    checkContainerAndInit()

    return () => {
      isCancelled = true
      if (initializedRef.current) {
        destroyMap()
        initializedRef.current = false
      }
    }
  }, [options.containerId])

  return {
    map,
    AMap: amap,
    loading,
    error,
    geocode,
    reverseGeocode,
    planRoute,
    isConfigured: isAMapConfigured()
  }
}
