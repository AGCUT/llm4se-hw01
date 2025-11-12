// 费用相关类型定义
import type { Expense } from '@/config/supabase.config'

// 费用类别
export type ExpenseCategory = 
  | 'TRANSPORTATION' 
  | 'ACCOMMODATION' 
  | 'FOOD' 
  | 'TICKETS' 
  | 'SHOPPING' 
  | 'ENTERTAINMENT' 
  | 'OTHER'

// 费用类别显示名称映射
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRANSPORTATION: '交通',
  ACCOMMODATION: '住宿',
  FOOD: '餐饮',
  TICKETS: '门票',
  SHOPPING: '购物',
  ENTERTAINMENT: '娱乐',
  OTHER: '其他'
}

// 费用类别图标映射
export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  TRANSPORTATION: '🚗',
  ACCOMMODATION: '🏨',
  FOOD: '🍽️',
  TICKETS: '🎫',
  SHOPPING: '🛍️',
  ENTERTAINMENT: '🎮',
  OTHER: '📝'
}

// 支付方式
export type PaymentMethod = 
  | 'CASH' 
  | 'ALIPAY' 
  | 'WECHAT' 
  | 'CREDIT_CARD' 
  | 'DEBIT_CARD' 
  | 'OTHER'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: '现金',
  ALIPAY: '支付宝',
  WECHAT: '微信支付',
  CREDIT_CARD: '信用卡',
  DEBIT_CARD: '借记卡',
  OTHER: '其他'
}

// 创建费用表单数据
export interface CreateExpenseData {
  trip_id: string
  category: ExpenseCategory
  amount: number
  currency?: string
  description?: string
  payment_method?: PaymentMethod
  payer?: string
  receipt_url?: string
  expense_date?: string
}

// 更新费用表单数据
export interface UpdateExpenseData {
  category?: ExpenseCategory
  amount?: number
  currency?: string
  description?: string
  payment_method?: PaymentMethod
  payer?: string
  receipt_url?: string
  expense_date?: string
}

// 费用统计
export interface ExpenseStats {
  total: number
  byCategory: Record<ExpenseCategory, number>
  byDay: Record<string, number>
  count: number
  average: number
}

// 费用列表项（带扩展信息）
export interface ExpenseListItem extends Expense {
  categoryLabel: string
  categoryIcon: string
  paymentMethodLabel?: string
}
