# Supabase集成完整指南

## 📋 目录
1. [环境变量配置](#环境变量配置)
2. [前端集成](#前端集成)
3. [后端集成](#后端集成)
4. [功能实现示例](#功能实现示例)
5. [常见问题](#常见问题)

---

## 一、环境变量配置

### 1.1 前端环境变量

编辑 `frontend/.env.local` 文件（如果不存在，复制 `.env.example`）：

```bash
# API配置
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Supabase配置（重要！）
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...你的anon_key

# 高德地图
VITE_AMAP_KEY=your_amap_key_here

# 科大讯飞语音
VITE_XUNFEI_APP_ID=your_xunfei_app_id
VITE_XUNFEI_API_KEY=your_xunfei_api_key
```

### 1.2 后端环境变量

编辑 `backend/.env` 文件：

```bash
# Supabase配置
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...你的service_role_key
SUPABASE_ANON_KEY=eyJhbGc...你的anon_key

# 数据库直连（可选，用于高级操作）
DATABASE_URL=postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres

# 其他配置
NODE_ENV=development
PORT=3000
```

---

## 二、前端集成

### 2.1 创建Supabase客户端

创建 `frontend/src/config/supabase.config.ts`：

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// 数据库类型（可选，用于TypeScript类型提示）
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          phone: string | null
          preferences: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          phone?: string | null
          preferences?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          phone?: string | null
          preferences?: any
          created_at?: string
          updated_at?: string
        }
      }
      trips: {
        // ... 类型定义
      }
      expenses: {
        // ... 类型定义
      }
    }
  }
}
```

### 2.2 认证功能实现

更新 `frontend/src/api/auth.api.ts`：

```typescript
import { supabase } from '@/config/supabase.config'

// 邮箱注册
export const signUpWithEmail = async (email: string, password: string, username?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username
      }
    }
  })
  
  if (error) throw error
  return data
}

// 邮箱登录
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

// 退出登录
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// 获取当前用户
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// 重置密码
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  if (error) throw error
}

// OAuth登录（Google示例）
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  
  if (error) throw error
  return data
}

// 监听认证状态变化
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}
```

### 2.3 行程API实现

更新 `frontend/src/api/trip.api.ts`：

```typescript
import { supabase } from '@/config/supabase.config'

// 获取用户所有行程
export const getTrips = async () => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// 获取单个行程详情
export const getTripById = async (id: string) => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// 创建行程
export const createTrip = async (tripData: any) => {
  const { data, error } = await supabase
    .from('trips')
    .insert([tripData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 更新行程
export const updateTrip = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 删除行程
export const deleteTrip = async (id: string) => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// 实时订阅行程变化
export const subscribeToTrip = (tripId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`trip:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trips',
        filter: `id=eq.${tripId}`
      },
      callback
    )
    .subscribe()
}
```

### 2.4 费用API实现

更新 `frontend/src/api/expense.api.ts`：

```typescript
import { supabase } from '@/config/supabase.config'

// 获取行程的所有费用
export const getExpenses = async (tripId: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false })
  
  if (error) throw error
  return data
}

// 创建费用记录
export const createExpense = async (expenseData: any) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert([expenseData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 更新费用记录
export const updateExpense = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 删除费用记录
export const deleteExpense = async (id: string) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// 获取行程预算统计
export const getExpenseStats = async (tripId: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('trip_id', tripId)
  
  if (error) throw error
  
  // 按类别汇总
  const stats = data.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount)
    return acc
  }, {} as Record<string, number>)
  
  return stats
}
```

### 2.5 文件上传实现

更新 `frontend/src/services/storageService.ts`：

```typescript
import { supabase } from '@/config/supabase.config'

// 上传用户头像
export const uploadAvatar = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`
  const filePath = `${fileName}`
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true
    })
  
  if (error) throw error
  
  // 获取公开URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)
  
  return publicUrl
}

// 上传费用凭证
export const uploadReceipt = async (expenseId: string, file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${expenseId}_${Date.now()}.${fileExt}`
  const filePath = `receipts/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filePath, file)
  
  if (error) throw error
  
  // 获取签名URL（私有文件）
  const { data: { signedUrl } } = await supabase.storage
    .from('receipts')
    .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7天有效期
  
  return signedUrl
}

// 删除文件
export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])
  
  if (error) throw error
}
```

### 2.6 使用React Hook封装

更新 `frontend/src/hooks/useAuth.ts`：

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/config/supabase.config'
import type { User, Session } from '@supabase/supabase-js'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    
    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )
    
    return () => subscription.unsubscribe()
  }, [])
  
  return { user, session, loading }
}
```

更新 `frontend/src/hooks/useTrips.ts`：

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTrips, getTripById, createTrip, updateTrip, deleteTrip } from '@/api/trip.api'

export const useTrips = () => {
  return useQuery({
    queryKey: ['trips'],
    queryFn: getTrips
  })
}

export const useTrip = (id: string) => {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTripById(id),
    enabled: !!id
  })
}

export const useCreateTrip = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    }
  })
}

