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

【重要要求 - 住宿和行程安排规则】：
1. **每天必须有住宿活动**（最后一天除外）：每天的 activities 数组中必须包含至少一个 type 为 "accommodation" 的活动，表示当天入住的酒店。最后一天如果最后是交通返回，则不需要住宿活动
2. **每天的起始地点**：
   - 如果第一天的第一个活动是交通（type: "transportation"），则从交通开始
   - 否则，第一天的第一个活动应该是住宿（type: "accommodation"），表示从酒店出发
   - 从第二天开始，每天的第一个活动必须是前一天晚上入住的酒店（accommodation），表示从酒店出发
3. **每天的结束地点**：
   - 非最后一天：每天的最后一个活动应该是住宿（type: "accommodation"），表示返回酒店
   - 最后一天：如果最后是交通返回，则交通应该作为最后一个活动，不需要添加酒店返回
4. **交通活动位置要求**：
   - **重要**：交通活动的 location 应该是**目的地（到达车站/机场）**的地址，而不是出发地地址
   - 例如：从南京站坐火车到无锡站，交通活动的 location 应该是"无锡站"的地址
   - 交通活动的 description 应该说明出发地和目的地，例如："从南京站出发，到达无锡站"
5. **酒店位置一致性**：
   - 同一天的住宿活动应该使用相同的酒店位置（相同的地址和坐标）
   - 第二天的第一个活动（酒店）必须与前一天最后一个活动（酒店）使用相同的位置信息
   - 如果需要在不同城市之间移动，请在交通活动后安排新的酒店
