// 中文数字转换工具

// 中文数字映射
const CHINESE_NUMBERS: Record<string, number> = {
  '零': 0,
  '一': 1,
  '二': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '七': 7,
  '八': 8,
  '九': 9,
  '十': 10,
  '壹': 1,
  '贰': 2,
  '叁': 3,
  '肆': 4,
  '伍': 5,
  '陆': 6,
  '柒': 7,
  '捌': 8,
  '玖': 9,
  '拾': 10,
  '百': 100,
  '千': 1000,
  '万': 10000,
  '亿': 100000000
}

// 中文数字单位映射
const CHINESE_UNITS: Record<string, number> = {
  '十': 10,
  '拾': 10,
  '百': 100,
  '千': 1000,
  '万': 10000,
  '亿': 100000000
}

/**
 * 将中文数字转换为阿拉伯数字
 * 支持：五千、五千元、五万元、一万五千元等
 * 示例：
 * - "五千" → 5000
 * - "五千元" → 5000
 * - "五万元" → 50000
 * - "一万五千元" → 15000
 */
export const chineseToNumber = (text: string): number | null => {
  if (!text) return null

  // 先尝试直接匹配阿拉伯数字
  const arabicMatch = text.match(/(\d+)/)
  if (arabicMatch) {
    const num = parseInt(arabicMatch[1])
    // 如果文本包含"万"，且数字小于 10000，则乘以 10000
    // 例如："5万" → 50000
    if (text.includes('万') && !text.includes('千') && num < 10000) {
      return num * 10000
    }
    return num
  }

  // 移除"元"、"块"等单位
  const cleanText = text.replace(/[元块]/g, '')

  // 检查是否包含"万"
  const hasWan = cleanText.includes('万')
  if (hasWan) {
    // 分离"万"前后的部分
    // 例如："五万元" → ["五", "元"] → beforeWan = "五", afterWan = ""
    // 例如："一万五千元" → ["一", "五千元"] → beforeWan = "一", afterWan = "五千"
    const parts = cleanText.split('万')
    const beforeWan = parts[0] || ''
    const afterWan = parts.slice(1).join('万') || '' // 处理多个"万"的情况

    let result = 0

    // 处理"万"前的部分（如"一"、"五"等）
    if (beforeWan) {
      const beforeValue = parseChineseNumber(beforeWan)
      if (beforeValue > 0) {
        result += beforeValue * 10000
      } else {
        // 如果没有解析出值，可能是"万"前面没有数字，默认为1
        result += 10000
      }
    } else {
      // "万"前面没有数字，默认为1（如"万元" = 10000）
      result += 10000
    }

    // 处理"万"后的部分（如"五千"等）
    if (afterWan) {
      const afterValue = parseChineseNumber(afterWan)
      result += afterValue
    }

    return result
  }

  // 没有"万"，直接解析（如"五千" = 5000）
  return parseChineseNumber(cleanText)
}

/**
 * 解析中文数字（不包含"万"的情况）
 * 支持：一、二、三、四、五、六、七、八、九、十、十一、二十、一百、一千等
 */
function parseChineseNumber(text: string): number {
  if (!text) return 0

  // 如果完全是阿拉伯数字
  const arabicMatch = text.match(/^(\d+)$/)
  if (arabicMatch) {
    return parseInt(arabicMatch[1])
  }

  // 移除空格和标点
  const cleanText = text.trim().replace(/[，,。\s]/g, '')

  // 特殊情况：单个数字
  if (cleanText.length === 1) {
    const num = CHINESE_NUMBERS[cleanText]
    if (num !== undefined && num < 10) {
      return num
    }
    if (num === 10) {
      return 10
    }
  }

  let result = 0
  let temp = 0
  let i = 0

  while (i < cleanText.length) {
    const char = cleanText[i]
    const num = CHINESE_NUMBERS[char]

    if (num === undefined) {
      i++
      continue
    }

    if (num < 10) {
      // 单个数字（一、二、三...九）
      temp = num
      i++
    } else if (num === 10) {
      // "十"特殊情况
      if (i === 0) {
        // "十"开头，表示10
        temp = 10
      } else if (temp === 0) {
        // 前面没有数字，表示10
        temp = 10
      } else {
        // 前面有数字，表示乘以10（如"二十" = 2 * 10 = 20）
        temp = temp * 10
      }
      i++
    } else if (num === 100) {
      // "百"
      if (temp === 0) {
        temp = 1
      }
      result += temp * 100
      temp = 0
      i++
    } else if (num === 1000) {
      // "千"
      if (temp === 0) {
        temp = 1
      }
      result += temp * 1000
      temp = 0
      i++
    } else {
      i++
    }
  }

  // 添加剩余的数字
  result += temp

  return result
}

