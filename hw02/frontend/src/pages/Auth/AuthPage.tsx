// 统一的认证页面（注册/登录）
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/common/Button/Button'
import './Auth.css'

type AuthMode = 'login' | 'register'

export const AuthPage = () => {
  const navigate = useNavigate()
  const { signIn, signUp, loading, error, clearError } = useAuthStore()
  
  const [mode, setMode] = useState<AuthMode>('login')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [formErrors, setFormErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // 切换模式
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setFormErrors({ username: '', email: '', password: '', confirmPassword: '' })
    clearError()
  }

  // 表单验证
  const validateForm = (): boolean => {
    const errors = {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }

    // 验证用户名（仅注册时）
    if (mode === 'register') {
      if (!formData.username) {
        errors.username = '请输入用户名'
      } else if (formData.username.length < 2) {
        errors.username = '用户名至少2个字符'
      } else if (formData.username.length > 20) {
        errors.username = '用户名最多20个字符'
      }
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
    } else if (mode === 'register' && !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(formData.password)) {
      errors.password = '密码必须包含字母和数字'
    }

    // 验证确认密码（仅注册时）
    if (mode === 'register') {
      if (!formData.confirmPassword) {
        errors.confirmPassword = '请确认密码'
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = '两次密码输入不一致'
      }
    }

    setFormErrors(errors)
    return mode === 'login'
      ? !errors.email && !errors.password
      : !errors.username && !errors.email && !errors.password && !errors.confirmPassword
  }

  // 处理表单提交
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      return
    }

    // 注册模式需要同意条款
    if (mode === 'register' && !agreedToTerms) {
      alert('请同意服务条款和隐私政策')
      return
    }

    try {
      if (mode === 'login') {
        // 登录
        await signIn(formData.email, formData.password)
        navigate('/')
      } else {
        // 注册
        await signUp(formData.email, formData.password, formData.username)
        alert('🎉 注册成功！\n\n如果启用了邮箱验证：\n1. 请检查您的邮箱（包括垃圾箱）\n2. 点击验证链接\n3. 返回登录\n\n如果禁用了邮箱验证：\n可以直接登录')
        // 切换到登录模式
        setMode('login')
        setFormData({ ...formData, password: '', confirmPassword: '' })
      }
    } catch (error: any) {
      console.error(`${mode === 'login' ? '登录' : '注册'}失败:`, error)
      
      // 处理特定错误
      if (error.message?.includes('Email not confirmed')) {
        alert('⚠️ 邮箱未验证\n\n请检查您的邮箱并点击验证链接。\n\n如果没有收到邮件，请检查垃圾箱。\n\n开发环境建议：在 Supabase Dashboard → Authentication → Providers → Email 中禁用 "Confirm email"')
      } else if (error.message?.includes('User already registered')) {
        alert('❌ 该邮箱已被注册\n\n请使用其他邮箱或切换到登录模式')
      }
    }
  }

  // 处理输入变化
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => ({ ...prev, [field]: '' }))
    clearError()
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* 顶部标题 */}
        <div className="auth-header">
          <h1>{mode === 'login' ? '欢迎回来' : '创建账户'}</h1>
          <p>
            {mode === 'login'
              ? '登录您的 AI 旅行规划师账户'
              : '开始您的 AI 旅行规划之旅'}
          </p>
        </div>

        {/* 模式切换标签 */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
            type="button"
          >
            登录
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
            type="button"
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* 全局错误提示 */}
          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* 用户名输入（仅注册时显示） */}
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="请输入用户名"
                className={formErrors.username ? 'input-error' : ''}
                disabled={loading}
              />
              {formErrors.username && (
                <span className="field-error">{formErrors.username}</span>
              )}
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
              placeholder={
                mode === 'register'
                  ? '请输入密码（至少6位，包含字母和数字）'
                  : '请输入密码'
              }
              className={formErrors.password ? 'input-error' : ''}
              disabled={loading}
            />
            {formErrors.password && (
              <span className="field-error">{formErrors.password}</span>
            )}
          </div>

          {/* 确认密码输入（仅注册时显示） */}
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="请再次输入密码"
                className={formErrors.confirmPassword ? 'input-error' : ''}
                disabled={loading}
              />
              {formErrors.confirmPassword && (
                <span className="field-error">{formErrors.confirmPassword}</span>
              )}
            </div>
          )}

          {/* 忘记密码（仅登录时显示） */}
          {mode === 'login' && (
            <div className="form-extra">
              <a href="/forgot-password" className="forgot-link">
                忘记密码？
              </a>
            </div>
          )}

          {/* 同意条款（仅注册时显示） */}
          {mode === 'register' && (
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={loading}
                />
                <span>
                  我同意{' '}
                  <a href="/terms" className="link">
                    服务条款
                  </a>{' '}
                  和{' '}
                  <a href="/privacy" className="link">
                    隐私政策
                  </a>
                </span>
              </label>
            </div>
          )}

          {/* 提交按钮 */}
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={loading || (mode === 'register' && !agreedToTerms)}
          >
            {loading
              ? mode === 'login'
                ? '登录中...'
                : '注册中...'
              : mode === 'login'
              ? '登录'
              : '注册'}
          </Button>
        </form>

        {/* 底部提示 */}
        <div className="auth-footer">
          <p>
            {mode === 'login' ? '还没有账户？' : '已有账户？'}
            <button className="auth-link-button" onClick={toggleMode} type="button">
              {mode === 'login' ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>

        {/* OAuth登录（可选） */}
        <div className="oauth-section">
          <div className="divider">
            <span>或</span>
          </div>
          <div className="oauth-buttons">
            <button className="oauth-button" disabled={loading} type="button">
              <span className="oauth-icon">🔍</span>
              使用 Google {mode === 'login' ? '登录' : '注册'}
            </button>
            <button className="oauth-button" disabled={loading} type="button">
              <span className="oauth-icon">💻</span>
              使用 GitHub {mode === 'login' ? '登录' : '注册'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage

