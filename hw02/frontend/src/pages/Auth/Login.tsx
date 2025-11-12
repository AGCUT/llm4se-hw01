// 登录页面
import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/common/Button/Button'
import './Auth.css'

export const Login = () => {
  const navigate = useNavigate()
  const { signIn, loading, error, clearError } = useAuthStore()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: ''
  })

  // 表单验证
  const validateForm = (): boolean => {
    const errors = {
      email: '',
      password: ''
    }

    // 验证邮箱
    if (!formData.email) {
      errors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址'
    }

    // 验证密码
    if (!formData.password) {
      errors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      errors.password = '密码长度至少为6位'
    }

    setFormErrors(errors)
    return !errors.email && !errors.password
  }

  // 处理表单提交
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      return
    }

    try {
      await signIn(formData.email, formData.password)
      // 登录成功，跳转到首页
      navigate('/')
    } catch (error: any) {
      console.error('登录失败:', error)
      
      // 处理特定错误
      if (error.message?.includes('Email not confirmed')) {
        alert('⚠️ 邮箱未验证\n\n请检查您的邮箱并点击验证链接。\n\n如果没有收到邮件，请检查垃圾箱。\n\n开发环境建议：在 Supabase Dashboard → Authentication → Providers → Email 中禁用 "Confirm email"')
      }
    }
  }

  // 处理输入变化
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // 清除该字段的错误
    setFormErrors((prev) => ({ ...prev, [field]: '' }))
    clearError()
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>欢迎回来</h1>
          <p>登录您的 AI 旅行规划师账户</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* 全局错误提示 */}
          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 邮箱输入 */}
          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="请输入邮箱"
              className={formErrors.email ? 'input-error' : ''}
              disabled={loading}
            />
            {formErrors.email && (
              <span className="field-error">{formErrors.email}</span>
            )}
          </div>

          {/* 密码输入 */}
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="请输入密码"
              className={formErrors.password ? 'input-error' : ''}
              disabled={loading}
            />
            {formErrors.password && (
              <span className="field-error">{formErrors.password}</span>
            )}
          </div>

          {/* 忘记密码 */}
          <div className="form-extra">
            <Link to="/forgot-password" className="forgot-link">
              忘记密码？
            </Link>
          </div>

          {/* 提交按钮 */}
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>

        {/* 注册链接 */}
        <div className="auth-footer">
          <p>
            还没有账户？{' '}
            <Link to="/register" className="auth-link">
              立即注册
            </Link>
          </p>
        </div>

        {/* OAuth登录（可选） */}
        <div className="oauth-section">
          <div className="divider">
            <span>或</span>
          </div>
          <div className="oauth-buttons">
            <button className="oauth-button" disabled={loading}>
              <span className="oauth-icon">🔍</span>
              使用 Google 登录
            </button>
            <button className="oauth-button" disabled={loading}>
              <span className="oauth-icon">💻</span>
              使用 GitHub 登录
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
