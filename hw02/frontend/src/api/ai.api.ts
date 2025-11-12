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

// 解析 AI 返回的行程计划
const parseTripPlanResponse = (response: string, request: TripRequest): TripPlan => {
  try {
    // 提取 JSON 部分
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析 AI 返回的数据')
    }

    const parsed = JSON.parse(jsonMatch[0])

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
  } catch (error) {
    console.error('解析行程计划失败:', error)
    throw new Error('解析行程计划失败，请重试')
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

