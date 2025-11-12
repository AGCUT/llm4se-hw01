// 输入步骤 - 支持语音和文字输入
import { useState, useEffect } from 'react'
import { createVoiceRecognition, isVoiceRecognitionAvailable } from '@/services/voiceService'
import { isAIConfigured } from '@/api/ai.api'
import type { TripRequest } from '@/api/ai.api'
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
  const [voiceRecognition, setVoiceRecognition] = useState<any>(null)

  // 初始化语音识别
  useEffect(() => {
    if (isVoiceRecognitionAvailable()) {
      const recognition = createVoiceRecognition({
        onResult: (text) => {
          setVoiceText(text)
          parseVoiceInput(text)
        },
        onError: (error) => {
          console.error('语音识别错误:', error)
          setIsListening(false)
        },
        onEnd: () => {
          setIsListening(false)
        },
        onStart: () => {
          setIsListening(true)
        }
      })
      setVoiceRecognition(recognition)
    }
  }, [])

  // 解析语音输入
  const parseVoiceInput = (text: string) => {
    const updated = { ...formData }

    // 匹配目的地
    const destinationMatch = text.match(/去(.+?)[，,。]/)
    if (destinationMatch) {
      updated.destination = destinationMatch[1].trim()
    }

    // 匹配天数
    const daysMatch = text.match(/(\d+)天/)
    if (daysMatch) {
      updated.days = parseInt(daysMatch[1])
    }

    // 匹配预算
    const budgetMatch = text.match(/预算[是为]?(\d+)[元万]/)
    if (budgetMatch) {
      const amount = parseInt(budgetMatch[1])
      updated.budget = text.includes('万') ? amount * 10000 : amount
    }

    // 匹配人数
    const travelersMatch = text.match(/(\d+)人/)
    if (travelersMatch) {
      updated.travelers = parseInt(travelersMatch[1])
    }

    // 匹配偏好
    const preferences = []
    if (text.includes('美食')) preferences.push('美食')
    if (text.includes('动漫')) preferences.push('动漫')
    if (text.includes('历史') || text.includes('文化')) preferences.push('历史文化')
    if (text.includes('自然') || text.includes('风景')) preferences.push('自然风光')
    if (text.includes('购物')) preferences.push('购物')
    if (preferences.length > 0) {
      updated.preferences = preferences
    }

    // 匹配同行人类型
    const types = []
    if (text.includes('孩子') || text.includes('小孩') || text.includes('儿童')) types.push('儿童')
    if (text.includes('老人') || text.includes('父母')) types.push('老人')
    if (types.length > 0) {
      updated.travelerTypes = types
    }

    setFormData(updated)
    setVoiceText('')
  }

  // 开始/停止语音识别
  const toggleVoiceRecognition = () => {
    if (!voiceRecognition) {
      alert('您的浏览器不支持语音识别功能')
      return
    }

    if (isListening) {
      voiceRecognition.stop()
    } else {
      voiceRecognition.start()
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
          🎤 {isListening ? '录音中...' : '语音输入'}
        </button>
        {voiceText && <div className="voice-result">{voiceText}</div>}
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
