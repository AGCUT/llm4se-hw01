// AI 配置弹窗组件
import { useState, useEffect } from 'react'
import { saveAIConfig, isAIConfigured, testAIConnection } from '@/api/ai.api'
import type { AIConfig } from '@/api/ai.api'
import './AIConfigModal.css'

interface AIConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

const AIConfigModal = ({ isOpen, onClose }: AIConfigModalProps) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'aliyun',
    apiKey: '',
    model: 'qwen-plus' // 默认使用 qwen-plus
  })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    // 加载已保存的配置
    const savedConfig = localStorage.getItem('ai-config')
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig))
      } catch (error) {
        console.error('加载配置失败:', error)
      }
    }
  }, [isOpen])

  const handleTest = async () => {
    if (!config.apiKey) {
      alert('请输入 API Key')
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      // 临时保存配置用于测试
      saveAIConfig(config)
      
      // 测试连接
      await testAIConnection()
      
      setTestResult({
        success: true,
        message: '✅ API 连接成功！配置可用'
      })
    } catch (error: any) {
      console.error('测试失败:', error)
      setTestResult({
        success: false,
        message: `❌ 测试失败: ${error.message || '未知错误'}`
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    if (!config.apiKey) {
      alert('请输入 API Key')
      return
    }

    saveAIConfig(config)
    alert('✅ AI 配置已保存！现在可以创建行程了')
    onClose()
  }

  const getModelOptions = () => {
    switch (config.provider) {
      case 'aliyun':
        // 阿里云百炼可用模型
        return ['qwen-plus', 'qwen-max', 'qwen-turbo', 'qwen-mt-turbo']
      case 'openai':
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
      case 'deepseek':
        return ['deepseek-chat', 'deepseek-coder']
      default:
        return []
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ AI 配置</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">配置 AI API 以使用智能行程规划功能</p>

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
            <label>API Key *</label>
            <div className="input-with-toggle">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="请输入您的 API Key"
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <small className="hint">存储在浏览器本地，不会上传</small>
          </div>

          {/* 模型 */}
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

          {/* 帮助信息 */}
          <div className="help-box">
            <h4>📚 如何获取 API Key？</h4>
            {config.provider === 'aliyun' && (
              <ol>
                <li>访问 <a href="https://bailian.console.aliyun.com/" target="_blank">阿里云百炼</a></li>
                <li>登录 → API-KEY管理 → 创建</li>
                <li>复制 Key 粘贴到上方</li>
                <li>推荐使用模型：<strong>qwen-plus</strong> 或 <strong>qwen-max</strong></li>
              </ol>
            )}
            {config.provider === 'openai' && (
              <ol>
                <li>访问 <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI</a></li>
                <li>登录 → Create new secret key</li>
                <li>复制 Key 粘贴到上方</li>
              </ol>
            )}
            {config.provider === 'deepseek' && (
              <ol>
                <li>访问 <a href="https://platform.deepseek.com/" target="_blank">DeepSeek</a></li>
                <li>登录 → API Keys → 创建</li>
                <li>复制 Key 粘贴到上方</li>
              </ol>
            )}
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.message}
            </div>
          )}

          {/* 按钮 */}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>
              取消
            </button>
            <button 
              className="btn-test" 
              onClick={handleTest} 
              disabled={!config.apiKey || testing}
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
            <button className="btn-save" onClick={handleSave} disabled={!config.apiKey}>
              保存配置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIConfigModal

