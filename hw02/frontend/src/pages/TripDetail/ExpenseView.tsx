// 费用视图组件
import { useState } from 'react'
import type { Trip, Expense } from '@/config/supabase.config'
import type { CreateExpenseData, UpdateExpenseData } from '@/types/expense.types'
import { useExpenses } from '@/hooks/useExpenses'
import ExpenseForm from '@/components/expense/ExpenseForm/ExpenseForm'
import ExpenseList from '@/components/expense/ExpenseList/ExpenseList'
import Button from '@/components/common/Button/Button'
import { EXPENSE_CATEGORY_LABELS } from '@/types/expense.types'
import './ExpenseView.css'

interface ExpenseViewProps {
  trip: Trip
}

const ExpenseView = ({ trip }: ExpenseViewProps) => {
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const { expenses, loading, stats, addExpense, editExpense, removeExpense } = useExpenses(trip.id)

  const handleSubmit = async (data: CreateExpenseData) => {
    if (editingExpense) {
      // 更新费用
      const updates: UpdateExpenseData = {
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        payment_method: data.payment_method,
        payer: data.payer,
        expense_date: data.expense_date
      }
      await editExpense(editingExpense.id, updates)
      setEditingExpense(null)
    } else {
      // 创建费用
      await addExpense(data)
    }
    setShowForm(false)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingExpense(null)
  }

  const handleDelete = async (expenseId: string) => {
    await removeExpense(expenseId)
  }

  // 计算预算使用情况
  const budgetUsed = stats.total
  const budgetRemaining = trip.budget - budgetUsed
  const budgetPercentage = trip.budget > 0 ? (budgetUsed / trip.budget) * 100 : 0

  return (
    <div className="expense-view">
      {/* 费用统计卡片 */}
      <div className="expense-stats-card">
        <div className="expense-stats-header">
          <h3>费用统计</h3>
          <Button
            variant="primary"
            size="small"
            onClick={() => setShowForm(true)}
          >
            + 添加费用
          </Button>
        </div>

        <div className="expense-stats-grid">
          <div className="stat-item">
            <div className="stat-label">总支出</div>
            <div className="stat-value total">¥{stats.total.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stat-count">{stats.count} 笔</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">预算</div>
            <div className="stat-value budget">¥{trip.budget.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stat-remaining" style={{ color: budgetRemaining >= 0 ? '#48bb78' : '#f56565' }}>
              {budgetRemaining >= 0 ? '剩余' : '超支'} ¥{Math.abs(budgetRemaining).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-label">平均每笔</div>
            <div className="stat-value average">¥{stats.average.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* 预算进度条 */}
        <div className="budget-progress">
          <div className="budget-progress-label">
            <span>预算使用率</span>
            <span>{budgetPercentage.toFixed(1)}%</span>
          </div>
          <div className="budget-progress-bar">
            <div
              className={`budget-progress-fill ${budgetPercentage > 100 ? 'over-budget' : ''}`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* 分类统计 */}
        {Object.keys(stats.byCategory).length > 0 && (
          <div className="category-stats">
            <h4>分类统计</h4>
            <div className="category-list">
              {Object.entries(stats.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="category-item">
                    <span className="category-name">
                      {EXPENSE_CATEGORY_LABELS[category as keyof typeof EXPENSE_CATEGORY_LABELS]}
                    </span>
                    <span className="category-amount">
                      ¥{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 费用表单（模态框形式） */}
      {showForm && (
        <div className="expense-form-modal">
          <div className="expense-form-overlay" onClick={handleCancel} />
          <div className="expense-form-content">
            <div className="expense-form-header">
              <h3>{editingExpense ? '编辑费用' : '添加费用'}</h3>
              <button className="close-button" onClick={handleCancel}>×</button>
            </div>
            <ExpenseForm
              tripId={trip.id}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              initialData={editingExpense ? {
                category: editingExpense.category as any,
                amount: Number(editingExpense.amount),
                currency: editingExpense.currency,
                description: editingExpense.description || undefined,
                payment_method: editingExpense.payment_method as any,
                payer: editingExpense.payer || undefined,
                expense_date: editingExpense.expense_date.split('T')[0]
              } : undefined}
            />
          </div>
        </div>
      )}

      {/* 费用列表 */}
      <div className="expense-list-section">
        <ExpenseList
          expenses={expenses}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      </div>
    </div>
  )
}

export default ExpenseView

