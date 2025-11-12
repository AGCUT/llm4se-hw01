// 行程相关API
import { supabase } from '@/config/supabase.config'
import { getCurrentUser } from './auth.api'
import { useAuthStore } from '@/store/authStore'
import type { TripPlan } from './ai.api'

// 验证 Supabase 配置和连接
export const verifySupabaseConfig = async () => {
  const results = {
    configValid: false,
    clientInitialized: false,
    sessionValid: false,
    canConnect: false,
    errors: [] as string[],
    details: {} as any
  }

  try {
    // 1. 检查环境变量
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    console.log('=== 验证 Supabase 配置 ===')
    console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '未配置')
    console.log('Supabase Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '未配置')

    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      results.errors.push('Supabase URL 未配置或使用占位符')
      return results
    }

    if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
      results.errors.push('Supabase Anon Key 未配置或使用占位符')
      return results
    }

    results.configValid = true
    results.details.url = supabaseUrl
    results.details.keyPrefix = supabaseAnonKey.substring(0, 20) + '...'

    // 2. 检查客户端是否初始化
    if (!supabase) {
      results.errors.push('Supabase 客户端未初始化')
      return results
    }

    results.clientInitialized = true

    // 3. 检查 session（带超时保护）
    console.log('步骤 3: 检查 session...')
    try {
      console.log('开始调用 supabase.auth.getSession()...')
      const sessionStartTime = Date.now()
      
      // 添加超时保护
      const sessionPromise = supabase.auth.getSession()
      const sessionTimeout = new Promise((resolve) => 
        setTimeout(() => {
          console.warn('⚠️ getSession() 超时（5秒）')
          resolve({ data: { session: null }, error: { message: 'Session 获取超时' } })
        }, 5000) // 5秒超时
      )
      
      const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, sessionTimeout]) as any
      
      const sessionDuration = Date.now() - sessionStartTime
      console.log(`getSession() 完成，耗时: ${sessionDuration}ms`)
      
      if (sessionError) {
        if (sessionError.message === 'Session 获取超时') {
          results.errors.push('获取 session 超时（5秒），请检查网络连接')
          console.error('❌ Session 获取超时')
        } else {
          results.errors.push(`获取 session 失败: ${sessionError.message}`)
          console.error('❌ Session 错误:', sessionError)
        }
      } else if (session) {
        results.sessionValid = true
        results.details.userId = session.user?.id
        results.details.sessionExpiresAt = session.expires_at
        console.log('✅ Session 有效:', { userId: session.user?.id })
      } else {
        results.errors.push('没有有效的 session（用户未登录）')
        console.warn('⚠️ 没有 session（用户未登录）')
      }
    } catch (sessionErr: any) {
      results.errors.push(`检查 session 时出错: ${sessionErr.message}`)
      console.error('❌ Session 检查异常:', sessionErr)
    }

    // 4. 测试连接（尝试查询一个简单的表，带超时保护）
    console.log('步骤 4: 测试连接...')
    try {
      console.log('开始调用 supabase.from("trips").select()...')
      const queryStartTime = Date.now()
      
      // 添加超时保护
      const queryPromise = supabase
        .from('trips')
        .select('id')
        .limit(1)
      
      const queryTimeout = new Promise((resolve) => 
        setTimeout(() => {
          console.warn('⚠️ 查询超时（10秒）')
          resolve({ data: null, error: { message: '查询超时', code: 'TIMEOUT' } })
        }, 10000) // 10秒超时
      )
      
      const { error: testError } = await Promise.race([queryPromise, queryTimeout]) as any
      
      const queryDuration = Date.now() - queryStartTime
      console.log(`查询完成，耗时: ${queryDuration}ms`)

      if (testError) {
        if (testError.code === 'TIMEOUT') {
          results.errors.push('连接测试超时（10秒），请检查网络连接')
          console.error('❌ 连接测试超时')
        } else if (testError.code === 'PGRST116' || testError.message.includes('permission') || testError.message.includes('policy')) {
          results.canConnect = true
          results.errors.push('连接正常，但可能没有查询权限（需要登录或检查 RLS 策略）')
          console.warn('⚠️ 连接正常，但权限不足')
        } else {
          results.errors.push(`连接测试失败: ${testError.message} (code: ${testError.code})`)
          console.error('❌ 连接测试失败:', testError)
        }
      } else {
        results.canConnect = true
        console.log('✅ Supabase 连接测试成功')
      }
    } catch (testErr: any) {
      results.errors.push(`连接测试异常: ${testErr.message}`)
      console.error('❌ 连接测试异常:', testErr)
    }

    console.log('验证结果:', results)
    return results
  } catch (error: any) {
    results.errors.push(`验证过程出错: ${error.message}`)
    console.error('验证 Supabase 配置失败:', error)
    return results
  }
}