export const useUpdateTrip = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      updateTrip(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['trip', variables.id] })
    }
  })
}

export const useDeleteTrip = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    }
  })
}
```

---

## 三、后端集成（可选）

如果您需要后端服务器处理复杂业务逻辑：

### 3.1 安装Supabase客户端

```bash
cd backend
npm install @supabase/supabase-js
```

### 3.2 创建Supabase客户端

创建 `backend/src/config/supabase.config.ts`：

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// 使用service_role key，绕过RLS（用于管理操作）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 使用anon key（用于用户权限操作）
export const supabase = createClient(
  supabaseUrl, 
  process.env.SUPABASE_ANON_KEY!
)
```

---

## 四、实时功能示例

### 4.1 实时监听行程变化

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/config/supabase.config'

export const TripDetailPage = ({ tripId }: { tripId: string }) => {
  const [trip, setTrip] = useState(null)
  
  useEffect(() => {
    // 订阅行程变化
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`
        },
        (payload) => {
          console.log('Trip updated:', payload.new)
          setTrip(payload.new)
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])
  
  return <div>{/* 行程详情 */}</div>
}
```

### 4.2 实时协作编辑

```typescript
import { supabase } from '@/config/supabase.config'

export const CollaborativeEditor = ({ tripId }: { tripId: string }) => {
  useEffect(() => {
    const channel = supabase.channel(`room:${tripId}`)
    
    // 监听其他用户的操作
    channel
      .on('broadcast', { event: 'cursor-move' }, (payload) => {
        console.log('User moved cursor:', payload)
      })
      .on('broadcast', { event: 'edit' }, (payload) => {
        console.log('User edited:', payload)
      })
      .subscribe()
    
    // 发送自己的操作
    const sendCursorPosition = (x: number, y: number) => {
      channel.send({
        type: 'broadcast',
        event: 'cursor-move',
        payload: { x, y, user: 'current_user' }
      })
    }
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])
  
  return <div>{/* 编辑器 */}</div>
}
```

---

## 五、存储桶配置

### 5.1 在Supabase Dashboard中创建存储桶

1. 点击左侧 "Storage"
2. 点击 "New bucket"
3. 创建以下桶：

#### avatars（用户头像 - Public）
- Name: `avatars`
- Public: ✅
- File size limit: 2MB
- Allowed MIME types: `image/*`

#### receipts（费用凭证 - Private）
- Name: `receipts`
- Public: ❌
- File size limit: 5MB
- Allowed MIME types: `image/*,application/pdf`

#### trip-images（行程图片 - Public）
- Name: `trip-images`
- Public: ✅
- File size limit: 5MB
- Allowed MIME types: `image/*`

### 5.2 配置存储策略

为每个桶设置访问策略：

```sql
-- avatars桶策略
CREATE POLICY "Public avatars are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- receipts桶策略
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 六、常见问题

### Q1: RLS导致查询返回空数据？

**原因**：行级安全（RLS）策略阻止了访问

**解决**：
1. 确保用户已登录（`auth.uid()` 不为空）
2. 检查RLS策略是否正确
3. 在开发阶段可以临时禁用RLS：
   ```sql
   ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
   ```

### Q2: 实时订阅不工作？

**解决**：
1. 确保表已启用实时功能：
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE trips;
   ```
2. 检查网络连接
3. 查看浏览器控制台是否有错误

### Q3: 文件上传失败？

**解决**：
1. 检查存储桶是否已创建
2. 检查文件大小限制
3. 检查MIME类型限制
4. 检查存储策略是否正确

### Q4: 跨域（CORS）问题？

**解决**：
在Supabase Dashboard中：
1. Settings → API
2. 添加允许的域名到 "Site URL"

### Q5: 性能优化？

**建议**：
1. 使用索引优化查询
2. 使用 `select()` 只获取需要的字段
3. 使用分页（`.range(from, to)`）
4. 使用客户端缓存（TanStack Query）

---

## 七、最佳实践

### 7.1 类型安全

使用Supabase CLI生成TypeScript类型：

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase gen types typescript --local > src/types/supabase.types.ts
```

### 7.2 错误处理

```typescript
const handleSupabaseError = (error: any) => {
  if (error.code === 'PGRST116') {
    // 未找到记录
    return { error: '记录不存在' }
  } else if (error.code === '23505') {
    // 唯一约束冲突
    return { error: '数据已存在' }
  } else {
    return { error: '操作失败，请重试' }
  }
}
```

### 7.3 安全建议

1. ⚠️ **永远不要在前端使用 `service_role` key**
2. ✅ 始终启用RLS
3. ✅ 使用环境变量存储密钥
4. ✅ 定期轮换API密钥
5. ✅ 为敏感操作添加额外验证

---

## 八、下一步

1. ✅ 完成数据库设计和创建
2. ✅ 安装依赖并配置环境变量
3. ⏳ 实现认证功能
4. ⏳ 实现核心API
5. ⏳ 实现实时功能
6. ⏳ 实现文件上传
7. ⏳ 测试和优化

**祝您使用Supabase开发顺利！** 🚀

