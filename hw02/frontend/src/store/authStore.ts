// 认证状态管理 (Zustand Store)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/config/supabase.config'
import {
  signInWithEmail,
  signUpWithEmail,
  signOut as apiSignOut,
  getCurrentUser,
  getCurrentSession,
  getProfile
} from '@/api/auth.api'

interface AuthState {
  // 状态
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null

  // 方法
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // 认证操作
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      session: null,
      profile: null,
      loading: true, // 初始为 true，表示正在初始化
      error: null,

      // Setters
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // 登录
      signIn: async (email: string, password: string) => {
        set({ loading: true, error: null })
        try {
          console.log('开始登录:', email)
          const { user, session } = await signInWithEmail(email, password)
          console.log('登录成功:', { user: user?.id, session: session?.access_token ? '有 session' : '无 session' })
          
          if (!user) {
            throw new Error('登录失败：未返回用户信息')
          }

          if (!session) {
            throw new Error('登录失败：未返回会话信息')
          }

          set({ user, session })

          // 获取用户资料（即使失败也不影响登录）
          if (user) {
            try {
              const profile = await getProfile(user.id)
              console.log('获取用户资料:', profile ? '成功' : '不存在')
              set({ profile })
            } catch (profileError) {
              // Profile 获取失败不影响登录，可能是新用户还没有 profile
              console.warn('获取用户资料失败（不影响登录）:', profileError)
              set({ profile: null })
            }
          }

          console.log('登录流程完成')
        } catch (error: any) {
          console.error('登录失败:', error)
          
          // 处理特定错误
          let errorMessage = '登录失败，请重试'
          
          if (error.message) {
            if (error.message.includes('Email not confirmed')) {
              errorMessage = '邮箱未验证，请检查您的邮箱并点击验证链接'
            } else if (error.message.includes('Invalid login credentials')) {
              errorMessage = '邮箱或密码错误，请检查后重试'
            } else if (error.message.includes('User not found')) {
              errorMessage = '用户不存在，请先注册'
            } else if (error.message.includes('Too many requests')) {
              errorMessage = '请求过于频繁，请稍后再试'
            } else {
              errorMessage = error.message
            }
          }
          
          set({ error: errorMessage })
          throw new Error(errorMessage)
        } finally {
          set({ loading: false })
        }
      },

      // 注册
      signUp: async (email: string, password: string, username?: string) => {
        set({ loading: true, error: null })
        try {
          const { user, session } = await signUpWithEmail(
            email,
            password,
            username
          )
          set({ user, session })

          // 注册后立即获取用户资料
          if (user) {
            try {
              const profile = await getProfile(user.id)
              set({ profile })
            } catch (error) {
              // 新用户可能还没有资料，这是正常的
              console.log('新用户资料尚未创建')
            }
          }
        } catch (error: any) {
          const errorMessage = error.message || '注册失败，请重试'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      // 登出
      signOut: async () => {
        set({ loading: true, error: null })
        try {
          await apiSignOut()
          set({ user: null, session: null, profile: null })
        } catch (error: any) {
          const errorMessage = error.message || '登出失败，请重试'
          set({ error: errorMessage })
          throw error
        } finally {
          set({ loading: false })
        }
      },

      // 刷新认证状态
      refreshAuth: async () => {
        set({ loading: true, error: null })
        try {
          const [user, session] = await Promise.all([
            getCurrentUser(),
            getCurrentSession()
          ])

          set({ user, session })

          // 获取用户资料（即使失败也不影响认证状态）
          if (user) {
            try {
              const profile = await getProfile(user.id)
              set({ profile })
            } catch (error) {
              // Profile 获取失败不影响认证状态，可能是新用户还没有 profile
              console.log('获取用户资料失败（可能是新用户）:', error)
              set({ profile: null })
            }
          } else {
            // 没有用户，清除 profile
            set({ profile: null })
          }
        } catch (error: any) {
          console.error('刷新认证状态失败:', error)
          // 发生错误时，清除所有状态
          set({ user: null, session: null, profile: null })
        } finally {
          // 确保 loading 状态被设置为 false
          set({ loading: false })
        }
      },

      // 清除错误
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // 只持久化必要的数据
        user: state.user,
        session: state.session,
        profile: state.profile
      })
    }
  )
)