// 获取当前用户（优先使用 authStore，避免重复调用 API）
const getCurrentUserFast = async () => {
  try {
    // 1. 先尝试从 authStore 获取
    const state = useAuthStore.getState()
    if (state.user) {
      console.log('从 authStore 获取用户:', state.user.id)
      return state.user
    }
    
    // 2. 如果 authStore 中没有，尝试从 session 获取（更快）
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('从 session 获取用户:', session.user.id)
        // 更新 authStore
        useAuthStore.getState().setUser(session.user)
        useAuthStore.getState().setSession(session)
        return session.user
      }
    } catch (sessionError) {
      console.warn('获取 session 失败:', sessionError)
    }
    
    // 3. 最后尝试调用 getCurrentUser API（带超时保护）
    console.log('尝试调用 getCurrentUser API...')
    const userPromise = getCurrentUser()
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => {
        console.warn('getCurrentUser API 超时（3秒）')
        resolve(null)
      }, 3000) // 增加到 3 秒
    )
    const user = await Promise.race([userPromise, timeoutPromise]) as any
    
    if (user) {
      console.log('从 API 获取用户:', user.id)
      // 更新 authStore
      useAuthStore.getState().setUser(user)
      return user
    }
    
    console.error('无法获取用户信息：authStore、session 和 API 都失败')
    return null
  } catch (error) {
    console.error('getCurrentUserFast 错误:', error)
    return null
  }
}

// 获取用户所有行程
export const getTrips = async () => {
  const user = await getCurrentUserFast()

  if (!user) {
    throw new Error('用户未登录或获取用户信息超时')
  }

  console.log('开始查询行程，用户ID:', user.id)

  // 获取 session（优先使用 authStore）
  let session: any = null
  const authStoreState = useAuthStore.getState()
  if (authStoreState.session) {
    session = authStoreState.session
    console.log('使用 authStore 中的 session')
  } else {
    // 尝试从 Supabase 获取 session（带超时）
    try {
      const sessionPromise = supabase.auth.getSession()
      const sessionTimeout = new Promise((resolve) => 
        setTimeout(() => resolve({ data: { session: null } }), 3000)
      )
      const { data: { session: sessionData } } = await Promise.race([sessionPromise, sessionTimeout]) as any
      session = sessionData
    } catch (e) {
      console.warn('获取 session 失败，尝试使用 anon key')
    }
  }

  if (!session?.access_token) {
    throw new Error('没有有效的 session，请重新登录')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  try {
    console.log('使用 fetch 查询行程...')
    const queryUrl = `${supabaseUrl}/rest/v1/trips?user_id=eq.${user.id}&order=created_at.desc`
    console.log('查询 URL:', queryUrl)
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    })

    console.log('查询响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 查询失败 - 响应内容:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        throw new Error(`获取行程失败 (${response.status}): ${errorData.message || errorData.error || errorText}`)
      } catch (parseError) {
        throw new Error(`获取行程失败 (${response.status}): ${errorText}`)
      }
    }

    const data = await response.json()
    console.log('✅ 查询行程成功，返回数据:', data?.length || 0, '条')
    if (data && data.length > 0) {
      console.log('行程数据示例:', data[0])
    }
    return Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error('getTrips 捕获错误:', error)
    if (error?.message) {
      throw error
    }
    throw new Error(`获取行程失败: ${error.message || '未知错误'}`)
  }
}

