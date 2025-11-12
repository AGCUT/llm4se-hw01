// 语音识别服务（支持科大讯飞 WebSocket API 和浏览器原生 Web Speech API）

interface VoiceRecognitionOptions {
  onResult?: (text: string) => void
  onError?: (error: string, errorCode?: string) => void
  onEnd?: () => void
  onStart?: () => void
  onInterimResult?: (text: string) => void
}

// 错误消息映射
const ERROR_MESSAGES: Record<string, string> = {
  'no-speech': '未检测到语音，请说话后再试',
  'audio-capture': '无法访问麦克风，请检查麦克风权限',
  'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问',
  'network': '网络错误，请检查网络连接',
  'aborted': '语音识别已取消',
  'service-not-allowed': '语音识别服务不可用',
  'bad-grammar': '语法错误',
  'language-not-supported': '不支持的语言'
}

// 使用浏览器原生 Web Speech API（备用方案）
class WebSpeechRecognition {
  private recognition: any = null
  private isListening = false
  private retryCount = 0
  private maxRetries = 2
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private silenceTimeout = 10000 // 10秒无语音自动停止

  constructor(private options: VoiceRecognitionOptions) {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      this.recognition = new SpeechRecognition()
      this.recognition.lang = 'zh-CN'
      this.recognition.continuous = true // 连续识别
      this.recognition.interimResults = true // 返回中间结果
      this.recognition.maxAlternatives = 1

      this.recognition.onresult = (event: any) => {
        // 清除超时定时器
        if (this.timeoutId) {
          clearTimeout(this.timeoutId)
          this.timeoutId = null
        }

        // 重置重试次数
        this.retryCount = 0

        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        // 如果有中间结果，先显示
        if (interimTranscript) {
          this.options.onInterimResult?.(interimTranscript)
        }

        // 如果有最终结果，返回最终结果
        if (finalTranscript) {
          this.options.onResult?.(finalTranscript)
          // 设置新的超时定时器
          this.resetSilenceTimeout()
        }
      }

      this.recognition.onerror = (event: any) => {
        const error = event.error
        console.error('语音识别错误:', error, event)

        // 清除超时定时器
        if (this.timeoutId) {
          clearTimeout(this.timeoutId)
          this.timeoutId = null
        }

        // 处理特殊错误
        if (error === 'no-speech') {
          // no-speech 错误：可能是用户没有说话或说话时间太短
          // 不自动重试，让用户手动重试
          this.options.onError?.(ERROR_MESSAGES[error] || '未检测到语音', error)
          this.isListening = false
          return
        }

        if (error === 'audio-capture' || error === 'not-allowed') {
          // 麦克风权限错误：不重试
          this.options.onError?.(ERROR_MESSAGES[error] || '无法访问麦克风', error)
          this.isListening = false
          return
        }

        if (error === 'network') {
          // 网络错误：可以重试
          if (this.retryCount < this.maxRetries) {
            this.retryCount++
            console.log(`网络错误，正在重试 (${this.retryCount}/${this.maxRetries})...`)
            setTimeout(() => {
              if (this.recognition && !this.isListening) {
                try {
                  this.recognition.start()
                } catch (e) {
                  console.error('重试启动失败:', e)
                  this.options.onError?.(ERROR_MESSAGES[error] || '网络错误', error)
                }
              }
            }, 1000)
            return
          }
        }

        // 其他错误
        this.options.onError?.(ERROR_MESSAGES[error] || `语音识别错误: ${error}`, error)
        this.isListening = false
      }

      this.recognition.onend = () => {
        // 清除超时定时器
        if (this.timeoutId) {
          clearTimeout(this.timeoutId)
          this.timeoutId = null
        }

        this.isListening = false
        this.options.onEnd?.()
      }

      this.recognition.onstart = () => {
        this.isListening = true
        this.retryCount = 0
        this.resetSilenceTimeout()
        this.options.onStart?.()
      }
    }
  }

  private resetSilenceTimeout() {
    // 清除旧的超时定时器
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }

    // 设置新的超时定时器：如果10秒内没有语音输入，自动停止
    this.timeoutId = setTimeout(() => {
      if (this.isListening) {
        console.log('超时：10秒内未检测到语音，自动停止')
        this.stop()
        this.options.onError?.('未检测到语音，已自动停止。请说话后再试', 'timeout')
      }
    }, this.silenceTimeout)
  }

  async start(): Promise<boolean> {
    if (!this.recognition) {
      return false
    }

    if (this.isListening) {
      console.warn('语音识别已在运行中')
      return false
    }

    // 检查麦克风权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // 权限已授予，关闭流
      stream.getTracks().forEach(track => track.stop())
    } catch (error: any) {
      console.error('麦克风权限检查失败:', error)
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.options.onError?.('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问', 'not-allowed')
        return false
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.options.onError?.('未找到麦克风设备，请检查麦克风连接', 'no-microphone')
        return false
      }
      // 其他错误，仍然尝试启动（可能是浏览器限制）
      console.warn('麦克风权限检查失败，但继续尝试启动语音识别')
    }

    try {
      this.recognition.start()
      return true
    } catch (error: any) {
      console.error('启动语音识别失败:', error)
      if (error.message && error.message.includes('already started')) {
        // 如果已经在运行，先停止再启动
        try {
          this.recognition.stop()
          setTimeout(() => {
            try {
              this.recognition.start()
            } catch (e) {
              this.options.onError?.('启动语音识别失败，请稍后重试', 'start-failed')
            }
          }, 100)
        } catch (e) {
          this.options.onError?.('启动语音识别失败，请稍后重试', 'start-failed')
        }
        return false
      }
      this.options.onError?.('启动语音识别失败，请稍后重试', 'start-failed')
      return false
    }
  }

  stop() {
    // 清除超时定时器
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch (error) {
        console.error('停止语音识别失败:', error)
      }
    }
  }

  isAvailable(): boolean {
    return !!this.recognition
  }

  // 检查麦克风权限
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (error) {
      return false
    }
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
  async start(): Promise<boolean> {
    // 优先使用浏览器原生 API
    if (this.webSpeechRecognition?.isAvailable()) {
      this.currentRecognition = this.webSpeechRecognition
      return await this.currentRecognition.start()
    }

    this.options.onError?.('您的浏览器不支持语音识别功能', 'not-supported')
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

  // 检查麦克风权限
  static async checkMicrophonePermission(): Promise<boolean> {
    return await WebSpeechRecognition.checkMicrophonePermission()
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

// 检查麦克风权限
export const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch (error) {
    return false
  }
}

// 请求麦克风权限
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch (error: any) {
    console.error('请求麦克风权限失败:', error)
    return false
  }
}
