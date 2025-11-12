// 登录调试页面 - 帮助诊断登录问题
import { useState } from 'react'
import { supabase } from '@/config/supabase.config'
import { signInWithEmail, getCurrentUser, getCurrentSession } from '@/api/auth.api'
import './Auth.css'

const LoginDebug = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkSupabaseConfig = () => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY

    return {
      url: url || '未配置',
      key: key ? `${key.substring(0, 10)}...` : '未配置',
      urlValid: url && url.startsWith('https://'),
      keyValid: key && key.length > 20
    }
  }

  const testLogin = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('=== 开始登录测试 ===')
      console.log('邮箱:', email)
      console.log('密码:', password ? '***' : '未输入')

      // 1. 检查 Supabase 配置
      const config = checkSupabaseConfig()
      console.log('Supabase 配置:', config)

      if (!config.urlValid || !config.keyValid) {
        throw new Error('Supabase 配置不正确')
      }

      // 2. 测试登录
      console.log('开始调用 signInWithEmail...')
      const { user, session, error } = await signInWithEmail(email, password)

      console.log('登录结果:', { user: user?.id, session: session?.access_token ? '有 session' : '无 session', error })

      if (error) {
        throw error
      }

      if (!user) {
        throw new Error('登录失败：未返回用户信息')
      }

      if (!session) {
        throw new Error('登录失败：未返回会话信息')
      }

      // 3. 测试获取 session
      const sessionData = await getCurrentSession()
      console.log('获取 session:', { session: sessionData ? '有 session' : '无 session' })

      // 4. 测试获取用户
      const userData = await getCurrentUser()
      console.log('获取用户:', { user: userData?.id })

      setResult({
        success: true,
        message: '登录成功！',
        user: {
          id: user.id,
          email: user.email,
          confirmed: user.email_confirmed_at ? '已确认' : '未确认'
        },
        session: {
          accessToken: session.access_token ? '有 token' : '无 token',
          expiresAt: session.expires_at
        },
        config
      })
    } catch (error: any) {
      console.error('登录测试失败:', error)
      setResult({
        success: false,
        message: error.message || '登录失败',
        error: {
          message: error.message,
          status: error.status,
          code: error.code
        },
        config: checkSupabaseConfig()
      })
    } finally {
      setLoading(false)
    }
  }

  const config = checkSupabaseConfig()

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '800px' }}>
        <div className="auth-header">
          <h1>🔍 登录调试工具</h1>
          <p>帮助诊断登录问题</p>
        </div>

        {/* Supabase 配置检查 */}
        <div className="debug-section">
          <h3>📋 Supabase 配置</h3>
          <div className="config-info">
            <div className="config-item">
              <span className="config-label">URL:</span>
              <span className={`config-value ${config.urlValid ? 'valid' : 'invalid'}`}>
                {config.url}
              </span>
            </div>
            <div className="config-item">
              <span className="config-label">API Key:</span>
              <span className={`config-value ${config.keyValid ? 'valid' : 'invalid'}`}>
                {config.key}
              </span>
            </div>
          </div>
        </div>

        {/* 登录测试表单 */}
        <div className="debug-section">
          <h3>🔐 登录测试</h3>
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          <button
            onClick={testLogin}
            disabled={!email || !password || loading}
            style={{
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            {loading ? '测试中...' : '开始测试'}
          </button>
        </div>

        {/* 测试结果 */}
        {result && (
          <div className="debug-section">
            <h3>📊 测试结果</h3>
            <div className={`result-box ${result.success ? 'success' : 'error'}`}>
              <div className="result-header">
                <span className="result-icon">{result.success ? '✅' : '❌'}</span>
                <span className="result-message">{result.message}</span>
              </div>
              
              {result.success ? (
                <div className="result-details">
                  <h4>用户信息</h4>
                  <pre>{JSON.stringify(result.user, null, 2)}</pre>
                  
                  <h4>会话信息</h4>
                  <pre>{JSON.stringify(result.session, null, 2)}</pre>
                </div>
              ) : (
                <div className="result-details">
                  <h4>错误信息</h4>
                  <pre>{JSON.stringify(result.error, null, 2)}</pre>
                  
                  <h4>解决方案</h4>
                  <ul>
                    <li>检查邮箱和密码是否正确</li>
                    <li>检查是否已注册账户</li>
                    <li>检查邮箱是否已验证</li>
                    <li>检查 Supabase 配置是否正确</li>
                    <li>查看浏览器控制台的详细错误信息</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="debug-section">
          <h3>💡 使用说明</h3>
          <ol>
            <li>检查 Supabase 配置是否正确</li>
            <li>输入您的邮箱和密码</li>
            <li>点击"开始测试"</li>
            <li>查看测试结果和错误信息</li>
            <li>根据错误信息解决问题</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default LoginDebug

