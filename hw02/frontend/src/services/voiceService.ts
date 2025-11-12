// 语音识别服务（支持科大讯飞 WebSocket API 和浏览器原生 Web Speech API）

interface VoiceRecognitionOptions {
  onResult?: (text: string) => void
  onError?: (error: string) => void
  onEnd?: () => void
  onStart?: () => void
}

// 使用浏览器原生 Web Speech API（备用方案）
class WebSpeechRecognition {
  private recognition: any = null
  private isListening = false

  constructor(private options: VoiceRecognitionOptions) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      this.recognition = new SpeechRecognition()
      this.recognition.lang = 'zh-CN'
      this.recognition.continuous = false
      this.recognition.interimResults = false

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        this.options.onResult?.(transcript)
      }

      this.recognition.onerror = (event: any) => {
        this.options.onError?.(event.error)
      }

      this.recognition.onend = () => {
        this.isListening = false
        this.options.onEnd?.()
      }

      this.recognition.onstart = () => {
        this.isListening = true
        this.options.onStart?.()
      }
    }
  }

  start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start()
        return true
      } catch (error) {
        console.error('启动语音识别失败:', error)
        return false
      }
    }
    return false
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  isAvailable() {
    return !!this.recognition
  }
}

// 语音识别管理器
export class VoiceRecognitionManager {
  private webSpeechRecognition: WebSpeechRecognition | null = null
  private currentRecognition: WebSpeechRecognition | null = null

  constructor(private options: VoiceRecognitionOptions) {
    // 初始化浏览器原生语音识别（作为备用）
    this.webSpeechRecognition = new WebSpeechRecognition(options)
  }

  // 开始识别
  start(): boolean {
    // 优先使用浏览器原生 API
    if (this.webSpeechRecognition?.isAvailable()) {
      this.currentRecognition = this.webSpeechRecognition
      return this.currentRecognition.start()
    }

    this.options.onError?.('您的浏览器不支持语音识别功能')
    return false
  }

  // 停止识别
  stop() {
    this.currentRecognition?.stop()
  }

  // 检查是否可用
  isAvailable(): boolean {
    return this.webSpeechRecognition?.isAvailable() || false
  }
}

// 导出便捷函数
export const createVoiceRecognition = (options: VoiceRecognitionOptions) => {
  return new VoiceRecognitionManager(options)
}

// 检查语音识别是否可用
export const isVoiceRecognitionAvailable = (): boolean => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}
