// ExpenseForm组件
import { useState, FormEvent } from 'react'
import Button from '@/components/common/Button/Button'
import type { CreateExpenseData, ExpenseCategory, PaymentMethod } from '@/types/expense.types'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_ICONS, PAYMENT_METHOD_LABELS } from '@/types/expense.types'
import styles from './ExpenseForm.module.css'

interface ExpenseFormProps {
  tripId: string
  onSubmit: (data: CreateExpenseData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<CreateExpenseData>
}

const ExpenseForm = ({ tripId, onSubmit, onCancel, initialData }: ExpenseFormProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateExpenseData>({
    trip_id: tripId,
    category: initialData?.category || 'FOOD',
    amount: initialData?.amount || 0,
    currency: initialData?.currency || 'CNY',
    description: initialData?.description || '',
    payment_method: initialData?.payment_method || 'ALIPAY',
    payer: initialData?.payer || '',
    expense_date: initialData?.expense_date || new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (formData.amount <= 0) {
      alert('请输入有效的金额')
      return
    }

    try {
      setLoading(true)
      await onSubmit(formData)
      // 重置表单
      setFormData({
        trip_id: tripId,
        category: 'FOOD',
        amount: 0,
        currency: 'CNY',
        description: '',
        payment_method: 'ALIPAY',
        payer: '',
        expense_date: new Date().toISOString().split('T')[0]
      })
    } catch (error: any) {
      console.error('提交费用失败:', error)
      alert(error.message || '提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label className={styles.label}>
          <span className={styles.labelText}>类别 *</span>
          <select
            className={styles.select}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
            required
          >
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {EXPENSE_CATEGORY_ICONS[key as ExpenseCategory]} {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <span className={styles.labelText}>金额 *</span>
          <div className={styles.amountInput}>
            <span className={styles.currency}>¥</span>
            <input
              type="number"
              className={styles.input}
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              step="0.01"
              min="0"
              placeholder="0.00"
              required
            />
          </div>
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <span className={styles.labelText}>日期 *</span>
          <input
            type="date"
            className={styles.input}
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            required
          />
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <span className={styles.labelText}>支付方式</span>
          <select
            className={styles.select}
            value={formData.payment_method || 'ALIPAY'}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <span className={styles.labelText}>付款人</span>
          <input
            type="text"
            className={styles.input}
            value={formData.payer || ''}
            onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
            placeholder="可选"
          />
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <span className={styles.labelText}>备注</span>
          <textarea
            className={styles.textarea}
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="费用说明..."
            rows={3}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          fullWidth={!onCancel}
        >
          保存
        </Button>
      </div>
    </form>
  )
}

export default ExpenseForm
