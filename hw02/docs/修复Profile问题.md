# 🔧 修复 Profile 406 错误

## 🔍 问题分析

**错误信息�?*
```
GET .../profiles?select=*&id=eq.xxx 406 (Not Acceptable)
```

**原因�?* 
1. 数据库触发器可能没有正确创建
2. RLS 策略可能阻止了查�?
3. profiles 表可能没有正确设�?

---

## �?解决方案

### 步骤 1: �?Supabase SQL Editor 中执行以�?SQL

登录 Supabase Dashboard �?SQL Editor �?新建查询，执行以�?SQL�?

```sql
-- ============================================
-- 修复 profiles 表和触发�?
-- ============================================

-- 1. 确保 profiles 表存�?
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(20),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 删除旧的 RLS 策略（如果存在）
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- 3. 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. 创建新的 RLS 策略（更宽松，便于调试）
CREATE POLICY "Enable read access for authenticated users"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 5. 删除旧触发器函数（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 6. 创建新的触发器函�?
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- 如果插入失败，记录错误但不阻止用户创�?
    RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建触发�?
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. 为现有用户创�?profiles（如果不存在�?
INSERT INTO public.profiles (id, username)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1))
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = users.id
)
ON CONFLICT (id) DO NOTHING;

-- 完成�?
SELECT 'Profile 表和触发器已修复�? as status;
```

---

### 步骤 2: 验证修复

�?SQL Editor 中运行以下查询验证：

```sql
-- 检�?profiles �?
SELECT * FROM profiles;

-- 检查触发器
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 检�?RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
```

---

### 步骤 3: 测试注册新用�?

1. 返回应用
2. 注册一个新账户
3. 登录
4. 查看浏览器控制台，应该不再有 406 错误

---

## 🔄 临时解决方案（如果还有问题）

### 选项 A: 临时禁用 RLS（仅用于开发）

```sql
-- ⚠️ 仅用于开发环境调�?
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### 选项 B: 手动创建 Profile

如果自动创建失败，可以手动创建：

```sql
-- 替换 'your-user-id' 为实际的用户 ID
INSERT INTO profiles (id, username)
VALUES (
  'your-user-id',
  'test-user'
)
ON CONFLICT (id) DO NOTHING;
```

获取用户 ID�?
1. Supabase Dashboard �?Authentication �?Users
2. 点击用户查看详情
3. 复制 User UID

---

## 📝 代码层面的改�?

我还建议修改代码以更好地处理这个错误。让我更�?`getProfile` 函数�?

### 修改建议 1: 改进错误处理

```typescript
// auth.api.ts
export const getProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // 如果 profile 不存在，尝试创建
      if (error.code === 'PGRST116') {
        console.log('Profile 不存在，尝试创建...')
        return await createProfile(userId)
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('获取 profile 失败:', error)
    throw error
  }
}

// 创建 profile 的辅助函�?
export const createProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: userId }])
    .select()
    .single()

  if (error) throw error
  return data
}
```

### 修改建议 2: 在注册时等待

```typescript
// authStore.ts - signUp 方法
signUp: async (email: string, password: string, username?: string) => {
  set({ loading: true, error: null })
  try {
    const { user, session } = await signUpWithEmail(
      email,
      password,
      username
    )
    set({ user, session })

    // 等待一下让触发器创�?profile
    if (user) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      try {
        const profile = await getProfile(user.id)
        set({ profile })
      } catch (error) {
        console.log('Profile 将在下次登录时创�?)
      }
    }
  } catch (error: any) {
    const errorMessage = error.message || '注册失败，请重试'
    set({ error: errorMessage })
    throw error
  } finally {
    set({ loading: false })
  }
}
```

---

## 🎯 推荐流程

### 开发环境（快速测试）

1. �?执行步骤 1 �?SQL
2. �?临时禁用 RLS（选项 A�?
3. �?测试注册和登�?
4. �?确认一切正常后重新启用 RLS

### 生产环境（正式部署）

1. �?执行步骤 1 �?SQL
2. �?保持 RLS 启用
3. �?添加代码层面的错误处�?
4. �?监控日志确保触发器正常工�?

---

## �?验收清单

执行�?SQL 后，验证以下内容�?

- [ ] profiles 表存�?
- [ ] RLS 已启�?
- [ ] 触发器已创建
- [ ] 注册新用户时自动创建 profile
- [ ] 登录时可以读�?profile
- [ ] 控制台没�?406 错误

---

## 🐛 如果问题仍然存在

请检查：

1. **Supabase 项目状�?*
   - Dashboard �?Project Settings �?General
   - 确保项目状态正�?

2. **API 密钥正确**
   - 检�?`.env.local` 中的配置
   - 确保使用的是 `anon` key，不�?`service_role`

3. **浏览器控制台详细错误**
   - �?F12 打开开发者工�?
   - 查看完整的错误堆�?
   - 复制错误信息

4. **Supabase 日志**
   - Dashboard �?Logs �?Postgres Logs
   - 查看是否有触发器执行失败的日�?

---

**执行�?SQL 后，刷新浏览器重新测试！** 🚀

---

*最后更�? 2024-11-07*


