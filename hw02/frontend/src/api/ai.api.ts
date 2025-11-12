// AI 行程规划 API
// 支持多种 LLM 提供商：阿里云百炼、OpenAI、DeepSeek 等

export interface TripRequest {
  destination: string
  days: number
  budget: number
  travelers: number
  travelerTypes?: string[] // 例如：['成人', '儿童']
  preferences?: string[] // 例如：['美食', '动漫', '历史']
  startDate?: string
  additionalInfo?: string // 额外的需求描述
}

export interface DayPlan {
  day: number
  date: string
  activities: Activity[]
  estimatedCost: number
}

export interface Activity {
  time: string
  type: 'transportation' | 'accommodation' | 'attraction' | 'restaurant' | 'other'
  name: string
  description: string
  location?: {
    address: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  estimatedCost: number
  duration?: string
  tips?: string[]
}

export interface TripPlan {
  title: string
  destination: string
  startDate: string
  endDate: string
  days: number
  budget: number
  actualBudget: number
  travelers: number
  overview: {
    highlights: string[]
    tips: string[]
    summary: string
  }
  dailyPlans: DayPlan[]
  budgetBreakdown: {
    transportation: number
    accommodation: number
    food: number
    attractions: number
    other: number
  }
}

// AI 配置接口
export interface AIConfig {
  provider: 'aliyun' | 'openai' | 'deepseek' | 'custom'
  apiKey: string
  model?: string
  endpoint?: string
}

// 从 localStorage 获取 AI 配置
const getAIConfig = (): AIConfig | null => {
  const config = localStorage.getItem('ai-config')
  if (config) {
    try {
      return JSON.parse(config)
    } catch (error) {
      console.error('解析 AI 配置失败:', error)
    }
  }
  return null
}

// 保存 AI 配置
export const saveAIConfig = (config: AIConfig) => {
  localStorage.setItem('ai-config', JSON.stringify(config))
}

// 生成行程计划（调用 AI API）
export const generateTripPlan = async (request: TripRequest): Promise<TripPlan> => {
  const config = getAIConfig()
  
  if (!config || !config.apiKey) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  // 构建 prompt
  const prompt = buildTripPlanningPrompt(request)

  try {
    let result: string

    switch (config.provider) {
      case 'aliyun':
        result = await callAliyunAPI(prompt, config)
        break
      case 'openai':
        result = await callOpenAIAPI(prompt, config)
        break
      case 'deepseek':
        result = await callDeepSeekAPI(prompt, config)
        break
      default:
        throw new Error(`不支持的 AI 提供商: ${config.provider}`)
    }

    // 解析 AI 返回的 JSON
    return parseTripPlanResponse(result, request)
  } catch (error: any) {
    console.error('生成行程失败:', error)
    throw new Error(error.message || '生成行程失败，请重试')
  }
}

// 构建行程规划 Prompt
const buildTripPlanningPrompt = (request: TripRequest): string => {
  return `你是一个专业的旅行规划师。请根据以下信息生成一份详细的旅行计划：

目的地：${request.destination}
旅行天数：${request.days}天
预算：${request.budget}元
旅行人数：${request.travelers}人
${request.travelerTypes && request.travelerTypes.length > 0 ? `同行人类型：${request.travelerTypes.join('、')}` : ''}
${request.preferences && request.preferences.length > 0 ? `旅行偏好：${request.preferences.join('、')}` : ''}
${request.startDate ? `出发日期：${request.startDate}` : ''}
${request.additionalInfo ? `其他需求：${request.additionalInfo}` : ''}

请生成一份包含以下内容的旅行计划（以 JSON 格式返回）：

1. 行程概览（highlights, tips, summary）
2. 每日详细安排（包括时间、活动、地点、预计费用）
3. 预算分解（交通、住宿、餐饮、景点、其他）

JSON 格式示例：
{
  "title": "行程标题",
  "overview": {
    "highlights": ["亮点1", "亮点2"],
    "tips": ["提示1", "提示2"],
    "summary": "行程概述"
  },
  "dailyPlans": [
    {
      "day": 1,
      "date": "2024-01-01",
      "activities": [
        {
          "time": "09:00",
          "type": "transportation",
          "name": "活动名称",
          "description": "详细描述",
          "location": {
            "address": "具体地址"
          },
          "estimatedCost": 100,
          "duration": "2小时",
          "tips": ["建议1"]
        }
      ],
      "estimatedCost": 500
    }
  ],
  "budgetBreakdown": {
    "transportation": 1000,
    "accommodation": 2000,
    "food": 1500,
    "attractions": 1000,
    "other": 500
  }
}

请确保：
1. 行程安排合理，时间充裕
2. 预算控制在${request.budget}元以内
3. 考虑同行人特点（如带孩子需要安排适合的活动）
4. 包含具体的餐厅、景点推荐
5. 提供实用的旅行建议

只返回 JSON 数据，不要包含其他说明文字。`
}

// 调用阿里云百炼 API（使用 OpenAI 兼容接口）
const callAliyunAPI = async (prompt: string, config: AIConfig): Promise<string> => {
  // 使用 OpenAI 兼容接口
  const endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'qwen-plus', // 默认使用 qwen-plus
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  })

  const data = await response.json()

  // 检查是否有错误码
  if (data.error) {
    throw new Error(`API 错误: ${data.error.message || data.error.code || '未知错误'}`)
  }

  if (!response.ok) {
    throw new Error(`API 请求失败 (${response.status}): ${data.error?.message || response.statusText || JSON.stringify(data)}`)
  }

  // 获取响应内容（OpenAI 兼容格式）
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    console.error('API 响应数据:', data)
    throw new Error(`无法获取 AI 响应内容。响应数据: ${JSON.stringify(data)}`)
  }

  return content
}

