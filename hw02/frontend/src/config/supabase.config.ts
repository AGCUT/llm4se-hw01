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

