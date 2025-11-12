// Settings页面 - AI 配置
import { useState, useEffect } from 'react'
import { saveAIConfig, isAIConfigured } from '@/api/ai.api'
import type { AIConfig } from '@/api/ai.api'
import Button from '@/components/common/Button/Button'
import './Settings.css'

const Settings = () => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'aliyun',
    apiKey: '',
    model: 'qwen-turbo'
  })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // 加载已保存的配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('ai-config')
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig))
      } catch (error) {
        console.error('加载配置失败:', error)
      }
    }
  }, [])

  // 保存配置
  const handleSave = () => {
    if (!config.apiKey) {
      alert('请输入 API Key')
      return
    }

    saveAIConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    alert('✅ AI 配置已保存！')
  }

  // 测试配置
  const handleTest = async () => {
    if (!config.apiKey) {
      alert('请先输入 API Key')
      return
    }

    alert('测试功能待实现，请直接创建行程测试')
  }

  // 清除配置
  const handleClear = () => {
    if (confirm('确定要清除 AI 配置吗？')) {
      localStorage.removeItem('ai-config')
      setConfig({
        provider: 'aliyun',
        apiKey: '',
        model: 'qwen-turbo'
      })
      alert('配置已清除')
    }
  }

  // 获取模型选项
  const getModelOptions = () => {
    switch (config.provider) {
      case 'aliyun':
        return ['qwen-turbo', 'qwen-plus', 'qwen-max']
      case 'openai':
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
      case 'deepseek':
        return ['deepseek-chat', 'deepseek-coder']
      default:
        return []
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-card">
        <h1>⚙️ AI 配置</h1>
        <p className="settings-desc">配置 AI API 以使用智能行程规划功能</p>

        {saved && (
          <div className="success-alert">
            ✅ 配置已保存！
          </div>
        )}

        <div className="settings-form">
          {/* AI 提供商 */}
          <div className="form-group">
            <label>AI 提供商</label>
            <select
              value={config.provider}
              onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
            >
              <option value="aliyun">阿里云百炼（推荐）</option>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
            </select>
          </div>

          {/* API Key */}
          <div className="form-group">
            <label>API Key</label>
            <div className="input-with-toggle">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="请输入您的 API Key"
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <small className="form-hint">
              API Key 将安全地存储在您的浏览器本地，不会上传到服务器
            </small>
          </div>

          {/* 模型选择 */}
          <div className="form-group">
            <label>模型</label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            >
              {getModelOptions().map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {/* API 文档链接 */}
          <div className="api-docs">
            <h4>📚 如何获取 API Key？</h4>
            {config.provider === 'aliyun' && (
              <div className="doc-section">
                <p><strong>阿里云百炼平台：</strong></p>
                <ol>
                  <li>访问 <a href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener noreferrer">阿里云百炼控制台</a></li>
                  <li>登录您的阿里云账号</li>
                  <li>进入"API-KEY管理"</li>
                  <li>创建新的 API Key</li>
                  <li>复制 Key 并粘贴到上方输入框</li>
                </ol>
              </div>
            )}
            {config.provider === 'openai' && (
              <div className="doc-section">
                <p><strong>OpenAI 平台：</strong></p>
                <ol>
                  <li>访问 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API Keys</a></li>
                  <li>登录您的 OpenAI 账号</li>
                  <li>点击"Create new secret key"</li>
                  <li>复制 Key 并粘贴到上方输入框</li>
                </ol>
              </div>
            )}
            {config.provider === 'deepseek' && (
              <div className="doc-section">
                <p><strong>DeepSeek 平台：</strong></p>
                <ol>
                  <li>访问 <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer">DeepSeek 平台</a></li>
                  <li>注册并登录</li>
                  <li>进入 API Keys 页面</li>
                  <li>创建新的 API Key</li>
                  <li>复制 Key 并粘贴到上方输入框</li>
                </ol>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="settings-actions">
            <Button onClick={handleSave} disabled={!config.apiKey}>
              💾 保存配置
            </Button>
            <Button variant="secondary" onClick={handleTest} disabled={!config.apiKey}>
              🧪 测试连接
            </Button>
            <Button variant="danger" onClick={handleClear}>
              🗑️ 清除配置
            </Button>
          </div>

          {/* 状态提示 */}
          <div className={`config-status ${isAIConfigured() ? 'configured' : 'not-configured'}`}>
            {isAIConfigured() ? '✅ AI 已配置' : '⚠️ AI 未配置'}
          </div>
        </div>

        {/* 安全提示 */}
        <div className="security-notice">
          <h4>🔒 安全提示</h4>
          <ul>
            <li>API Key 仅存储在您的浏览器本地（LocalStorage）</li>
            <li>不会上传到任何服务器</li>
            <li>请妥善保管您的 API Key</li>
            <li>不要在公共设备上保存 API Key</li>
            <li>定期更换 API Key 以保证安全</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Settings

