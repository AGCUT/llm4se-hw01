// useExpenses Hook
import { useState, useEffect, useCallback } from 'react'
import { getExpensesByTrip, createExpense, updateExpense, deleteExpense, getExpenseStats } from '@/api/expense.api'
import type { Expense } from '@/config/supabase.config'
import type { CreateExpenseData, UpdateExpenseData } from '@/types/expense.types'

export const useExpenses = (tripId: string | null) => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadExpenses = useCallback(async () => {
    if (!tripId) {
      setExpenses([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getExpensesByTrip(tripId)
      setExpenses(data)
    } catch (err: any) {
      console.error('加载费用失败:', err)
      setError(err.message || '加载费用失败')
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const addExpense = useCallback(async (expenseData: CreateExpenseData) => {
    try {
      setError(null)
      const newExpense = await createExpense(expenseData)
      setExpenses(prev => [newExpense, ...prev])
      return newExpense
    } catch (err: any) {
      console.error('添加费用失败:', err)
      setError(err.message || '添加费用失败')
      throw err
    }
  }, [])

  const editExpense = useCallback(async (expenseId: string, updates: UpdateExpenseData) => {
    try {
      setError(null)
      const updatedExpense = await updateExpense(expenseId, updates)
      setExpenses(prev => prev.map(exp => exp.id === expenseId ? updatedExpense : exp))
      return updatedExpense
    } catch (err: any) {
      console.error('更新费用失败:', err)
      setError(err.message || '更新费用失败')
      throw err
    }
  }, [])

  const removeExpense = useCallback(async (expenseId: string) => {
    try {
      setError(null)
      await deleteExpense(expenseId)
      setExpenses(prev => prev.filter(exp => exp.id !== expenseId))
    } catch (err: any) {
      console.error('删除费用失败:', err)
      setError(err.message || '删除费用失败')
      throw err
    }
  }, [])

  const refreshExpenses = useCallback(() => {
    loadExpenses()
  }, [loadExpenses])

  // 计算统计信息
  const stats = expenses.reduce((acc, expense) => {
    acc.total += Number(expense.amount)
    acc.count += 1
    if (!acc.byCategory[expense.category]) {
      acc.byCategory[expense.category] = 0
    }
    acc.byCategory[expense.category] += Number(expense.amount)
    return acc
  }, {
    total: 0,
    count: 0,
    byCategory: {} as Record<string, number>,
    average: 0
  })

  stats.average = stats.count > 0 ? stats.total / stats.count : 0

  return {
    expenses,
    loading,
    error,
    stats,
    addExpense,
    editExpense,
    removeExpense,
    refreshExpenses
  }
}
