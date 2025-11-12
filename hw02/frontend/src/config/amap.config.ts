// 高德地图配置
// TODO: 配置地图Key和参数
export const AMAP_CONFIG = {
  key: import.meta.env.VITE_AMAP_KEY || '',
  version: '2.0',
  plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.Driving']
};