// 调用 OpenAI API
const callOpenAIAPI = async (prompt: string, config: AIConfig): Promise<string> => {
  const endpoint = config.endpoint || 'https://api.openai.com/v1/chat/completions'
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// 调用 DeepSeek API
const callDeepSeekAPI = async (prompt: string, config: AIConfig): Promise<string> => {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// 提取 JSON 字符串（使用括号匹配确保完整性）
const extractJSON = (text: string): string => {
  // 方法1: 尝试从 Markdown 代码块中提取
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim()
  }
  
  // 方法2: 使用括号匹配找到完整的 JSON 对象
  const firstBrace = text.indexOf('{')
  if (firstBrace === -1) {
    throw new Error('无法找到 JSON 起始位置')
  }
  
  let braceCount = 0
  let inString = false
  let escapeNext = false
  let jsonEnd = -1
  
  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i]
    
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      escapeNext = true
      continue
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++
      } else if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          jsonEnd = i
          break
        }
      }
    }
  }
  
  if (jsonEnd === -1) {
    throw new Error('无法找到完整的 JSON 对象')
  }
  
  return text.substring(firstBrace, jsonEnd + 1)
}

// 解析 AI 返回的行程计划
const parseTripPlanResponse = (response: string, request: TripRequest): TripPlan => {
  try {
    console.log('=== 解析 AI 返回的行程计划 ===')
    console.log('原始响应长度:', response.length)
    console.log('原始响应前500字符:', response.substring(0, 500))
    
    // 提取 JSON 字符串
    let jsonString: string
    try {
      jsonString = extractJSON(response)
      console.log('成功提取 JSON')
    } catch (extractError: any) {
      console.error('提取 JSON 失败:', extractError)
      // 如果提取失败，尝试简单的方法
      const firstBrace = response.indexOf('{')
      const lastBrace = response.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = response.substring(firstBrace, lastBrace + 1)
        console.log('使用简单方法提取 JSON')
      } else {
        throw new Error('无法找到 JSON 内容')
      }
    }
    
    // 清理 JSON 字符串
    // 由于已经使用括号匹配提取，理论上应该是完整的 JSON
    // 但仍然需要处理一些常见问题
    
    // 1. 移除多余的空白字符
    jsonString = jsonString.trim()
    
    // 2. 处理 AI 返回的省略号模式（[...] 和 {...}）
    // 这些模式不是有效的 JSON，需要替换为有效的空数组或空对象
    console.log('检查省略号模式...')
    
    // 先统计省略号出现的次数
    const ellipsisInArray = (jsonString.match(/\[\s*\.\.\.\s*\]/g) || []).length
    const ellipsisInObject = (jsonString.match(/\{\s*\.\.\.\s*\}/g) || []).length
    
    if (ellipsisInArray > 0) {
      console.log(`发现 ${ellipsisInArray} 处数组省略号 [...]`)
    }
    if (ellipsisInObject > 0) {
      console.log(`发现 ${ellipsisInObject} 处对象省略号 {...}`)
    }
    
    // 使用正则表达式替换（简单高效）
    // 处理数组中的省略号 [...]
    jsonString = jsonString.replace(/\[\s*\.\.\.\s*\]/g, '[]')
    
    // 处理对象中的省略号 {...}
    jsonString = jsonString.replace(/\{\s*\.\.\.\s*\}/g, '{}')
    
    // 处理可能的多行格式
    jsonString = jsonString.replace(/\[\s*\n\s*\.\.\.\s*\n\s*\]/g, '[]')
    jsonString = jsonString.replace(/\{\s*\n\s*\.\.\.\s*\n\s*\}/g, '{}')
    
    // 3. 移除可能的注释（虽然 JSON 不支持注释，但 AI 可能会添加）
    // 注意：只在字符串外移除注释
    jsonString = jsonString.replace(/\/\/[^\n"']*$/gm, '') // 移除单行注释（不在字符串中）
    jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
    
    // 4. 修复多余的逗号（在对象和数组的末尾）
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1') // 移除末尾多余的逗号
    
    // 5. 处理末尾的省略号（如果 JSON 被截断）
    if (jsonString.includes('...')) {
      // 检查是否在字符串内部（这是合法的）
      // 如果不在字符串内部，则可能是截断的 JSON
      const lastThreeDots = jsonString.lastIndexOf('...')
      if (lastThreeDots !== -1) {
        // 检查这三个点是否在字符串内
        let checkInString = false
        let checkEscapeNext = false
        
        for (let j = 0; j < lastThreeDots; j++) {
          const char = jsonString[j]
          if (checkEscapeNext) {
            checkEscapeNext = false
            continue
          }
          if (char === '\\') {
            checkEscapeNext = true
            continue
          }
          if (char === '"') {
            checkInString = !checkInString
          }
        }
        
        const isInString = checkInString
        
        if (!isInString) {
          // 不在字符串内，可能是截断的 JSON
          // 尝试找到最后一个完整的结构
          const lastBrace = jsonString.lastIndexOf('}')
          const lastBracket = jsonString.lastIndexOf(']')
          const lastComplete = Math.max(lastBrace, lastBracket)
          
          if (lastComplete > 0 && lastComplete < lastThreeDots) {
            // 省略号在最后，可能是截断标记
            console.log('检测到末尾省略号，可能表示内容被截断')
          }
        }
      }
    }
    
    jsonString = jsonString.trim()
    
    console.log('清理后的 JSON 长度:', jsonString.length)
    console.log('清理后的 JSON 前200字符:', jsonString.substring(0, 200))
    
    // 尝试解析 JSON
    let parsed: any
    try {
      parsed = JSON.parse(jsonString)
    } catch (parseError: any) {
      console.error('JSON 解析失败:', parseError)
      console.error('尝试解析的 JSON:', jsonString.substring(0, 500))
      
      // 如果解析失败，尝试修复常见问题
      try {
        // 尝试修复未闭合的字符串
        jsonString = jsonString.replace(/(".*?)"([^,}\]]*?)"([^,}\]]*?)"/g, '$1\\"$2\\"$3"')
        // 尝试修复未转义的特殊字符
        jsonString = jsonString.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
        parsed = JSON.parse(jsonString)
      } catch (retryError) {
        // 如果还是失败，输出更详细的错误信息
        console.error('JSON 解析重试失败:', retryError)
        console.error('原始响应:', response)
        throw new Error(`JSON 解析失败: ${parseError.message}。请检查 AI 返回的内容是否为有效的 JSON 格式。`)
      }
    }

    // 计算日期
    const startDate = request.startDate || new Date().toISOString().split('T')[0]
    const endDate = new Date(new Date(startDate).getTime() + (request.days - 1) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // 计算实际预算
    const actualBudget = parsed.budgetBreakdown
      ? Object.values(parsed.budgetBreakdown).reduce((sum: number, val: any) => sum + Number(val), 0)
      : request.budget

    return {
      title: parsed.title || `${request.destination} ${request.days}日游`,
      destination: request.destination,
      startDate,
      endDate,
      days: request.days,
      budget: request.budget,
      actualBudget,
      travelers: request.travelers,
      overview: parsed.overview || {
        highlights: [],
        tips: [],
        summary: ''
      },
      dailyPlans: parsed.dailyPlans || [],
      budgetBreakdown: parsed.budgetBreakdown || {
        transportation: 0,
        accommodation: 0,
        food: 0,
        attractions: 0,
        other: 0
      }
    }
  } catch (error: any) {
    console.error('解析行程计划失败:', error)
    console.error('错误类型:', error?.constructor?.name)
    console.error('错误消息:', error?.message)
    console.error('错误堆栈:', error?.stack)
    console.error('原始响应:', response.substring(0, 1000))
    
    // 提供更详细的错误信息
    if (error.message?.includes('JSON')) {
      throw new Error(`解析行程计划失败: ${error.message}\n\n请确保 AI 返回的是有效的 JSON 格式。如果问题持续，请尝试重新生成行程。`)
    }
    
    throw new Error(`解析行程计划失败: ${error.message || '未知错误'}。请重试。`)
  }
}

// 检查 AI 配置是否完整
export const isAIConfigured = (): boolean => {
  const config = getAIConfig()
  return !!(config && config.apiKey)
}

// 测试 AI API 连接
export const testAIConnection = async (): Promise<any> => {
  const config = getAIConfig()
  
  if (!config || !config.apiKey) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  const testPrompt = '你好，请回复"测试成功"'

  try {
    let result: string
    let responseData: any

    switch (config.provider) {
      case 'aliyun':
        // 使用 OpenAI 兼容接口
        const aliyunEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
        const aliyunResponse = await fetch(aliyunEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model || 'qwen-plus', // 默认使用 qwen-plus
            messages: [
              {
                role: 'user',
                content: testPrompt
              }
            ]
          })
        })

        responseData = await aliyunResponse.json()
        
        // 检查错误
        if (responseData.error) {
          throw new Error(`API 错误: ${responseData.error.message || responseData.error.code || '未知错误'}`)
        }

        if (!aliyunResponse.ok) {
          throw new Error(`API 请求失败 (${aliyunResponse.status}): ${responseData.error?.message || JSON.stringify(responseData)}`)
        }

        // 获取响应内容（OpenAI 兼容格式）
        result = responseData.choices?.[0]?.message?.content || JSON.stringify(responseData)
        break

      case 'openai':
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model || 'gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: testPrompt
              }
            ]
          })
        })

        responseData = await openaiResponse.json()
        
        if (!openaiResponse.ok) {
          throw new Error(`API 请求失败 (${openaiResponse.status}): ${JSON.stringify(responseData)}`)
        }

        result = responseData.choices?.[0]?.message?.content || JSON.stringify(responseData)
        break

      case 'deepseek':
        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model || 'deepseek-chat',
            messages: [
              {
                role: 'user',
                content: testPrompt
              }
            ]
          })
        })

        responseData = await deepseekResponse.json()
        
        if (!deepseekResponse.ok) {
          throw new Error(`API 请求失败 (${deepseekResponse.status}): ${JSON.stringify(responseData)}`)
        }

        result = responseData.choices?.[0]?.message?.content || JSON.stringify(responseData)
        break

      default:
        throw new Error(`不支持的 AI 提供商: ${config.provider}`)
    }

    return {
      provider: config.provider,
      model: config.model,
      response: result,
      rawResponse: responseData
    }
  } catch (error: any) {
    console.error('测试 AI 连接失败:', error)
    throw new Error(error.message || '测试失败，请检查 API Key 和网络连接')
  }
}

