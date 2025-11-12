// Home页面
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { isAIConfigured } from '@/api/ai.api'
import AIConfigModal from '@/components/common/AIConfigModal'
import './Home.module.css'

const Home = () => {
  const navigate = useNavigate()
  // 直接使用 authStore，避免重复获取认证状态
  const { user, profile, loading } = useAuthStore()
  const isAuthenticated = !!user
  const [showAIConfig, setShowAIConfig] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const aiConfigured = isAIConfigured()

  // 添加超时机制，避免一直显示加载中
  useEffect(() => {
    // 如果已经有用户信息，立即显示内容
    if (user) {
      setShowContent(true)
      return
    }

    // 如果 loading 完成，立即显示内容
    if (!loading) {
      setShowContent(true)
      return
    }

    // 否则，等待最多 1 秒后显示内容
    const timer = setTimeout(() => {
      setShowContent(true)
    }, 1000) // 减少到 1 秒，因为登录成功后应该有用户信息

    return () => clearTimeout(timer)
  }, [loading, user])

  // 如果 loading 完成或者超时，显示内容
  if (loading && !showContent && !user) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #e2e8f0',
          borderTop: '5px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div>正在加载...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="home-container">
      {/* AI 配置弹窗 */}
      <AIConfigModal 
        isOpen={showAIConfig} 
        onClose={() => setShowAIConfig(false)} 
      />

      {/* AI 配置提示卡片（如果未配置） */}
      {!aiConfigured && (
        <div className="ai-config-banner">
          <div className="banner-content">
            <div className="banner-icon">⚠️</div>
            <div className="banner-text">
              <h3>AI 未配置</h3>
              <p>需要配置 AI API Key 才能使用智能行程规划功能</p>
            </div>
            <button 
              className="banner-btn"
              onClick={() => setShowAIConfig(true)}
            >
              立即配置
            </button>
          </div>
        </div>
      )}

      <div className="hero-section">
        <h1 className="hero-title">🌍 AI 旅行规划师</h1>
        <p className="hero-subtitle">
          智能规划您的完美旅程
        </p>

        {/* AI 配置状态提示 */}
        <div className="ai-status-badge">
          {aiConfigured ? (
            <span className="status-configured">✅ AI 已配置</span>
          ) : (
            <button 
              className="status-not-configured"
              onClick={() => setShowAIConfig(true)}
            >
              ⚠️ 点击配置 AI
            </button>
          )}
        </div>

        {isAuthenticated ? (
          <div className="welcome-section">
            <h2>欢迎回来，{profile?.username || user?.email}！</h2>
            <div className="action-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/dashboard')}
              >
                我的行程
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/trip/create')}
              >
                创建新行程
              </button>
            </div>
          </div>
        ) : (
          <div className="auth-section">
            <p className="auth-prompt">开始您的旅行规划之旅</p>
            <div className="auth-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/register')}
              >
                立即注册
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/login')}
              >
                登录
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="features-section">
        <h2 className="features-title">核心功能</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI 智能规划</h3>
            <p>基于您的偏好和预算，智能生成个性化行程</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>费用管理</h3>
            <p>实时记录和统计旅行费用，预算一目了然</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>地图导航</h3>
            <p>集成高德地图，景点路线规划更便捷</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎤</div>
            <h3>语音记账</h3>
            <p>支持语音输入，随时随地记录费用</p>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <h2>准备好开始您的旅程了吗？</h2>
        {!isAuthenticated ? (
          <button 
            className="btn btn-large btn-primary"
            onClick={() => navigate('/register')}
          >
            免费注册
          </button>
        ) : !aiConfigured ? (
          <button 
            className="btn btn-large btn-primary"
            onClick={() => setShowAIConfig(true)}
          >
            配置 AI 开始规划
          </button>
        ) : (
          <button 
            className="btn btn-large btn-primary"
            onClick={() => navigate('/trip/create')}
          >
            立即创建行程
          </button>
        )}
      </div>

      {/* 快速访问 AI 配置按钮（固定在右下角） */}
      <button 
        className="floating-config-btn"
        onClick={() => setShowAIConfig(true)}
        title="AI 配置"
      >
        ⚙️
      </button>
    </div>
  )
}

export default Home
