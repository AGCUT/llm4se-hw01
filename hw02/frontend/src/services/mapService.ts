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
 */
export const geocode = async (address: string): Promise<{ lng: number; lat: number } | null> => {
  try {
    if (!AMap) {
      await initAMap('temp-container')
    }

    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder({
        city: '全国' // 城市设为"全国"
      })

      geocoder.getLocation(address, (status: string, result: any) => {
        if (status === 'complete' && result.geocodes.length > 0) {
          const location = result.geocodes[0].location
          resolve({ lng: location.lng, lat: location.lat })
        } else {
          console.warn('地理编码失败:', address, result)
          resolve(null)
        }
      })
    })
  } catch (error: any) {
    console.error('地理编码错误:', error)
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
 * 路线规划 - 驾车路线
 */
export const planRoute = async (
  start: { lng: number; lat: number },
  end: { lng: number; lat: number }
): Promise<any> => {
  try {
    if (!AMap) {
      await initAMap('temp-container')
    }

    return new Promise((resolve, reject) => {
      const driving = new AMap.Driving({
        map: null,
        panel: null
      })

      driving.search(
        new AMap.LngLat(start.lng, start.lat),
        new AMap.LngLat(end.lng, end.lat),
        (status: string, result: any) => {
          if (status === 'complete' && result.routes && result.routes.length > 0) {
            resolve(result)
          } else {
            console.warn('路线规划失败:', result)
            reject(new Error('路线规划失败'))
          }
        }
      )
    })
  } catch (error: any) {
    console.error('路线规划错误:', error)
    throw error
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
