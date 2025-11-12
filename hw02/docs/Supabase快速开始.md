# Supabase快速开始指南

## 🚀 5分钟快速上手

### 步骤1：创建Supabase项目（2分钟）

1. **访问Supabase官网**
   - 打开 https://supabase.com
   - 点击 "Start your project"
   - 使用GitHub账号登录

2. **创建新项目**
   ```
   项目名称: ai-travel-planner
   数据库密码: [设置强密码并保存]
   区域: Southeast Asia (Singapore)
   ```

3. **等待初始化**（约1-2分钟）

### 步骤2：创建数据库表（1分钟）

1. 点击左侧菜单 **"SQL Editor"**
2. 点击 **"New Query"**
3. 复制粘贴 `docs/supabase数据库设计.sql` 中的SQL代码
4. 点击 **"Run"** 执行

✅ 数据库表创建完成！

### 步骤3：获取API密钥（30秒）

1. 点击左侧菜单 **"Settings"** → **"API"**
2. 复制以下信息：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` （长串字符）

### 步骤4：配置前端环境变量（30秒）

1. 在PowerShell中执行：
```powershell
cd D:\hw\llm4se\llm4se-hw01\hw02\frontend
Copy-Item .env.example .env.local
notepad .env.local
```

2. 在打开的记事本中，修改以下内容：
```bash
# Supabase配置（粘贴步骤3复制的信息）
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...你的anon_key
```

3. 保存并关闭

### 步骤5：安装Supabase依赖（1分钟）

```powershell
cd D:\hw\llm4se\llm4se-hw01\hw02\frontend
npm install
```

### 步骤6：测试连接（30秒）

创建测试文件 `frontend/src/test-supabase.ts`：

```typescript
import { supabase } from './config/supabase.config'

async function testConnection() {
  try {
    // 测试数据库连接
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ 连接失败:', error.message)
    } else {
      console.log('✅ Supabase连接成功!')
    }
  } catch (err) {
    console.error('❌ 错误:', err)
  }
}

testConnection()
```

运行测试：
```powershell
npm run dev
# 在浏览器控制台查看输出
```

---

## ✅ 完成！现在您可以：

### 1. 测试用户注册

在浏览器控制台中运行：

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
})

console.log('注册结果:', data, error)
```

### 2. 测试创建行程

```javascript
const { data, error } = await supabase
  .from('trips')
  .insert([
    {
      title: '测试行程',
      destination: '北京',
      start_date: '2025-12-01',
      end_date: '2025-12-05',
      days: 5,
      budget: 5000,
      travelers: 2,
      daily_plans: []
    }
  ])
  .select()

console.log('创建结果:', data, error)
```

### 3. 测试实时订阅

```javascript
const channel = supabase
  .channel('trips-changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'trips' 
    }, 
    (payload) => {
      console.log('实时更新:', payload)
    }
  )
  .subscribe()
```

---

## 🎯 下一步开发

现在您已经完成Supabase配置，可以开始实现功能了！

### 推荐开发顺序：

1. **认证功能** ⏳
   - 实现登录页面
   - 实现注册页面
   - 集成Supabase Auth

2. **行程管理** ⏳
   - 实现行程列表页
   - 实现行程详情页
   - 实现行程创建功能

3. **费用管理** ⏳
   - 实现费用记录功能
   - 实现预算统计
   - 集成图表展示

4. **实时功能** ⏳
   - 实现实时更新
   - 实现协作编辑

### 参考资料：

- 📖 详细集成指南：`docs/Supabase集成指南.md`
- 🗃️ 数据库设计：`docs/supabase数据库设计.sql`
- 🔧 配置文件：`frontend/src/config/supabase.config.ts`

---

## 🐛 常见问题快速解决

### 问题1：连接失败

**检查清单**：
- ✅ `.env.local` 文件是否存在
- ✅ `VITE_SUPABASE_URL` 是否正确
- ✅ `VITE_SUPABASE_ANON_KEY` 是否完整复制
- ✅ 是否重启了开发服务器（`npm run dev`）

### 问题2：查询返回空数据

**原因**：可能是RLS（行级安全）策略导致

**解决**：
1. 确保已登录
2. 检查RLS策略是否正确
3. 临时禁用RLS测试（开发阶段）：
   ```sql
   ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
   ```

### 问题3：无法注册用户

**检查**：
1. Supabase Dashboard → Authentication → Settings
2. 确保 "Enable Email Confirmations" 已关闭（开发阶段）
3. 或查看邮箱确认邮件

---

## 📞 获取帮助

如果遇到问题：

1. 查看Supabase Dashboard → Logs
2. 查看浏览器控制台错误
3. 查阅官方文档：https://supabase.com/docs
4. 查看本地文档：`docs/Supabase集成指南.md`

---

**祝您开发顺利！** 🎉