// 获取单个行程详情
export const getTripById = async (id: string) => {
  const user = await getCurrentUserFast()
  if (!user) {
    throw new Error('用户未登录或获取用户信息超时')
  }

  // 获取 session（优先使用 authStore）
  let session: any = null
  const authStoreState = useAuthStore.getState()
  if (authStoreState.session) {
    session = authStoreState.session
  } else {
    try {
      const sessionPromise = supabase.auth.getSession()
      const sessionTimeout = new Promise((resolve) => 
        setTimeout(() => resolve({ data: { session: null } }), 3000)
      )
      const { data: { session: sessionData } } = await Promise.race([sessionPromise, sessionTimeout]) as any
      session = sessionData
    } catch (e) {
      console.warn('获取 session 失败')
    }
  }

  if (!session?.access_token) {
    throw new Error('没有有效的 session，请重新登录')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  try {
    console.log('使用 fetch 查询行程详情...')
    const queryUrl = `${supabaseUrl}/rest/v1/trips?id=eq.${id}&user_id=eq.${user.id}&select=*`
    console.log('查询 URL:', queryUrl)
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 查询失败 - 响应内容:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        throw new Error(`获取行程详情失败 (${response.status}): ${errorData.message || errorData.error || errorText}`)
      } catch (parseError) {
        throw new Error(`获取行程详情失败 (${response.status}): ${errorText}`)
      }
    }

    const data = await response.json()
    console.log('✅ 查询行程详情成功:', data)
    
    // 返回单个对象（如果返回数组，取第一个）
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error('行程不存在')
      }
      return data[0]
    }
    return data
  } catch (error: any) {
    console.error('getTripById 捕获错误:', error)
    if (error?.message) {
      throw error
    }
    throw new Error(`获取行程详情失败: ${error.message || '未知错误'}`)
  }
}

