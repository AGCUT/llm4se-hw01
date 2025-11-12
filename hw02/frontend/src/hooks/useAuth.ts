// useAuth Hook - 认证状态管理
import { useEffect, useState } from 'react'
import { supabase } from '@/config/supabase.config'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/config/supabase.config'
import { getProfile } from '@/api/auth.api'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAuthenticated: boolean
}

/**
 * 认证状态Hook
 * 自动监听用户登录状态变化并管理用户信息
 */
export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // 如果有用户，获取用户资料
      if (session?.user) {
        getProfile(session.user.id)
          .then(setProfile)
          .catch(console.error)
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // 监听认证状态变化
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      // 更新用户资料
      if (session?.user) {
        try {
          const profileData = await getProfile(session.user.id)
          setProfile(profileData)
        } catch (error) {
          console.error('获取用户资料失败:', error)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    // 清理订阅
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user
  }
}
