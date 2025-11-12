// Button组件
import { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  loading?: boolean
}

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) => {
  const buttonClass = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={buttonClass}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className={styles.spinner}></span>
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export default Button
