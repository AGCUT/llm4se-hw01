// 认证相关API
import { supabase } from '@/config/supabase.config'
import type { User, Session, AuthError } from '@supabase/supabase-js'

// 响应类型定义
export interface AuthResponse {
  user: User | null
  session: Session | null
  error?: AuthError | null
}

// 邮箱注册
export const signUpWithEmail = async (
  email: string,
  password: string,
  username?: string
): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username || email.split('@')[0]
      }
    }
  })

  if (error) {
    throw error
  }

  return {
    user: data.user,
    session: data.session,
    error: null
  }
}

// 邮箱登录
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw error
  }

  return {
    user: data.user,
    session: data.session,
    error: null
  }
}

// 退出登录
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

// 获取当前用户
export const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    console.error('获取用户信息失败:', error)
    return null
  }

  return user
}

// 获取当前会话
export const getCurrentSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (error) {
    console.error('获取会话失败:', error)
    return null
  }

  return session
}

// 发送密码重置邮件
export const resetPasswordForEmail = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })

  if (error) {
    throw error
  }
}

// 更新密码
export const updatePassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    throw error
  }
}

// 更新用户资料
export const updateProfile = async (updates: {
  username?: string
  avatar_url?: string
  phone?: string
}): Promise<void> => {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('用户未登录')
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    throw error
  }
}

// 获取用户资料
export const getProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle() // 使用 maybeSingle 而不是 single，避免不存在时报错

    if (error) {
      console.error('获取 profile 错误:', error)
      throw error
    }

    // 如果 profile 不存在，返回 null
    if (!data) {
      console.warn('Profile 不存在:', userId)
      return null
    }

    return data
  } catch (error) {
    console.error('获取 profile 失败:', error)
    throw error
  }
}

// OAuth登录 (Google示例)
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    throw error
  }

  return data
}

// OAuth登录 (GitHub示例)
export const signInWithGithub = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })

  if (error) {
    throw error
  }

  return data
}

// 监听认证状态变化
export const onAuthStateChange = (
  callback: (event: string, session: Session | null) => void
) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}
