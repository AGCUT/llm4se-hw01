// 高德地图配置
export const AMAP_CONFIG = {
  key: import.meta.env.VITE_AMAP_KEY || '',
  version: '2.0',
  plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.Driving', 'AMap.Geocoder']
}

// 配置安全密钥（如果需要）
// 高德地图 JS API 2.0 需要配置安全密钥
if (typeof window !== 'undefined' && import.meta.env.VITE_AMAP_SECURITY_CODE) {
  window._AMapSecurityConfig = {
    securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE
  }
  console.log('高德地图安全密钥已配置')
}

// 检查配置
if (!AMAP_CONFIG.key) {
  console.warn('⚠️ 高德地图 API Key 未配置，请在 .env.local 文件中设置 VITE_AMAP_KEY')
} else {
  console.log('✅ 高德地图 API Key 已配置')
}

