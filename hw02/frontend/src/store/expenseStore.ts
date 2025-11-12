// 费用状态管理
import { create } from 'zustand'
import type { Expense } from '@/config/supabase.config'

interface ExpenseState {
  expenses: Record<string, Expense[]> // tripId -> expenses
  loading: Record<string, boolean>
  errors: Record<string, string | null>
  
  setExpenses: (tripId: string, expenses: Expense[]) => void
  addExpense: (tripId: string, expense: Expense) => void
  updateExpense: (tripId: string, expenseId: string, expense: Expense) => void
  removeExpense: (tripId: string, expenseId: string) => void
  setLoading: (tripId: string, loading: boolean) => void
  setError: (tripId: string, error: string | null) => void
  clearExpenses: (tripId: string) => void
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: {},
  loading: {},
  errors: {},

  setExpenses: (tripId, expenses) =>
    set((state) => ({
      expenses: { ...state.expenses, [tripId]: expenses }
    })),

  addExpense: (tripId, expense) =>
    set((state) => ({
      expenses: {
        ...state.expenses,
        [tripId]: [expense, ...(state.expenses[tripId] || [])]
      }
    })),

  updateExpense: (tripId, expenseId, expense) =>
    set((state) => ({
      expenses: {
        ...state.expenses,
        [tripId]: (state.expenses[tripId] || []).map((e) =>
          e.id === expenseId ? expense : e
        )
      }
    })),

  removeExpense: (tripId, expenseId) =>
    set((state) => ({
      expenses: {
        ...state.expenses,
        [tripId]: (state.expenses[tripId] || []).filter((e) => e.id !== expenseId)
      }
    })),

  setLoading: (tripId, loading) =>
    set((state) => ({
      loading: { ...state.loading, [tripId]: loading }
    })),

  setError: (tripId, error) =>
    set((state) => ({
      errors: { ...state.errors, [tripId]: error }
    })),

  clearExpenses: (tripId) =>
    set((state) => {
      const newExpenses = { ...state.expenses }
      delete newExpenses[tripId]
      const newLoading = { ...state.loading }
      delete newLoading[tripId]
      const newErrors = { ...state.errors }
      delete newErrors[tripId]
      return {
        expenses: newExpenses,
        loading: newLoading,
        errors: newErrors
      }
    })
}))
