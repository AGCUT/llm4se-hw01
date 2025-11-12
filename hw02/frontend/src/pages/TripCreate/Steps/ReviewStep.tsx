// 查看步骤 - 展示和确认行程
import { useState } from 'react'
import type { TripPlan } from '@/api/ai.api'
import Button from '@/components/common/Button/Button'
import './ReviewStep.css'

interface ReviewStepProps {
  plan: TripPlan
  onSave: () => void
  onRegenerate: () => void
  isSaving?: boolean
}

const ReviewStep = ({ plan, onSave, onRegenerate, isSaving = false }: ReviewStepProps) => {
  const [activeDay, setActiveDay] = useState(1)

  // 获取活动图标
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transportation': return '🚗'
      case 'accommodation': return '🏨'
      case 'attraction': return '🎯'
      case 'restaurant': return '🍽️'
      default: return '📍'
    }
  }

  // 获取活动类型名称
  const getActivityTypeName = (type: string) => {
    switch (type) {
      case 'transportation': return '交通'
      case 'accommodation': return '住宿'
      case 'attraction': return '景点'
      case 'restaurant': return '餐饮'
      default: return '其他'
    }
  }

  return (
    <div className="review-step">
      {/* 行程概览 */}
      <div className="trip-overview">
        <h2>{plan.title}</h2>
        <div className="overview-stats">
          <div className="stat-item">
            <span className="stat-label">目的地</span>
            <span className="stat-value">{plan.destination}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">天数</span>
            <span className="stat-value">{plan.days}天</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">预算</span>
            <span className="stat-value">¥{plan.budget.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">实际预算</span>
            <span className="stat-value">¥{plan.actualBudget.toLocaleString()}</span>
          </div>
        </div>

        {/* 行程亮点 */}
        {plan.overview.highlights && plan.overview.highlights.length > 0 && (
          <div className="highlights-section">
            <h3>✨ 行程亮点</h3>
            <ul className="highlights-list">
              {plan.overview.highlights.map((highlight, index) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 旅行建议 */}
        {plan.overview.tips && plan.overview.tips.length > 0 && (
          <div className="tips-section">
            <h3>💡 旅行建议</h3>
            <ul className="tips-list">
              {plan.overview.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 每日行程 */}
      <div className="daily-plans">
        <h3>📅 每日行程</h3>
        
        {/* 天数选择器 */}
        <div className="day-tabs">
          {plan.dailyPlans.map((dayPlan) => (
            <button
              key={dayPlan.day}
              className={`day-tab ${activeDay === dayPlan.day ? 'active' : ''}`}
              onClick={() => setActiveDay(dayPlan.day)}
            >
              Day {dayPlan.day}
            </button>
          ))}
        </div>

        {/* 当日行程详情 */}
        {plan.dailyPlans.map((dayPlan) => (
          activeDay === dayPlan.day && (
            <div key={dayPlan.day} className="day-detail">
              <div className="day-header">
                <h4>第 {dayPlan.day} 天</h4>
                {dayPlan.date && <span className="day-date">{dayPlan.date}</span>}
                <span className="day-cost">当日预算：¥{dayPlan.estimatedCost?.toLocaleString() || 0}</span>
              </div>

              {/* 活动时间轴 */}
              <div className="timeline">
                {dayPlan.activities && dayPlan.activities.map((activity, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-time">{activity.time}</div>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div className="activity-header">
                        <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                        <span className="activity-type">{getActivityTypeName(activity.type)}</span>
                        <span className="activity-cost">¥{activity.estimatedCost}</span>
                      </div>
                      <h5 className="activity-name">{activity.name}</h5>
                      <p className="activity-desc">{activity.description}</p>
                      {activity.location && (
                        <p className="activity-location">📍 {activity.location.address}</p>
                      )}
                      {activity.duration && (
                        <p className="activity-duration">⏱️ 预计时长：{activity.duration}</p>
                      )}
                      {activity.tips && activity.tips.length > 0 && (
                        <div className="activity-tips">
                          <strong>💡 小贴士：</strong>
                          <ul>
                            {activity.tips.map((tip, tipIndex) => (
                              <li key={tipIndex}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* 预算分解 */}
      <div className="budget-breakdown">
        <h3>💰 预算分解</h3>
        <div className="budget-items">
          <div className="budget-item">
            <span className="budget-label">🚗 交通</span>
            <span className="budget-bar">
              <span 
                className="budget-fill transportation"
                style={{ width: `${(plan.budgetBreakdown.transportation / plan.actualBudget) * 100}%` }}
              ></span>
            </span>
            <span className="budget-value">¥{plan.budgetBreakdown.transportation?.toLocaleString() || 0}</span>
          </div>
          <div className="budget-item">
            <span className="budget-label">🏨 住宿</span>
            <span className="budget-bar">
              <span 
                className="budget-fill accommodation"
                style={{ width: `${(plan.budgetBreakdown.accommodation / plan.actualBudget) * 100}%` }}
              ></span>
            </span>
            <span className="budget-value">¥{plan.budgetBreakdown.accommodation?.toLocaleString() || 0}</span>
          </div>
          <div className="budget-item">
            <span className="budget-label">🍽️ 餐饮</span>
            <span className="budget-bar">
              <span 
                className="budget-fill food"
                style={{ width: `${(plan.budgetBreakdown.food / plan.actualBudget) * 100}%` }}
              ></span>
            </span>
            <span className="budget-value">¥{plan.budgetBreakdown.food?.toLocaleString() || 0}</span>
          </div>
          <div className="budget-item">
            <span className="budget-label">🎯 景点</span>
            <span className="budget-bar">
              <span 
                className="budget-fill attractions"
                style={{ width: `${(plan.budgetBreakdown.attractions / plan.actualBudget) * 100}%` }}
              ></span>
            </span>
            <span className="budget-value">¥{plan.budgetBreakdown.attractions?.toLocaleString() || 0}</span>
          </div>
          <div className="budget-item">
            <span className="budget-label">📦 其他</span>
            <span className="budget-bar">
              <span 
                className="budget-fill other"
                style={{ width: `${(plan.budgetBreakdown.other / plan.actualBudget) * 100}%` }}
              ></span>
            </span>
            <span className="budget-value">¥{plan.budgetBreakdown.other?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="review-actions">
        <Button variant="secondary" onClick={onRegenerate}>
          🔄 重新生成
        </Button>
        <Button onClick={onSave} size="large" disabled={isSaving} loading={isSaving}>
          💾 {isSaving ? '保存中...' : '保存行程'}
        </Button>
      </div>
    </div>
  )
}

export default ReviewStep
