// 行程相关API
import { supabase } from '@/config/supabase.config'
import { getCurrentUser } from './auth.api'
import type { TripPlan } from './ai.api'

// 获取用户所有行程
export const getTrips = async () => {
  // 添加超时保护
  const userPromise = getCurrentUser()
  const timeoutPromise = new Promise((resolve) => 
    setTimeout(() => resolve(null), 5000) // 5秒超时
  )
  const user = await Promise.race([userPromise, timeoutPromise]) as any

  if (!user) {
    throw new Error('用户未登录或获取用户信息超时')
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id) // 只获取当前用户的行程
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取行程失败:', error)
    throw error
  }

  return data || []
}

// 获取单个行程详情
export const getTripById = async (id: string) => {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('用户未登录')
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id) // 确保只能获取自己的行程
    .single()

  if (error) {
    console.error('获取行程详情失败:', error)
    throw new Error(`获取行程详情失败: ${error.message}`)
  }

  return data
}

// 创建行程（从 AI 生成的计划）
export const createTripFromPlan = async (plan: TripPlan) => {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('用户未登录')
  }

  // 确保日期格式正确
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

  console.log('创建行程数据:', tripData)

  const { data, error } = await supabase
    .from('trips')
    .insert([tripData])
    .select()
    .single()

  if (error) {
    console.error('创建行程失败:', error)
    throw new Error(`创建行程失败: ${error.message}`)
  }

  console.log('行程创建成功:', data)
  return data
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
