// 费用相关API
import { supabase } from '@/config/supabase.config'
import { getCurrentUser } from './auth.api'
import { useAuthStore } from '@/store/authStore'
import type { Expense } from '@/config/supabase.config'
import type { CreateExpenseData, UpdateExpenseData } from '@/types/expense.types'

// 快速获取当前用户（优先使用 authStore）
const getCurrentUserFast = async () => {
  try {
    const state = useAuthStore.getState()
    if (state.user) {
      return state.user
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        useAuthStore.getState().setUser(session.user)
        useAuthStore.getState().setSession(session)
        return session.user
      }
    } catch (sessionError) {
      console.warn('获取 session 失败:', sessionError)
    }
    
    const user = await getCurrentUser()
    if (user) {
      useAuthStore.getState().setUser(user)
      return user
    }
    
    return null
  } catch (error) {
    console.error('getCurrentUserFast 错误:', error)
    return null
  }
}

// 获取行程的所有费用
export const getExpensesByTrip = async (tripId: string): Promise<Expense[]> => {
  const user = await getCurrentUserFast()
  if (!user) {
    throw new Error('用户未登录')
  }

  // 获取 session
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
    const queryUrl = `${supabaseUrl}/rest/v1/expenses?trip_id=eq.${tripId}&order=expense_date.desc,created_at.desc`
    
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
      console.error('❌ 查询费用失败 - 响应内容:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        throw new Error(`获取费用失败 (${response.status}): ${errorData.message || errorData.error || errorText}`)
      } catch (parseError) {
        throw new Error(`获取费用失败 (${response.status}): ${errorText}`)
      }
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error('getExpensesByTrip 捕获错误:', error)
    if (error?.message) {
      throw error
    }
    throw new Error(`获取费用失败: ${error.message || '未知错误'}`)
  }
}

// 创建费用记录
export const createExpense = async (expenseData: CreateExpenseData): Promise<Expense> => {
  const user = await getCurrentUserFast()
  if (!user) {
    throw new Error('用户未登录')
  }

  // 获取 session
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

  // 准备数据
  const dataToInsert = {
    ...expenseData,
    currency: expenseData.currency || 'CNY',
    expense_date: expenseData.expense_date || new Date().toISOString()
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/expenses`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(dataToInsert)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 创建费用失败 - 响应内容:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        throw new Error(`创建费用失败 (${response.status}): ${errorData.message || errorData.error || errorText}`)
      } catch (parseError) {
        throw new Error(`创建费用失败 (${response.status}): ${errorText}`)
      }
    }

    const responseData = await response.json()
    const data = Array.isArray(responseData) ? responseData[0] : responseData
    
    if (!data) {
      throw new Error('创建费用失败：未返回数据')
    }

    return data
  } catch (error: any) {
    console.error('createExpense 捕获错误:', error)
    if (error?.message) {
      throw error
    }
    throw new Error(`创建费用失败: ${error.message || '未知错误'}`)
  }
}

// 更新费用记录
export const updateExpense = async (expenseId: string, updates: UpdateExpenseData): Promise<Expense> => {
  const user = await getCurrentUserFast()
  if (!user) {
    throw new Error('用户未登录')
  }

  // 获取 session
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
    const response = await fetch(`${supabaseUrl}/rest/v1/expenses?id=eq.${expenseId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 更新费用失败 - 响应内容:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        throw new Error(`更新费用失败 (${response.status}): ${errorData.message || errorData.error || errorText}`)
      } catch (parseError) {
        throw new Error(`更新费用失败 (${response.status}): ${errorText}`)
      }
    }

    const responseData = await response.json()
    const data = Array.isArray(responseData) ? responseData[0] : responseData
    
    if (!data) {
      throw new Error('更新费用失败：未返回数据')
    }

    return data
  } catch (error: any) {
    console.error('updateExpense 捕获错误:', error)
    if (error?.message) {
      throw error
    }
    throw new Error(`更新费用失败: ${error.message || '未知错误'}`)
  }
}

// 删除费用记录
export const deleteExpense = async (expenseId: string): Promise<void> => {
  const user = await getCurrentUserFast()
  if (!user) {
    throw new Error('用户未登录')
  }

  // 获取 session
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
    const response = await fetch(`${supabaseUrl}/rest/v1/expenses?id=eq.${expenseId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 删除费用失败 - 响应内容:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        throw new Error(`删除费用失败 (${response.status}): ${errorData.message || errorData.error || errorText}`)
      } catch (parseError) {
        throw new Error(`删除费用失败 (${response.status}): ${errorText}`)
      }
    }
  } catch (error: any) {
    console.error('deleteExpense 捕获错误:', error)
    if (error?.message) {
      throw error
    }
    throw new Error(`删除费用失败: ${error.message || '未知错误'}`)
  }
}

// 获取费用统计
export const getExpenseStats = async (tripId: string) => {
  const expenses = await getExpensesByTrip(tripId)
  
  const stats = {
    total: 0,
    byCategory: {} as Record<string, number>,
    byDay: {} as Record<string, number>,
    count: expenses.length,
    average: 0
  }

  expenses.forEach(expense => {
    stats.total += Number(expense.amount)
    
    // 按类别统计
    if (!stats.byCategory[expense.category]) {
      stats.byCategory[expense.category] = 0
    }
    stats.byCategory[expense.category] += Number(expense.amount)
    
    // 按日期统计
    const date = expense.expense_date.split('T')[0]
    if (!stats.byDay[date]) {
      stats.byDay[date] = 0
    }
    stats.byDay[date] += Number(expense.amount)
  })

  stats.average = stats.count > 0 ? stats.total / stats.count : 0

  return stats
}
