// 语音识别配置
// TODO: 配置语音服务参数
export const VOICE_CONFIG = {
  provider: 'xunfei', // xunfei | web-speech
  appId: import.meta.env.VITE_XUNFEI_APP_ID || '',
  apiKey: import.meta.env.VITE_XUNFEI_API_KEY || ''
};

