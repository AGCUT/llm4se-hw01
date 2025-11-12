# 验证 Supabase 配置

## 方法 1: 在浏览器控制台验证（推荐�?

1. 打开浏览器开发者工具（F12�?
2. 切换�?**Console** 标签
3. 在控制台输入并运行：
   ```js
   verifySupabase()
   ```
4. 查看验证结果，会显示�?
   - 环境变量是否正确配置
   - Supabase 客户端是否初始化
   - Session 是否有效
   - 是否可以连接�?Supabase

## 方法 2: 通过保存行程验证

1. 登录应用
2. 创建一个行程计�?
3. 点击"保存行程"
4. 打开浏览器开发者工具（F12）的 **Console** 标签
5. 查看详细的验证日志，包括�?
   - 步骤 1: 验证 Supabase 配置
   - 步骤 2: 获取用户信息
   - 步骤 3: 准备行程数据
   - 步骤 4: 检�?Supabase 环境变量
   - 步骤 5: 检�?session
   - 步骤 6: 执行插入操作

## 方法 3: 检查网络请�?

1. 打开浏览器开发者工具（F12�?
2. 切换�?**Network** 标签
3. 点击"保存行程"
4. 查看是否有发送到 Supabase 的请求：
   - 请求 URL 应该�? `https://你的项目.supabase.co/rest/v1/trips`
   - 请求方法应该�? `POST`
   - 如果没有任何请求，说明配置可能有问题

## 常见问题

### 1. 环境变量未配�?
如果控制台显�?"Supabase URL 未配�? �?"Supabase Anon Key 未配�?�?
- 检�?`frontend/.env.local` 文件是否存在
- 确认文件内容包含�?
  ```
  VITE_SUPABASE_URL=https://你的项目.supabase.co
  VITE_SUPABASE_ANON_KEY=你的anon-key
  ```
- 重启开发服务器（`npm run dev`�?

### 2. Session 无效
如果控制台显�?"没有有效�?session"�?
- 确保已登�?
- 尝试重新登录
- 检查浏览器是否清除�?cookies/localStorage

### 3. 连接失败
如果控制台显�?"连接测试失败"�?
- 检�?Supabase URL 是否正确
- 检查网络连�?
- 检查浏览器控制台的 Network 面板，看是否有网络错�?

### 4. 权限错误
如果控制台显�?"连接正常，但可能没有查询权限"�?
- 检�?Supabase RLS 策略是否配置正确
- 确保已登�?
- 检�?`trips` 表的 RLS 策略是否允许当前用户插入数据

## 检查环境变�?

在浏览器控制台运行：
```js
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
```

如果显示 `undefined` �?`placeholder`，说明环境变量没有正确加载�?

## 检�?Supabase 客户�?

在浏览器控制台运行：
```js
import { supabase } from '@/config/supabase.config'
console.log('Supabase URL:', supabase.supabaseUrl)
console.log('Supabase Key:', supabase.supabaseKey?.substring(0, 20) + '...')
```

## 检�?Session

在浏览器控制台运行：
```js
import { supabase } from '@/config/supabase.config'
const { data: { session }, error } = await supabase.auth.getSession()
console.log('Session:', session)
console.log('Error:', error)
```

## 测试插入操作

在浏览器控制台运行：
```js
import { supabase } from '@/config/supabase.config'
const { data, error } = await supabase
  .from('trips')
  .insert([{
    user_id: '你的用户ID',
    title: '测试行程',
    destination: '测试目的�?,
    start_date: '2025-01-01',
    end_date: '2025-01-02',
    days: 1,
    budget: 1000,
    travelers: 1,
    status: 'DRAFT',
    is_public: false,
    version: 1
  }])
  .select()
  .single()

console.log('Data:', data)
console.log('Error:', error)
```

如果插入成功，说明配置正确。如果失败，查看错误信息，可能是 RLS 策略或表结构的问题�?

