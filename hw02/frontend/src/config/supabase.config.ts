// Supabase客户端配置
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase环境变量未配置，请检查.env.local文件')
  console.warn('需要配置: VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// 验证 Supabase 配置（可在浏览器控制台调用）
export const verifySupabaseSetup = async () => {
  const results = {
    envUrl: !!supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co',
    envKey: !!supabaseAnonKey && supabaseAnonKey !== 'placeholder-key',
    clientUrl: supabaseUrl || '未配置',
    canConnect: false,
    sessionValid: false,
    errors: [] as string[],
    details: {} as any
  }

  console.log('=== Supabase 配置验证 ===')
  console.log('步骤 1: 检查环境变量...')
  console.log('环境变量 URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '未配置')
  console.log('环境变量 Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '未配置')
  console.log('完整 URL:', supabaseUrl)
  console.log('Key 前20字符:', supabaseAnonKey?.substring(0, 20))

  if (!results.envUrl) {
    results.errors.push('VITE_SUPABASE_URL 未配置或使用占位符')
    console.error('❌ URL 未配置')
    return results
  }

  if (!results.envKey) {
    results.errors.push('VITE_SUPABASE_ANON_KEY 未配置或使用占位符')
    console.error('❌ Key 未配置')
    return results
  }

  console.log('✅ 环境变量配置正确')

  // 检查客户端
  console.log('步骤 2: 检查 Supabase 客户端...')
  console.log('Supabase 客户端:', supabase ? '已初始化' : '未初始化')
  if (!supabase) {
    results.errors.push('Supabase 客户端未初始化')
    console.error('❌ 客户端未初始化')
    return results
  }

  // 检查客户端实际使用的 URL
  try {
    // 尝试访问客户端的内部属性
    const clientUrl = (supabase as any).supabaseUrl || (supabase as any).rest?.url || '未知'
    console.log('客户端实际 URL:', clientUrl)
    results.details.clientUrl = clientUrl

    if (clientUrl === 'https://placeholder.supabase.co' || clientUrl.includes('placeholder')) {
      results.errors.push('客户端使用了占位符 URL')
      console.error('❌ 客户端使用了占位符 URL')
      return results
    }
  } catch (e) {
    console.warn('无法检查客户端 URL:', e)
  }

  // 检查 session
  console.log('步骤 3: 检查 session（将发出网络请求）...')
  try {
    console.log('开始调用 supabase.auth.getSession()...')
    const sessionStartTime = Date.now()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    const sessionDuration = Date.now() - sessionStartTime
    console.log(`getSession() 完成，耗时: ${sessionDuration}ms`)
    console.log('Session 响应:', { session: session ? '有 session' : '无 session', error: error?.message })

    if (error) {
      results.errors.push(`获取 session 失败: ${error.message}`)
      console.error('❌ Session 错误:', error)
    } else if (session) {
      results.sessionValid = true
      results.details.userId = session.user?.id
      results.details.userEmail = session.user?.email
      console.log('✅ Session 有效:', { userId: session.user?.id, email: session.user?.email })
    } else {
      results.errors.push('没有有效的 session（用户未登录）')
      console.warn('⚠️ 没有 session（用户未登录）')
    }
  } catch (err: any) {
    results.errors.push(`检查 session 时出错: ${err.message}`)
    console.error('❌ Session 检查异常:', err)
    console.error('错误堆栈:', err.stack)
  }

  // 测试连接
  console.log('步骤 4: 测试连接（将发出网络请求）...')
  try {
    console.log('开始调用 supabase.from("trips").select()...')
    console.log('请求 URL 应该是:', `${supabaseUrl}/rest/v1/trips?select=id&limit=1`)
    
    const queryStartTime = Date.now()
    const { data, error } = await supabase
      .from('trips')
      .select('id')
      .limit(1)
    
    const queryDuration = Date.now() - queryStartTime
    console.log(`查询完成，耗时: ${queryDuration}ms`)
    console.log('查询响应:', { data: data?.length || 0, error: error?.message })

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('permission') || error.message.includes('policy')) {
        results.canConnect = true
        results.errors.push('连接正常，但可能没有查询权限（需要登录或检查 RLS 策略）')
        console.warn('⚠️ 连接正常，但权限不足')
      } else {
        results.errors.push(`连接测试失败: ${error.message} (code: ${error.code})`)
        console.error('❌ 连接测试失败:', error)
      }
    } else {
      results.canConnect = true
      console.log('✅ 连接测试成功')
    }
  } catch (err: any) {
    results.errors.push(`连接测试异常: ${err.message}`)
    console.error('❌ 连接测试异常:', err)
    console.error('错误堆栈:', err.stack)
  }

  console.log('=== 验证完成 ===')
  console.log('验证结果:', results)
  return results
}

// 手动测试网络请求（绕过 Supabase 客户端）
export const testSupabaseConnection = async () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  console.log('=== 手动测试 Supabase 网络连接 ===')
  console.log('URL:', supabaseUrl)
  console.log('Key 前20字符:', supabaseAnonKey?.substring(0, 20))

  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('❌ Supabase URL 未配置')
    return
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
    console.error('❌ Supabase Key 未配置')
    return
  }

  // 测试 1: 直接 fetch 请求
  console.log('\n测试 1: 直接 fetch 请求...')
  try {
    const testUrl = `${supabaseUrl}/rest/v1/trips?select=id&limit=1`
    console.log('请求 URL:', testUrl)
    console.log('开始发送 fetch 请求...')

    const fetchStartTime = Date.now()
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    })

    const fetchDuration = Date.now() - fetchStartTime
    console.log(`fetch 完成，耗时: ${fetchDuration}ms`)
    console.log('响应状态:', response.status, response.statusText)
    console.log('响应头:', Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log('响应内容:', responseText.substring(0, 200))

    if (response.ok) {
      console.log('✅ 网络请求成功')
    } else {
      console.error('❌ 网络请求失败:', response.status, response.statusText)
    }
  } catch (err: any) {
    console.error('❌ fetch 请求异常:', err)
    console.error('错误消息:', err.message)
    console.error('错误堆栈:', err.stack)
  }

  // 测试 2: 检查 Supabase 客户端内部
  console.log('\n测试 2: 检查 Supabase 客户端内部...')
  try {
    console.log('Supabase 客户端:', supabase)
    console.log('客户端类型:', typeof supabase)
    
    // 尝试访问内部属性
    const clientAny = supabase as any
    console.log('客户端属性:', Object.keys(clientAny))
    
    if (clientAny.rest) {
      console.log('REST 客户端:', clientAny.rest)
      if (clientAny.rest.url) {
        console.log('REST URL:', clientAny.rest.url)
      }
    }
    
    if (clientAny.auth) {
      console.log('Auth 客户端:', clientAny.auth)
    }
  } catch (err: any) {
    console.error('❌ 检查客户端异常:', err)
  }
}

// 注意: 验证函数会在 main.tsx 中挂载到 window 对象

// 数据库表类型定义（简化版，建议使用Supabase CLI生成完整类型）
export type Profile = {
  id: string
  username: string | null
  avatar_url: string | null
  phone: string | null
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

export type Trip = {
  id: string
  user_id: string
  title: string
  destination: string
  start_date: string
  end_date: string
  days: number
  budget: number
  travelers: number
  traveler_types: string[]
  preferences: string[]
  overview: Record<string, any> | null
  daily_plans: any[]
  budget_breakdown: Record<string, any> | null
  map_center: Record<string, any> | null
  status: 'DRAFT' | 'CONFIRMED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  is_public: boolean
  share_token: string | null
  version: number
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  trip_id: string
  category: 'TRANSPORTATION' | 'ACCOMMODATION' | 'FOOD' | 'TICKETS' | 'SHOPPING' | 'ENTERTAINMENT' | 'OTHER'
  amount: number
  currency: string
  description: string | null
  payment_method: string | null
  payer: string | null
  receipt_url: string | null
  expense_date: string
  created_at: string
  updated_at: string
}

// 导出类型集合
export type Tables = {
  profiles: Profile
  trips: Trip
  expenses: Expense
}

