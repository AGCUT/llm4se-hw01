// ExpenseList组件
import { useState } from 'react'
import type { Expense } from '@/config/supabase.config'
import type { ExpenseListItem } from '@/types/expense.types'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_ICONS, PAYMENT_METHOD_LABELS } from '@/types/expense.types'
import Button from '@/components/common/Button/Button'
import styles from './ExpenseList.module.css'

interface ExpenseListProps {
  expenses: Expense[]
  onEdit?: (expense: Expense) => void
  onDelete?: (expenseId: string) => void
  loading?: boolean
}

const ExpenseList = ({ expenses, onEdit, onDelete, loading }: ExpenseListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (expenseId: string) => {
    if (!confirm('确定要删除这条费用记录吗？')) {
      return
    }

    try {
      setDeletingId(expenseId)
      await onDelete?.(expenseId)
    } catch (error) {
      console.error('删除失败:', error)
      alert('删除失败，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // 按日期分组
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const date = expense.expense_date.split('T')[0]
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(expense)
    return acc
  }, {} as Record<string, Expense[]>)

  // 计算每日总计
  const getDayTotal = (dayExpenses: Expense[]) => {
    return dayExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}>加载中...</div>
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>💰</div>
        <p>还没有费用记录</p>
        <p className={styles.emptyHint}>点击"添加费用"开始记账</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {Object.entries(groupedExpenses)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, dayExpenses]) => (
          <div key={date} className={styles.dayGroup}>
            <div className={styles.dayHeader}>
              <h3 className={styles.dayDate}>
                {new Date(date).toLocaleDateString('zh-CN', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short'
                })}
              </h3>
              <span className={styles.dayTotal}>
                {formatAmount(getDayTotal(dayExpenses))}
              </span>
            </div>
            <div className={styles.expenses}>
              {dayExpenses.map((expense) => {
                const categoryLabel = EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS]
                const categoryIcon = EXPENSE_CATEGORY_ICONS[expense.category as keyof typeof EXPENSE_CATEGORY_ICONS]
                const paymentMethodLabel = expense.payment_method 
                  ? PAYMENT_METHOD_LABELS[expense.payment_method as keyof typeof PAYMENT_METHOD_LABELS]
                  : undefined

                return (
                  <div key={expense.id} className={styles.expenseItem}>
                    <div className={styles.expenseIcon}>
                      {categoryIcon}
                    </div>
                    <div className={styles.expenseContent}>
                      <div className={styles.expenseHeader}>
                        <div>
                          <h4 className={styles.expenseCategory}>{categoryLabel}</h4>
                          {expense.description && (
                            <p className={styles.expenseDescription}>{expense.description}</p>
                          )}
                        </div>
                        <div className={styles.expenseAmount}>
                          {formatAmount(Number(expense.amount))}
                        </div>
                      </div>
                      <div className={styles.expenseMeta}>
                        <span className={styles.expenseTime}>
                          {formatDate(expense.expense_date)}
                        </span>
                        {paymentMethodLabel && (
                          <span className={styles.expensePayment}>
                            {paymentMethodLabel}
                          </span>
                        )}
                        {expense.payer && (
                          <span className={styles.expensePayer}>
                            付款人: {expense.payer}
                          </span>
                        )}
                      </div>
                    </div>
                    {(onEdit || onDelete) && (
                      <div className={styles.expenseActions}>
                        {onEdit && (
                          <button
                            className={styles.actionButton}
                            onClick={() => onEdit(expense)}
                            title="编辑"
                          >
                            ✏️
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleDelete(expense.id)}
                            disabled={deletingId === expense.id}
                            title="删除"
                          >
                            {deletingId === expense.id ? '⏳' : '🗑️'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}

export default ExpenseList
