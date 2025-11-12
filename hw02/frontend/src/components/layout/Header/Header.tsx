// Header组件
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { isAIConfigured } from '@/api/ai.api'
import AIConfigModal from '@/components/common/AIConfigModal'
import './Header.module.css'

const Header = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user, profile } = useAuth()
  const { signOut } = useAuthStore()
  const [showAIConfig, setShowAIConfig] = useState(false)
  const aiConfigured = isAIConfigured()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  return (
    <header className="header">
      {/* AI 配置弹窗 */}
      <AIConfigModal 
        isOpen={showAIConfig} 
        onClose={() => setShowAIConfig(false)} 
      />

      <div className="header-container">
        <div className="header-logo" onClick={() => navigate('/')}>
          <span className="logo-icon">✈️</span>
          <span className="logo-text">AI 旅行规划师</span>
        </div>

        <nav className="header-nav">
          {/* AI 配置按钮（始终显示） */}
          <button 
            onClick={() => setShowAIConfig(true)} 
            className={`nav-link ai-config-link ${!aiConfigured ? 'warning' : ''}`}
            title={aiConfigured ? 'AI 已配置' : '需要配置 AI'}
          >
            ⚙️ AI配置
            {!aiConfigured && <span className="config-dot"></span>}
          </button>

          {isAuthenticated ? (
            <>
              <button onClick={() => navigate('/dashboard')} className="nav-link">
                我的行程
              </button>
              <button onClick={() => navigate('/trip/create')} className="nav-link">
                创建行程
              </button>
              <button onClick={() => navigate('/expense')} className="nav-link">
                费用管理
              </button>
              <div className="user-menu">
                <span className="user-name">
                  {profile?.username || user?.email}
                </span>
                <button onClick={handleLogout} className="btn-logout">
                  退出
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="nav-link">
                登录
              </button>
              <button onClick={() => navigate('/register')} className="btn-register">
                注册
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header
