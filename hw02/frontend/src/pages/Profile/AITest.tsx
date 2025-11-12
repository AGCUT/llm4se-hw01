// AI API 测试页面
import { useState } from 'react'
import { testAIConnection } from '@/api/ai.api'
import Button from '@/components/common/Button/Button'
import './AITest.css'

const AITest = () => {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setResult(null)

    try {
      const testResult = await testAIConnection()
      setResult({
        success: true,
        message: '✅ API 连接成功！',
        details: testResult
      })
    } catch (error: any) {
      console.error('测试失败:', error)
      setResult({
        success: false,
        message: `❌ 测试失败: ${error.message || '未知错误'}`,
        details: error
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="ai-test-container">
      <div className="ai-test-card">
        <h2>🔧 AI API 连接测试</h2>
        <p className="test-desc">
          测试当前配置的 AI API Key 是否可用
        </p>

        <div className="test-section">
          <Button
            onClick={handleTest}
            disabled={testing}
            fullWidth
          >
            {testing ? '测试中...' : '开始测试'}
          </Button>
        </div>

        {result && (
          <div className={`test-result ${result.success ? 'success' : 'error'}`}>
            <div className="result-header">
              <h3>{result.message}</h3>
            </div>
            {result.details && (
              <div className="result-details">
                <h4>详细信息：</h4>
                <pre>{JSON.stringify(result.details, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        <div className="test-tips">
          <h4>💡 测试说明</h4>
          <ul>
            <li>测试会发送一个简单的请求到 AI API</li>
            <li>如果成功，说明 API Key 配置正确</li>
            <li>如果失败，请检查 API Key 是否正确</li>
            <li>请确保已在首页配置了 AI API Key</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AITest

