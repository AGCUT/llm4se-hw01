// 输入步骤 - 支持语音和文字输入
import { useState, useEffect } from 'react'
import { createVoiceRecognition, isVoiceRecognitionAvailable, checkMicrophonePermission } from '@/services/voiceService'
import { isAIConfigured, parseVoiceInputWithAI } from '@/api/ai.api'
import type { TripRequest } from '@/api/ai.api'
import { chineseToNumber, extractBudget, extractDays, extractTravelers } from '@/utils/chineseNumberConverter'
import Button from '@/components/common/Button/Button'
import './InputStep.css'

interface InputStepProps {
  onComplete: (request: TripRequest) => void
}

const InputStep = ({ onComplete }: InputStepProps) => {
  const [formData, setFormData] = useState({
    destination: '',
    days: 5,
    budget: 10000,
    travelers: 1,
    travelerTypes: [] as string[],
    preferences: [] as string[],
    startDate: '',
    additionalInfo: ''
  })

  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [voiceRecognition, setVoiceRecognition] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPermissionChecked, setIsPermissionChecked] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [useAIForParsing, setUseAIForParsing] = useState(true) // 默认使用 AI 解析

  // 初始化语音识别
  useEffect(() => {
    const initVoiceRecognition = async () => {
      if (!isVoiceRecognitionAvailable()) {
        setErrorMessage('您的浏览器不支持语音识别功能')
        return
      }

      // 检查麦克风权限
      try {
        const hasPermission = await checkMicrophonePermission()
        setIsPermissionChecked(true)
        if (!hasPermission) {
          setErrorMessage('请允许麦克风访问权限')
        }
      } catch (error) {
        console.error('检查麦克风权限失败:', error)
        setIsPermissionChecked(true)
      }

      const recognition = createVoiceRecognition({
        onResult: async (text) => {
          console.log('语音识别结果:', text)
          setVoiceText(text)
          setInterimText('')
          setErrorMessage(null)
          
          // 使用 AI 解析或本地解析
          if (useAIForParsing && isAIConfigured()) {
            await parseVoiceInputWithAIAssist(text)
          } else {
            parseVoiceInput(text)
          }
        },
        onInterimResult: (text) => {
          // 显示中间结果
          setInterimText(text)
          setErrorMessage(null)
        },
        onError: (error, errorCode) => {
          console.error('语音识别错误:', error, errorCode)
          setIsListening(false)
          setInterimText('')
          
          // 根据错误类型设置不同的错误消息
          if (errorCode === 'no-speech' || errorCode === 'timeout') {
            // no-speech 和 timeout 错误：提示用户说话
            setErrorMessage(error || '未检测到语音，请说话后再试')
          } else if (errorCode === 'not-allowed' || errorCode === 'audio-capture') {
            // 权限错误：提示用户允许权限
            setErrorMessage(error || '无法访问麦克风，请检查麦克风权限')
          } else {
            // 其他错误：显示错误消息
            setErrorMessage(error || '语音识别出错，请重试')
          }
        },
        onEnd: () => {
          setIsListening(false)
          setInterimText('')
        },
        onStart: () => {
          setIsListening(true)
          setErrorMessage(null)
          setVoiceText('')
          setInterimText('')
        }
      })
      setVoiceRecognition(recognition)
    }

    initVoiceRecognition()
  }, [])

  // 使用 AI 解析语音输入
  const parseVoiceInputWithAIAssist = async (text: string) => {
    setIsParsing(true)
    setErrorMessage(null)

    try {
      const result = await parseVoiceInputWithAI(text)
      if (result) {
        const updated = { ...formData }
        let hasChanges = false

        if (result.destination) {
          updated.destination = result.destination
          hasChanges = true
        }
        if (result.days !== null && result.days !== undefined) {
          updated.days = result.days
          hasChanges = true
        }
        if (result.budget !== null && result.budget !== undefined) {
          updated.budget = result.budget
          hasChanges = true
        }
        if (result.travelers !== null && result.travelers !== undefined) {
          updated.travelers = result.travelers
          hasChanges = true
        }
        if (result.travelerTypes && result.travelerTypes.length > 0) {
          updated.travelerTypes = result.travelerTypes
          hasChanges = true
        }
        if (result.preferences && result.preferences.length > 0) {
          updated.preferences = result.preferences
          hasChanges = true
        }
        if (result.additionalInfo) {
          updated.additionalInfo = result.additionalInfo
          hasChanges = true
        }

        if (hasChanges) {
          setFormData(updated)
          console.log('AI 语音解析结果:', updated)
        }
      } else {
        // AI 解析失败，回退到本地解析
        console.warn('AI 解析失败，使用本地解析')
        parseVoiceInput(text)
      }
    } catch (error: any) {
      console.error('AI 解析出错:', error)
      // AI 解析出错，回退到本地解析
      parseVoiceInput(text)
    } finally {
      setIsParsing(false)
    }
  }

  // 解析语音输入（本地解析，支持中文数字）
  const parseVoiceInput = (text: string) => {
    const updated = { ...formData }
    let hasChanges = false

    // 匹配目的地（多种模式）
    const destinationPatterns = [
      /去(.+?)[，,。\s]/,
      /目的地[是为]?(.+?)[，,。\s]/,
      /到(.+?)[，,。\s]/,
      /我想去(.+?)[，,。\s]/
    ]
    for (const pattern of destinationPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        updated.destination = match[1].trim()
        hasChanges = true
        break
      }
    }

    // 如果没有匹配到目的地，尝试提取第一个地点名称
    if (!updated.destination) {
      // 简单的地点名称提取（可以改进）
      const locationMatch = text.match(/(?:去|到|目的地)([\u4e00-\u9fa5]{2,10})/)
      if (locationMatch && locationMatch[1]) {
        updated.destination = locationMatch[1].trim()
        hasChanges = true
      }
    }

    // 匹配天数（支持中文数字，如"五天"、"五日"）
    const days = extractDays(text)
    if (days !== null) {
      updated.days = days
      hasChanges = true
    }

    // 匹配预算（支持中文数字，如"五千元"、"五万元"）
    // 使用 extractBudget 函数，它已经正确处理了中文数字转换
    const budget = extractBudget(text)
    if (budget !== null && budget >= 100) {
      updated.budget = budget
      hasChanges = true
    }

    // 匹配人数（支持中文数字）
    const travelers = extractTravelers(text)
    if (travelers !== null) {
      updated.travelers = travelers
      hasChanges = true
    }

    // 匹配偏好
    const preferences: string[] = []
    if (text.includes('美食') || text.includes('吃')) preferences.push('美食')
    if (text.includes('动漫') || text.includes('动画')) preferences.push('动漫')
    if (text.includes('历史') || text.includes('文化')) preferences.push('历史文化')
    if (text.includes('自然') || text.includes('风景') || text.includes('风光')) preferences.push('自然风光')
    if (text.includes('购物') || text.includes('买')) preferences.push('购物')
    if (text.includes('休闲') || text.includes('放松')) preferences.push('休闲')
    if (preferences.length > 0) {
      updated.preferences = preferences
      hasChanges = true
    }

    // 匹配同行人类型
    const types: string[] = []
    if (text.includes('孩子') || text.includes('小孩') || text.includes('儿童') || text.includes('带孩子')) {
      types.push('儿童')
      hasChanges = true
    }
    if (text.includes('老人') || text.includes('父母') || text.includes('长辈')) {
      types.push('老人')
      hasChanges = true
    }
    if (types.length > 0) {
      updated.travelerTypes = types
    }

    // 如果没有任何匹配，将整个文本作为其他需求
    if (!hasChanges && text.trim().length > 0) {
      updated.additionalInfo = (updated.additionalInfo ? updated.additionalInfo + ' ' : '') + text.trim()
      hasChanges = true
    }

    if (hasChanges) {
      setFormData(updated)
      console.log('本地语音解析结果:', updated)
    }
  }

  // 开始/停止语音识别
  const toggleVoiceRecognition = async () => {
    if (!voiceRecognition) {
      setErrorMessage('您的浏览器不支持语音识别功能')
      return
    }

    if (isListening) {
      voiceRecognition.stop()
    } else {
      // 检查麦克风权限
      if (!isPermissionChecked) {
        try {
          const hasPermission = await checkMicrophonePermission()
          setIsPermissionChecked(true)
          if (!hasPermission) {
            setErrorMessage('请允许麦克风访问权限')
            return
          }
        } catch (error) {
          console.error('检查麦克风权限失败:', error)
          setErrorMessage('无法访问麦克风，请检查麦克风权限')
          return
        }
      }

      // 清除之前的错误消息
      setErrorMessage(null)
      setVoiceText('')
      setInterimText('')

      // 开始语音识别
      const started = await voiceRecognition.start()
      if (!started) {
        setErrorMessage('启动语音识别失败，请重试')
      }
    }
  }

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.destination) {
      alert('请输入目的地')
      return
    }
    if (formData.days < 1 || formData.days > 30) {
      alert('天数应在 1-30 天之间')
      return
    }
    if (formData.budget < 100) {
      alert('请输入有效的预算')
      return
    }

    if (!isAIConfigured()) {
      alert('请先在设置中配置 AI API Key')
      return
    }

    onComplete(formData)
  }

  const togglePreference = (pref: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter(p => p !== pref)
        : [...prev.preferences, pref]
    }))
  }

  const toggleTravelerType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      travelerTypes: prev.travelerTypes.includes(type)
        ? prev.travelerTypes.filter(t => t !== type)
        : [...prev.travelerTypes, type]
    }))
  }

  return (
    <div className="input-step">
      <div className="step-header">
        <h2>📝 描述您的旅行需求</h2>
        <p>使用语音或文字告诉我们您想要的旅行</p>
      </div>

      {/* 语音输入 */}
      <div className="voice-section">
        <button
          type="button"
          className={`voice-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleVoiceRecognition}
          disabled={!voiceRecognition}
        >
          🎤 {isListening ? '🎙️ 正在录音...' : '🎤 点击开始语音输入'}
        </button>
        
        {/* 提示信息 */}
        {isListening && (
          <div className="voice-hint">
            💬 请说话，例如："我想去日本，5天，预算1万元，2个人，喜欢美食和动漫"
          </div>
        )}

        {/* 中间结果（实时显示） */}
        {interimText && (
          <div className="voice-interim">
            <span className="voice-interim-label">正在识别：</span>
            {interimText}
          </div>
        )}

        {/* 最终结果 */}
        {voiceText && !isListening && (
          <div className="voice-result">
            <span className="voice-result-label">识别结果：</span>
            {voiceText}
          </div>
        )}

        {/* 错误消息 */}
        {errorMessage && (
          <div className="voice-error">
            ⚠️ {errorMessage}
            {errorMessage.includes('未检测到语音') && (
              <button
                type="button"
                className="voice-retry-btn"
                onClick={toggleVoiceRecognition}
              >
                重试
              </button>
            )}
          </div>
        )}
      </div>

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="trip-form">
        <div className="form-group">
          <label>目的地 *</label>
          <input
            type="text"
            value={formData.destination}
            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
            placeholder="例如：日本东京"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>天数 *</label>
            <input
              type="number"
              value={formData.days}
              onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
              min="1"
              max="30"
              required
            />
          </div>
          <div className="form-group">
            <label>预算(元) *</label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
              min="100"
              required
            />
          </div>
          <div className="form-group">
            <label>人数 *</label>
            <input
              type="number"
              value={formData.travelers}
              onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) })}
              min="1"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>同行人</label>
          <div className="tag-group">
            {['成人', '儿童', '老人'].map(type => (
              <button
                key={type}
                type="button"
                className={`tag ${formData.travelerTypes.includes(type) ? 'active' : ''}`}
                onClick={() => toggleTravelerType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>偏好</label>
          <div className="tag-group">
            {['美食', '动漫', '历史文化', '自然风光', '购物', '休闲'].map(pref => (
              <button
                key={pref}
                type="button"
                className={`tag ${formData.preferences.includes(pref) ? 'active' : ''}`}
                onClick={() => togglePreference(pref)}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>其他需求</label>
          <textarea
            value={formData.additionalInfo}
            onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
            placeholder="例如：希望住在市中心..."
            rows={3}
          />
        </div>

        <Button type="submit" fullWidth>下一步</Button>
      </form>
    </div>
  )
}

export default InputStep