6. **酒店信息要求**：
   - 每个住宿活动必须包含完整的 location 信息（address 字段，建议包含 coordinates）
   - 住宿活动的 name 应该是酒店名称
   - 住宿活动的 description 应该包含酒店的特色、位置优势等信息
   - 住宿活动的 estimatedCost 应该是每晚的价格

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
          "name": "前往目的地",
          "description": "从出发地出发，到达目的地",
          "location": {
            "address": "目的地地址（到达车站/机场）"
          },
          "estimatedCost": 100,
          "duration": "2小时",
          "tips": ["建议1"]
        },
        {
          "time": "15:00",
          "type": "accommodation",
          "name": "酒店名称",
          "description": "酒店描述，位置优势等",
          "location": {
            "address": "酒店完整地址",
            "coordinates": {
              "lat": 39.9087,
              "lng": 116.3975
            }
          },
          "estimatedCost": 300,
          "duration": "入住",
          "tips": ["酒店小贴士"]
        },
        {
          "time": "18:00",
          "type": "restaurant",
          "name": "餐厅名称",
          "description": "餐厅描述",
          "location": {
            "address": "餐厅地址"
          },
          "estimatedCost": 100,
          "duration": "1小时",
          "tips": []
        },
        {
          "time": "20:00",
          "type": "accommodation",
          "name": "酒店名称（同一天）",
          "description": "返回酒店",
          "location": {
            "address": "酒店完整地址（与上面相同）",
            "coordinates": {
              "lat": 39.9087,
              "lng": 116.3975
            }
          },
          "estimatedCost": 0,
          "duration": "休息",
          "tips": []
        }
      ],
      "estimatedCost": 500
    },
    {
      "day": 2,
      "date": "2024-01-02",
      "activities": [
        {
          "time": "08:00",
          "type": "accommodation",
          "name": "酒店名称（与前一天相同）",
          "description": "从酒店出发",
          "location": {
            "address": "酒店完整地址（与前一天相同）",
            "coordinates": {
              "lat": 39.9087,
              "lng": 116.3975
            }
          },
          "estimatedCost": 0,
          "duration": "出发",
          "tips": []
        },
        {
          "time": "09:00",
          "type": "attraction",
          "name": "景点名称",
          "description": "景点描述",
          "location": {
            "address": "景点地址"
          },
          "estimatedCost": 50,
          "duration": "2小时",
          "tips": []
        },
        {
          "time": "20:00",
          "type": "accommodation",
          "name": "酒店名称（同一天）",
          "description": "返回酒店",
          "location": {
            "address": "酒店完整地址（与当天第一个活动相同）",
            "coordinates": {
              "lat": 39.9087,
              "lng": 116.3975
            }
          },
          "estimatedCost": 0,
          "duration": "休息",
          "tips": []
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
6. **严格遵守住宿和行程安排规则**：
   - 每天必须有住宿（最后一天除外）
   - 每天从酒店出发（第一天可能是交通）
   - 每天返回酒店（最后一天如果是交通返回，则不需要酒店）
   - 酒店位置保持一致
   - **交通活动的位置必须是目的地（到达车站/机场）的地址**
7. **最后一天特殊处理**：如果最后一天是交通返回，则交通应该作为最后一个活动，不需要添加酒店返回

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

    // 处理每日行程，确保酒店位置一致性
    const processedDailyPlans = processDailyPlans(parsed.dailyPlans || [], request)

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
      dailyPlans: processedDailyPlans,
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

// 处理每日行程，确保酒店位置一致性
const processDailyPlans = (dailyPlans: any[], request: TripRequest): DayPlan[] => {
  if (!dailyPlans || dailyPlans.length === 0) {
    return []
  }

  let previousDayHotel: Activity | null = null // 前一天晚上的酒店
  const totalDays = dailyPlans.length
  const isLastDay = (dayIndex: number) => dayIndex === totalDays - 1

  return dailyPlans.map((dayPlan: any, dayIndex: number) => {
    const activities: Activity[] = (dayPlan.activities || []).map((act: any) => ({
      ...act,
      location: act.location || {}
    }))
    const processedActivities: Activity[] = []

    // 1. 查找当天的住宿活动
    const accommodationActivities = activities.filter((act: any) => act.type === 'accommodation')
    
    // 2. 获取当天的酒店（优先使用有费用或描述详细的住宿活动）
    let currentDayHotel: Activity | null = null
    if (accommodationActivities.length > 0) {
      // 选择费用最高或描述最详细的住宿活动作为当天酒店
      currentDayHotel = accommodationActivities.reduce((prev: any, curr: any) => {
        // 优先选择有完整地址的
        if (curr.location?.address && !prev.location?.address) {
          return curr
        }
        if (prev.location?.address && !curr.location?.address) {
          return prev
        }
        // 其次选择费用最高的
        if ((curr.estimatedCost || 0) > (prev?.estimatedCost || 0)) {
          return curr
        }
        // 再次选择描述最详细的
        if (curr.description && curr.description.length > (prev?.description?.length || 0)) {
          return curr
        }
        return prev
      }, accommodationActivities[0])
    }

    // 3. 处理第一天的特殊情况
    if (dayIndex === 0) {
      const firstActivity = activities[0]
      
      // 如果第一个活动是交通，从交通开始
      if (firstActivity?.type === 'transportation') {
        processedActivities.push(firstActivity)
        // 处理其他非住宿活动
        for (let i = 1; i < activities.length; i++) {
          if (activities[i].type !== 'accommodation') {
            processedActivities.push(activities[i])
          }
        }
        // 交通后需要找到当天的酒店（可能在交通后）
        if (!currentDayHotel && accommodationActivities.length > 0) {
          // 找到交通后的第一个住宿活动
          const hotelAfterTransport = accommodationActivities.find((act: any) => {
            const actIndex = activities.findIndex((a: any) => a === act)
            const transportIndex = activities.findIndex((a: any) => a === firstActivity)
            return actIndex > transportIndex
          })
          if (hotelAfterTransport) {
            currentDayHotel = hotelAfterTransport
          } else {
            // 如果没有找到，使用第一个住宿活动
            currentDayHotel = accommodationActivities[0]
          }
        }
      } else {
        // 如果第一个活动不是交通，需要从酒店开始
        // 如果有酒店，使用酒店；否则创建一个默认酒店
        if (!currentDayHotel && accommodationActivities.length > 0) {
          currentDayHotel = accommodationActivities[0]
        }
        if (!currentDayHotel) {
          // 创建一个默认酒店作为第一个活动
          currentDayHotel = {
            time: '08:00',
            type: 'accommodation',
            name: `${request.destination} 酒店`,
            description: '入住酒店',
            location: {
              address: `${request.destination} 市中心`
            },
            estimatedCost: 0,
            duration: '入住',
            tips: []
          }
        }
        // 添加酒店作为第一个活动（从酒店出发）
        processedActivities.push({
          ...currentDayHotel,
          time: activities[0]?.time || '08:00',
          description: currentDayHotel.description || '从酒店出发',
          estimatedCost: 0 // 出发不计费，入住时再计费
        })
        
        // 处理其他非住宿活动
        activities.forEach((activity: any) => {
          if (activity.type !== 'accommodation' && activity !== firstActivity) {
            processedActivities.push(activity)
          }
        })
      }
    } else {
      // 4. 从第二天开始，第一个活动必须是前一天晚上的酒店
      if (previousDayHotel) {
        processedActivities.push({
          ...previousDayHotel,
          time: '08:00',
          description: '从酒店出发',
          estimatedCost: 0 // 出发不计费
        })
        // 更新当前天的酒店为前一天的酒店（如果当天没有新的酒店）
        if (!currentDayHotel) {
          currentDayHotel = previousDayHotel
        }
      } else if (currentDayHotel) {
        // 如果前一天没有酒店，使用当天的酒店作为第一个活动
        processedActivities.push({
          ...currentDayHotel,
          time: '08:00',
          description: '从酒店出发',
          estimatedCost: 0
        })
      } else {
        // 如果既没有前一天的酒店，也没有当天的酒店，创建一个默认酒店
        currentDayHotel = {
          time: '08:00',
          type: 'accommodation',
          name: `${request.destination} 酒店`,
          description: '入住酒店',
          location: {
            address: `${request.destination} 市中心`
          },
          estimatedCost: 0,
          duration: '入住',
          tips: []
        }
        processedActivities.push({
          ...currentDayHotel,
          time: '08:00',
          description: '从酒店出发',
          estimatedCost: 0
        })
      }
      
      // 处理当天的其他非住宿活动
      activities.forEach((activity: any) => {
        if (activity.type !== 'accommodation') {
          processedActivities.push(activity)
        }
      })
    }

    // 5. 处理每天的结束活动
    // 检查是否是最后一天，且最后一个活动是交通（返回）
    const lastActivityInOriginal = activities[activities.length - 1]
    const isLastActivityTransportation = lastActivityInOriginal?.type === 'transportation'
    
    if (isLastDay(dayIndex) && isLastActivityTransportation) {
      // 最后一天的最后一个活动是交通，不需要添加酒店返回
      // 需要确保交通活动在最后
      const transportationActivities = activities.filter((act: any) => act.type === 'transportation')
      if (transportationActivities.length > 0) {
        const lastTransportation = transportationActivities[transportationActivities.length - 1]
        
        // 检查 processedActivities 中是否已经有这个交通活动
        const hasTransportation = processedActivities.some((act: any) => 
          act.type === 'transportation'
        )
        
        if (!hasTransportation) {
          // 如果交通活动还没有被添加，添加它
          processedActivities.push(lastTransportation)
        } else {
          // 如果已经有交通活动，确保最后一个交通在最后
          // 保留酒店出发活动（第一个活动，如果是住宿类型）
          const hotelStart = processedActivities.length > 0 && 
                            processedActivities[0].type === 'accommodation' && 
                            processedActivities[0].description?.includes('出发')
                            ? processedActivities[0]
                            : null
          
          // 获取所有非交通非住宿活动
          const nonTransportationNonAccommodation = processedActivities.filter((act: any) => 
            act.type !== 'transportation' && 
            !(act.type === 'accommodation' && act.description?.includes('出发'))
          )
          
          // 重新组织：酒店出发 -> 其他活动 -> 交通返回
          processedActivities.length = 0
          if (hotelStart) {
            processedActivities.push(hotelStart)
          }
          processedActivities.push(...nonTransportationNonAccommodation)
          processedActivities.push(lastTransportation)
        }
      }
      
      // 最后一天不需要酒店返回，直接返回
      return {
        day: dayPlan.day || dayIndex + 1,
        date: dayPlan.date || '',
        activities: processedActivities,
        estimatedCost: processedActivities.reduce((sum: number, act: Activity) => {
          return sum + (act.estimatedCost || 0)
        }, 0)
      }
    }
    
    // 非最后一天，确保最后一个是住宿活动（返回酒店）
    // 确定当天的酒店（优先使用当天的酒店，否则使用前一天的酒店）
    let endHotel: Activity | null = currentDayHotel || previousDayHotel
    
    // 如果当天有新的酒店（费用 > 0 或地址不同），使用新酒店
    if (accommodationActivities.length > 0) {
      // 优先选择有费用的住宿活动（表示入住）
      const paidHotel = accommodationActivities.find((act: any) => act.estimatedCost > 0)
      if (paidHotel) {
        endHotel = paidHotel
        currentDayHotel = paidHotel
      } else {
        // 如果没有有费用的，选择地址不同的（表示换酒店）
        const differentAddressHotel = accommodationActivities.find((act: any) => 
          act.location?.address && 
          act.location?.address !== previousDayHotel?.location?.address
        )
        if (differentAddressHotel) {
          endHotel = differentAddressHotel
          currentDayHotel = differentAddressHotel
        } else if (!currentDayHotel) {
          // 如果都没有，使用第一个住宿活动
          endHotel = accommodationActivities[0]
          currentDayHotel = accommodationActivities[0]
        }
      }
    }
    
    // 如果找到了酒店，确保最后一个活动是酒店
    if (endHotel) {
      const lastActivity = processedActivities[processedActivities.length - 1]
      
      // 检查最后一个活动是否已经是酒店
      if (lastActivity?.type === 'accommodation') {
        // 更新最后一个酒店活动，确保使用正确的酒店信息和位置
        // 保留原有费用（如果是入住）或设置为 0（如果是返回）
        const shouldKeepCost = lastActivity.estimatedCost > 0 && 
                               !lastActivity.description?.includes('返回') &&
                               !lastActivity.description?.includes('出发')
        processedActivities[processedActivities.length - 1] = {
          ...endHotel,
          time: lastActivity.time || '20:00',
          description: shouldKeepCost ? lastActivity.description : '返回酒店休息',
          estimatedCost: shouldKeepCost ? lastActivity.estimatedCost : 0 // 保留入住费用，返回不计费
        }
      } else {
        // 添加酒店作为最后一个活动
        processedActivities.push({
          ...endHotel,
          time: '20:00',
          description: '返回酒店休息',
          estimatedCost: 0 // 返回不计费，费用已经在入住时计算
        })
      }
    } else if (accommodationActivities.length > 0) {
      // 如果没有找到酒店，使用最后一个住宿活动
      const lastAccommodation = accommodationActivities[accommodationActivities.length - 1]
      processedActivities.push({
        ...lastAccommodation,
        time: '20:00',
        description: '返回酒店休息',
        estimatedCost: 0
      })
      endHotel = lastAccommodation
      currentDayHotel = lastAccommodation
    } else if (dayIndex > 0 && previousDayHotel) {
      // 如果当天没有住宿活动，但前一天有酒店，使用前一天的酒店
      processedActivities.push({
        ...previousDayHotel,
        time: '20:00',
        description: '返回酒店休息',
        estimatedCost: 0
      })
      endHotel = previousDayHotel
      currentDayHotel = previousDayHotel
    }

    // 6. 确保同一天的酒店位置一致
    // 统一当天的酒店位置信息（使用 endHotel，因为它是最新的）
    if (endHotel && endHotel.location) {
      const hotelLocation = {
        address: endHotel.location.address || '',
        coordinates: endHotel.location.coordinates
      }
      
      // 更新所有住宿活动的位置
      processedActivities.forEach((activity: Activity) => {
        if (activity.type === 'accommodation') {
          activity.location = {
            ...hotelLocation,
            address: hotelLocation.address || activity.location?.address || ''
          }
        }
      })
      
      // 更新 currentDayHotel 的位置
      if (currentDayHotel) {
        currentDayHotel.location = hotelLocation
      }
    }

    // 7. 更新前一天的酒店为当天的酒店（用于下一天）
    if (endHotel) {
      previousDayHotel = {
        ...endHotel,
        location: endHotel.location ? {
          address: endHotel.location.address || '',
          coordinates: endHotel.location.coordinates
        } : undefined
      }
    }

    // 8. 计算当天的预估费用（排除出发和返回的酒店活动，只计算入住的费用）
    const estimatedCost = processedActivities.reduce((sum: number, act: Activity) => {
      // 只计算有费用的活动（入住酒店的费用）
      if (act.type === 'accommodation' && act.estimatedCost > 0) {
        return sum + act.estimatedCost
      } else if (act.type !== 'accommodation') {
        return sum + (act.estimatedCost || 0)
      }
      return sum
    }, 0)

    return {
      day: dayPlan.day || dayIndex + 1,
      date: dayPlan.date || '',
      activities: processedActivities,
      estimatedCost
    }
  })
}

// 检查 AI 配置是否完整
export const isAIConfigured = (): boolean => {
  const config = getAIConfig()
  return !!(config && config.apiKey)
}

// 解析语音输入为行程请求（使用 AI API）
export const parseVoiceInputWithAI = async (text: string): Promise<Partial<TripRequest> | null> => {
  const config = getAIConfig()
  
  if (!config || !config.apiKey) {
    console.warn('AI 配置不可用，使用本地解析')
    return null
  }

  try {
    const prompt = `请从以下用户的语音输入中提取旅行需求信息，并以 JSON 格式返回：

用户语音输入：${text}

请提取以下信息：
1. destination（目的地）：字符串，如果未提及则返回 null
2. days（天数）：数字，1-30之间，如果未提及则返回 null
3. budget（预算）：数字，单位：元，如果未提及则返回 null
4. travelers（人数）：数字，1-20之间，如果未提及则返回 null
5. travelerTypes（同行人类型）：字符串数组，可选值：["成人", "儿童", "老人"]，如果未提及则返回 []
6. preferences（偏好）：字符串数组，可选值：["美食", "动漫", "历史文化", "自然风光", "购物", "休闲"]，如果未提及则返回 []
7. additionalInfo（其他需求）：字符串，如果未提及则返回 ""

注意事项：
- 预算数字需要转换为阿拉伯数字（例如："五千元" → 5000，"五万元" → 50000）
- 天数数字需要转换为阿拉伯数字（例如："五天" → 5）
- 人数数字需要转换为阿拉伯数字（例如："两个人" → 2）
- 只返回 JSON 对象，不要包含其他说明文字

JSON 格式示例：
{
  "destination": "无锡",
  "days": 5,
  "budget": 5000,
  "travelers": 2,
  "travelerTypes": ["成人"],
  "preferences": ["美食", "历史文化"],
  "additionalInfo": ""
}`

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
        console.warn(`不支持的 AI 提供商: ${config.provider}，使用本地解析`)
        return null
    }

    // 解析 AI 返回的 JSON
    try {
      const jsonString = extractJSON(result)
      const parsed = JSON.parse(jsonString)
      
      // 验证和清理数据
      const tripRequest: Partial<TripRequest> = {
        destination: parsed.destination || null,
        days: parsed.days && parsed.days >= 1 && parsed.days <= 30 ? parsed.days : null,
        budget: parsed.budget && parsed.budget >= 100 ? parsed.budget : null,
        travelers: parsed.travelers && parsed.travelers >= 1 && parsed.travelers <= 20 ? parsed.travelers : null,
        travelerTypes: Array.isArray(parsed.travelerTypes) ? parsed.travelerTypes : [],
        preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
        additionalInfo: parsed.additionalInfo || ''
      }

      console.log('AI 解析结果:', tripRequest)
      return tripRequest
    } catch (parseError: any) {
      console.error('解析 AI 返回的 JSON 失败:', parseError)
      console.error('AI 返回内容:', result)
      return null
    }
  } catch (error: any) {
    console.error('AI 解析语音输入失败:', error)
    return null
  }
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

