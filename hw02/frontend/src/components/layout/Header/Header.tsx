// Header组件
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { isAIConfigured } from '@/api/ai.api'
import AIConfigModal from '@/components/common/AIConfigModal'
import './Header.module.css'

const Header = () => {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuthStore()
  const isAuthenticated = !!user
  const [showAIConfig, setShowAIConfig] = useState(false)
  const aiConfigured = isAIConfigured()

  const handleLogout = async () => {
    try {
      // 先跳转到登录页，避免卡在受保护路由的验证状态
      navigate('/login')
      // 然后执行退出操作
      await signOut()
    } catch (error) {
      console.error('登出失败:', error)
      // 即使退出失败，也确保跳转到登录页
      navigate('/login')
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
              <div className="user-menu">
                <span className="user-name">
                  {profile?.username || user?.email}
                </span>
                <button onClick={handleLogout} className="btn-logout" title="退出登录">
                  <span className="logout-icon">🚪</span>
                  <span className="logout-text">退出</span>
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
