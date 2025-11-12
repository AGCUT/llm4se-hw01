// Timeline 组件 - 展示行程时间轴
import { useState } from 'react'
import type { Trip } from '@/config/supabase.config'
import './TripDetail.css'

interface TimelineProps {
  trip: Trip
}

const Timeline = ({ trip }: TimelineProps) => {
  const [activeDay, setActiveDay] = useState(1)

  const dailyPlans = trip.daily_plans || []
  const overview = trip.overview || { highlights: [], tips: [], summary: '' }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transportation': return '🚗'
      case 'accommodation': return '🏨'
      case 'attraction': return '🎯'
      case 'restaurant': return '🍽️'
      default: return '📍'
    }
  }

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
    <div className="timeline-view">
      {/* 行程概览 */}
      {overview.highlights && overview.highlights.length > 0 && (
        <div className="overview-section">
          <h3>✨ 行程亮点</h3>
          <ul className="highlights-list">
            {overview.highlights.map((highlight: string, index: number) => (
              <li key={index}>{highlight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 天数选择 */}
      <div className="day-selector">
        {dailyPlans.map((dayPlan: any) => (
          <button
            key={dayPlan.day}
            className={`day-btn ${activeDay === dayPlan.day ? 'active' : ''}`}
            onClick={() => setActiveDay(dayPlan.day)}
          >
            Day {dayPlan.day}
          </button>
        ))}
      </div>

      {/* 当日行程 */}
      {dailyPlans.map((dayPlan: any) => (
        activeDay === dayPlan.day && (
          <div key={dayPlan.day} className="day-content">
            <div className="day-info">
              <h3>第 {dayPlan.day} 天</h3>
              {dayPlan.date && <span>{dayPlan.date}</span>}
              <span className="day-budget">¥{dayPlan.estimatedCost?.toLocaleString() || 0}</span>
            </div>

            <div className="activities-timeline">
              {dayPlan.activities && dayPlan.activities.map((activity: any, index: number) => (
                <div key={index} className="activity-item">
                  <div className="activity-time">{activity.time}</div>
                  <div className="activity-dot"></div>
                  <div className="activity-card">
                    <div className="activity-header">
                      <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                      <span className="activity-type">{getActivityTypeName(activity.type)}</span>
                      <span className="activity-cost">¥{activity.estimatedCost}</span>
                    </div>
                    <h4>{activity.name}</h4>
                    <p>{activity.description}</p>
                    {activity.location && (
                      <p className="activity-location">📍 {activity.location.address}</p>
                    )}
                    {activity.duration && (
                      <p className="activity-duration">⏱️ {activity.duration}</p>
                    )}
                    {activity.tips && activity.tips.length > 0 && (
                      <div className="activity-tips">
                        <strong>💡 小贴士：</strong>
                        <ul>
                          {activity.tips.map((tip: string, i: number) => (
                            <li key={i}>{tip}</li>
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

      {/* 预算统计 */}
      {trip.budget_breakdown && (
        <div className="budget-stats">
          <h3>💰 预算统计</h3>
          <div className="budget-chart">
            {Object.entries(trip.budget_breakdown).map(([key, value]: [string, any]) => (
              <div key={key} className="budget-bar-item">
                <span className="budget-category">{getCategoryName(key)}</span>
                <div className="budget-bar-bg">
                  <div 
                    className={`budget-bar-fill ${key}`}
                    style={{ width: `${(value / trip.budget) * 100}%` }}
                  ></div>
                </div>
                <span className="budget-amount">¥{value?.toLocaleString() || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const getCategoryName = (key: string) => {
  const names: Record<string, string> = {
    transportation: '交通',
    accommodation: '住宿',
    food: '餐饮',
    attractions: '景点',
    other: '其他'
  }
  return names[key] || key
}

export default Timeline
