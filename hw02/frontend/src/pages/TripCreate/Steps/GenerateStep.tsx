// 生成步骤 - AI 生成行程
import { useEffect, useState } from 'react'
import { generateTripPlan } from '@/api/ai.api'
import type { TripRequest, TripPlan } from '@/api/ai.api'
import './GenerateStep.css'

interface GenerateStepProps {
  request: TripRequest
  onComplete: (plan: TripPlan) => void
  onError: () => void
}

const GenerateStep = ({ request, onComplete, onError }: GenerateStepProps) => {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('正在连接 AI 服务...')
  const [error, setError] = useState('')

  useEffect(() => {
    generatePlan()
  }, [])

  const generatePlan = async () => {
    try {
      // 模拟进度
      setProgress(10)
      setStatus('正在分析您的需求...')

      setTimeout(() => {
        setProgress(30)
        setStatus('AI 正在规划行程路线...')
      }, 1000)

      setTimeout(() => {
        setProgress(50)
        setStatus('正在搜索最佳景点和餐厅...')
      }, 2000)

      setTimeout(() => {
        setProgress(70)
        setStatus('正在计算预算分配...')
      }, 3000)

      // 调用 AI API
      const plan = await generateTripPlan(request)

      setProgress(100)
      setStatus('行程生成完成！')

      // 延迟一下再跳转，让用户看到完成状态
      setTimeout(() => {
        onComplete(plan)
      }, 500)

    } catch (error: any) {
      console.error('生成失败:', error)
      setError(error.message || '生成失败，请重试')
      setStatus('生成失败')
    }
  }

  const handleRetry = () => {
    setError('')
    setProgress(0)
    setStatus('正在连接 AI 服务...')
    generatePlan()
  }

  const handleGoBack = () => {
    onError()
  }

  return (
    <div className="generate-step">
      <div className="generate-content">
        {!error ? (
          <>
            {/* AI 生成动画 */}
            <div className="ai-animation">
              <div className="globe-container">
                <div className="globe">🌍</div>
                <div className="orbit orbit-1"></div>
                <div className="orbit orbit-2"></div>
                <div className="orbit orbit-3"></div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="progress-section">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                >
                  <span className="progress-text">{progress}%</span>
                </div>
              </div>
              <p className="status-text">{status}</p>
            </div>

            {/* 提示信息 */}
            <div className="tips-section">
              <h3>💡 生成中，请稍候</h3>
              <ul className="tips-list">
                <li>AI 正在根据您的偏好定制专属行程</li>
                <li>预算将被合理分配到交通、住宿、餐饮等</li>
                <li>所有推荐都考虑了时间和地理位置</li>
                <li>您可以在下一步查看并修改行程</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* 错误提示 */}
            <div className="error-section">
              <div className="error-icon">😕</div>
              <h3>生成失败</h3>
              <p className="error-message">{error}</p>
              
              <div className="error-tips">
                <h4>可能的原因：</h4>
                <ul>
                  <li>AI API Key 未配置或已过期</li>
                  <li>网络连接问题</li>
                  <li>AI 服务暂时不可用</li>
                  <li>请求参数不完整</li>
                </ul>
              </div>

              <div className="error-actions">
                <button className="btn-retry" onClick={handleRetry}>
                  🔄 重试
                </button>
                <button className="btn-back" onClick={handleGoBack}>
                  ← 返回修改
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 行程信息预览 */}
      <div className="request-preview">
        <h4>您的行程需求</h4>
        <div className="preview-item">
          <span className="preview-label">目的地：</span>
          <span className="preview-value">{request.destination}</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">天数：</span>
          <span className="preview-value">{request.days} 天</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">预算：</span>
          <span className="preview-value">¥{request.budget.toLocaleString()}</span>
        </div>
        <div className="preview-item">
          <span className="preview-label">人数：</span>
          <span className="preview-value">{request.travelers} 人</span>
        </div>
        {request.preferences && request.preferences.length > 0 && (
          <div className="preview-item">
            <span className="preview-label">偏好：</span>
            <span className="preview-value">{request.preferences.join('、')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default GenerateStep