// 创建行程（从 AI 生成的计划）
export const createTripFromPlan = async (plan: TripPlan) => {
  console.log('=== 开始创建行程 ===')
  
  // 1. 快速检查配置（不阻塞，只检查基本配置）
  console.log('步骤 1: 快速检查 Supabase 配置...')
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    throw new Error('Supabase URL 未配置，请在 .env.local 文件中设置 VITE_SUPABASE_URL')
  }
  
  if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
    throw new Error('Supabase Anon Key 未配置，请在 .env.local 文件中设置 VITE_SUPABASE_ANON_KEY')
  }
  
  if (!supabase) {
    throw new Error('Supabase 客户端未初始化')
  }
  
  console.log('✅ 基本配置检查通过')

  // 2. 获取用户
  console.log('步骤 2: 获取用户信息...')
  const user = await getCurrentUserFast()

  if (!user) {
    const errorMsg = '用户未登录或获取用户信息超时'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  console.log('用户信息:', { id: user.id, email: user.email })

  // 3. 准备数据
  console.log('步骤 3: 准备行程数据...')
  const startDate = plan.startDate || new Date().toISOString().split('T')[0]
  const endDate = plan.endDate || new Date(Date.now() + (plan.days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const tripData = {
    user_id: user.id,
    title: plan.title || `${plan.destination} ${plan.days}日游`,
    destination: plan.destination,
    start_date: startDate,
    end_date: endDate,
    days: plan.days,
    budget: plan.budget,
    travelers: plan.travelers,
    traveler_types: [], // 可以后续从 request 中获取
    preferences: [], // 可以后续从 request 中获取
    overview: plan.overview || {
      highlights: [],
      tips: [],
      summary: ''
    },
    daily_plans: plan.dailyPlans || [],
    budget_breakdown: plan.budgetBreakdown || {
      transportation: 0,
      accommodation: 0,
      food: 0,
      attractions: 0,
      other: 0
    },
    status: 'DRAFT' as const,
    is_public: false,
    version: 1
  }

  console.log('行程数据准备完成:', {
    user_id: tripData.user_id,
    title: tripData.title,
    destination: tripData.destination,
    days: tripData.days,
    budget: tripData.budget,
    status: tripData.status
  })

  // 4. 检查 session 是否有效（带超时保护）
  console.log('步骤 4: 检查 session...')
  let session: any = null
  
  try {
    console.log('开始调用 supabase.auth.getSession()...')
    const sessionStartTime = Date.now()
    
    // 添加超时保护
    const sessionPromise = supabase.auth.getSession()
    const sessionTimeout = new Promise((resolve) => 
      setTimeout(() => {
        console.warn('⚠️ getSession() 超时（3秒），使用 authStore 中的 session')
        resolve({ data: { session: null }, error: { message: 'Session 获取超时' } })
      }, 3000) // 3秒超时
    )
    
    const { data: { session: sessionData }, error: sessionError } = await Promise.race([sessionPromise, sessionTimeout]) as any
    
    const sessionDuration = Date.now() - sessionStartTime
    console.log(`getSession() 完成，耗时: ${sessionDuration}ms`)
    
    if (sessionError && sessionError.message !== 'Session 获取超时') {
      console.error('获取 session 失败:', sessionError)
      // 不立即抛出错误，尝试从 authStore 获取
    } else if (sessionData) {
      session = sessionData
      console.log('Session 有效:', { userId: session.user?.id, expiresAt: session.expires_at })
    }
  } catch (sessionCheckError: any) {
    console.error('检查 session 时出错:', sessionCheckError)
    // 继续尝试从 authStore 获取
  }
  
  // 如果 session 为空，尝试从 authStore 获取
  if (!session) {
    const authStoreState = useAuthStore.getState()
    if (authStoreState.session) {
      session = authStoreState.session
      console.log('⚠️ 使用 authStore 中的 session:', { userId: session.user?.id })
    } else {
      throw new Error('没有有效的 session，请重新登录')
    }
  }
  
  // 确保 session 中有 access_token
  if (!session.access_token) {
    throw new Error('Session 中没有 access_token，请重新登录')
  }
  console.log('Session access_token 前20字符:', session.access_token.substring(0, 20) + '...')

  // 5. 执行插入
  console.log('步骤 5: 执行插入操作...')
  console.log('插入 URL:', `${supabaseUrl}/rest/v1/trips`)
  console.log('插入数据（简化）:', {
    user_id: tripData.user_id,
    title: tripData.title,
    destination: tripData.destination,
    days: tripData.days,
    budget: tripData.budget
  })
  
  // 检查数据大小
  try {
    const dataString = JSON.stringify(tripData)
    console.log('数据大小:', dataString.length, '字符')
    console.log('完整数据前500字符:', dataString.substring(0, 500))
    
    // 检查是否有循环引用或其他问题
    if (dataString.length > 100000) {
      console.warn('⚠️ 数据较大，可能影响性能')
    }
  } catch (stringifyError: any) {
    console.error('❌ 序列化数据失败:', stringifyError)
    throw new Error(`数据序列化失败: ${stringifyError.message}`)
  }

  try {
    console.log('开始插入操作...')
    console.log('⚠️ 注意: 请打开 Network 面板，查看是否有 POST 请求发送到 /rest/v1/trips')
    
    // 直接使用手动 fetch 插入数据
    // 这样可以绕过 Supabase 客户端可能存在的问题（如 getSession() 超时）
    console.log('使用手动 fetch 插入数据...')
    console.log('准备发送 POST 请求到:', `${supabaseUrl}/rest/v1/trips`)
    console.log('请求头:', {
      'apikey': supabaseAnonKey.substring(0, 20) + '...',
      'Authorization': `Bearer ${session.access_token.substring(0, 20)}...`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    })
    
    const fetchStartTime = Date.now()
    const response = await fetch(`${supabaseUrl}/rest/v1/trips`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(tripData)
    })
    
    const fetchDuration = Date.now() - fetchStartTime
    console.log(`fetch 请求完成，耗时: ${fetchDuration}ms`)
    console.log('响应状态:', response.status, response.statusText)
    console.log('响应头:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 插入失败 - 响应内容:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        console.error('错误详情:', errorData)
        throw new Error(`插入失败 (${response.status}): ${errorData.message || errorData.error || errorText}`)
      } catch (parseError) {
        throw new Error(`插入失败 (${response.status}): ${errorText}`)
      }
    }
    
    const responseData = await response.json()
    console.log('✅ 响应数据:', responseData)
    
    // 处理响应数据（可能是数组或单个对象）
    const data = Array.isArray(responseData) ? responseData[0] : responseData
    
    if (!data) {
      throw new Error('创建行程失败：未返回数据')
    }

    console.log('✅ 行程创建成功:', data)
    console.log('✅ 创建的行程 ID:', data.id)
    return data
  } catch (insertError: any) {
    console.error('❌ 插入操作异常:', insertError)
    console.error('错误类型:', insertError?.constructor?.name || 'Unknown')
    console.error('错误消息:', insertError?.message || 'Unknown error')
    console.error('错误堆栈:', insertError?.stack || 'No stack trace')
    
    // 如果是超时错误，尝试手动测试
    if (insertError.message?.includes('超时')) {
      console.warn('⚠️ 插入操作超时，尝试使用手动 fetch 测试...')
      
      // 尝试使用手动 fetch 作为备用方案
      try {
        console.log('尝试手动 fetch 请求...')
        const manualResponse = await fetch(`${supabaseUrl}/rest/v1/trips`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(tripData)
        })
        
        console.log('手动 fetch 响应状态:', manualResponse.status, manualResponse.statusText)
        
        if (manualResponse.ok) {
          const manualData = await manualResponse.json()
          console.log('✅ 手动 fetch 成功:', manualData)
          return Array.isArray(manualData) ? manualData[0] : manualData
        } else {
          const errorText = await manualResponse.text()
          console.error('❌ 手动 fetch 失败:', errorText)
          throw new Error(`手动 fetch 失败 (${manualResponse.status}): ${errorText}`)
        }
      } catch (manualError: any) {
        console.error('❌ 手动 fetch 也失败:', manualError)
        throw new Error(`插入操作失败: ${insertError.message}\n\n手动 fetch 也失败: ${manualError.message}`)
      }
    }
    
    // 如果是网络错误，提供更详细的提示
    if (insertError.message?.includes('fetch') || insertError.message?.includes('network')) {
      throw new Error(`网络请求失败: ${insertError.message}\n\n请检查：\n1. Supabase URL 是否正确\n2. 网络连接是否正常\n3. 浏览器控制台 Network 面板是否有请求`)
    }
    
    throw insertError
  }
}

// 更新行程
export const updateTrip = async (id: string, updates: any) => {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // 确保只能更新自己的行程
    .select()
    .single()

  if (error) {
    console.error('更新行程失败:', error)
    throw new Error(`更新行程失败: ${error.message}`)
  }

  return data
}

// 删除行程
export const deleteTrip = async (id: string) => {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('用户未登录')
  }

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // 确保只能删除自己的行程

  if (error) {
    console.error('删除行程失败:', error)
    throw new Error(`删除行程失败: ${error.message}`)
  }
}

// 实时订阅行程变化
export const subscribeToTrip = (tripId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`trip:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trips',
        filter: `id=eq.${tripId}`
      },
      callback
    )
    .subscribe()
}