/**
 * 从文本中提取数字（支持中文和阿拉伯数字）
 */
export const extractNumber = (text: string): number | null => {
  if (!text) return null

  // 先尝试提取阿拉伯数字
  const arabicMatch = text.match(/(\d+)/)
  if (arabicMatch) {
    const num = parseInt(arabicMatch[1])
    // 检查是否有"万"
    if (text.includes('万')) {
      return num * 10000
    }
    return num
  }

  // 尝试提取中文数字
  return chineseToNumber(text)
}

/**
 * 从文本中提取预算
 * 支持：预算五千元、预算五万元、五千元、五万元等
 */
export const extractBudget = (text: string): number | null => {
  if (!text) return null

  // 优先级1：匹配"预算"关键字后的内容
  // 例如："预算五千元" → "五千元"
  const budgetMatch = text.match(/预算[是为]?([^，,。\s]+)/)
  if (budgetMatch && budgetMatch[1]) {
    const budgetText = budgetMatch[1].trim()
    // 转换为数字（chineseToNumber 会自动处理"元"和"万"）
    const number = chineseToNumber(budgetText)
    if (number !== null && number >= 100) {
      return number
    }
  }

  // 优先级2：匹配"数字+万+元"的模式（如"五万元"）
  // 注意：要先匹配"万"，再匹配普通的"元"，避免误匹配
  const wanYuanMatch = text.match(/([\u4e00-\u9fa5\d]+)万[元]?/)
  if (wanYuanMatch && wanYuanMatch[1]) {
    const number = chineseToNumber(wanYuanMatch[1])
    if (number !== null && number >= 1) {
      // "五万" = 5 * 10000 = 50000
      return number * 10000
    }
  }

  // 优先级3：匹配"数字+元"的模式（如"五千元"）
  // 注意：要排除包含"万"的情况，避免重复匹配
  const yuanMatch = text.match(/([\u4e00-\u9fa5\d]+)元(?!万)/)
  if (yuanMatch && yuanMatch[1]) {
    const number = chineseToNumber(yuanMatch[1])
    if (number !== null && number >= 100) {
      // "五千" = 5000
      return number
    }
  }

  // 优先级4：匹配"数字+万"的模式（不包含"元"）
  // 例如："五万"
  const wanMatch = text.match(/([\u4e00-\u9fa5\d]+)万(?!元)/)
  if (wanMatch && wanMatch[1]) {
    const number = chineseToNumber(wanMatch[1])
    if (number !== null && number >= 1) {
      return number * 10000
    }
  }

  return null
}

/**
 * 从文本中提取天数
 */
export const extractDays = (text: string): number | null => {
  if (!text) return null

  // 匹配天数相关的文本
  const patterns = [
    /(\d+|[\u4e00-\u9fa5]+)天/,
    /(\d+|[\u4e00-\u9fa5]+)日/,
    /(\d+|[\u4e00-\u9fa5]+)个?日?子/
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const number = extractNumber(match[1])
      if (number !== null && number >= 1 && number <= 30) {
        return number
      }
    }
  }

  return null
}

/**
 * 从文本中提取人数
 */
export const extractTravelers = (text: string): number | null => {
  if (!text) return null

  // 匹配人数相关的文本
  const patterns = [
    /(\d+|[\u4e00-\u9fa5]+)人/,
    /(\d+|[\u4e00-\u9fa5]+)个?人/
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const number = extractNumber(match[1])
      if (number !== null && number >= 1 && number <= 20) {
        return number
      }
    }
  }

  return null
}

