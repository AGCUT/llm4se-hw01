// 行程创建页面 - 多步骤表单
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InputStep from './Steps/InputStep'
import GenerateStep from './Steps/GenerateStep'
import ReviewStep from './Steps/ReviewStep'
import type { TripRequest, TripPlan } from '@/api/ai.api'
import './TripCreate.css'

type Step = 'input' | 'generate' | 'review'

const TripCreate = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<Step>('input')
  const [tripRequest, setTripRequest] = useState<TripRequest | null>(null)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)

  // 处理输入完成
  const handleInputComplete = (request: TripRequest) => {
    setTripRequest(request)
    setCurrentStep('generate')
  }

  // 处理生成完成
  const handleGenerateComplete = (plan: TripPlan) => {
    setTripPlan(plan)
    setCurrentStep('review')
  }

  // 处理生成失败，返回输入步骤
  const handleGenerateError = () => {
    setCurrentStep('input')
  }

  // 处理保存行程
  const handleSavePlan = async () => {
    if (!tripPlan) {
      alert('❌ 没有可保存的行程计划')
      return
    }

    try {
      const { createTripFromPlan } = await import('@/api/trip.api')
      console.log('开始保存行程...', tripPlan)
      
      const savedTrip = await createTripFromPlan(tripPlan)
      console.log('行程保存成功:', savedTrip)
      
      alert('✅ 行程已保存！正在跳转到行程详情...')
      navigate(`/trip/${savedTrip.id}`)
    } catch (error: any) {
      console.error('保存失败:', error)
      const errorMessage = error?.message || '保存失败，请重试'
      alert(`❌ ${errorMessage}\n\n请检查：\n1. 是否已登录\n2. 网络连接是否正常\n3. 浏览器控制台是否有错误信息`)
    }
  }

  // 重新生成
  const handleRegenerate = () => {
    setCurrentStep('input')
  }

  return (
    <div className="trip-create-container">
      {/* 步骤指示器 */}
      <div className="step-indicator">
        <div className={`step ${currentStep === 'input' ? 'active' : currentStep !== 'input' ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">输入需求</div>
        </div>
        <div className="step-line"></div>
        <div className={`step ${currentStep === 'generate' ? 'active' : currentStep === 'review' ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">生成行程</div>
        </div>
        <div className="step-line"></div>
        <div className={`step ${currentStep === 'review' ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">查看确认</div>
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="step-content">
        {currentStep === 'input' && (
          <InputStep onComplete={handleInputComplete} />
        )}
        {currentStep === 'generate' && tripRequest && (
          <GenerateStep
            request={tripRequest}
            onComplete={handleGenerateComplete}
            onError={handleGenerateError}
          />
        )}
        {currentStep === 'review' && tripPlan && (
          <ReviewStep
            plan={tripPlan}
            onSave={handleSavePlan}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>
    </div>
  )
}

export default TripCreate
