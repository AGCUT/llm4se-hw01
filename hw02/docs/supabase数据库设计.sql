-- ====================================
-- AI旅行规划师 Supabase数据库设计
-- ====================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- 1. 用户表（使用Supabase Auth）
-- ====================================
-- 注意：users表由Supabase Auth自动管理
-- 我们创建一个profiles表来存储额外的用户信息

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  phone VARCHAR(20),
  
  -- 个人偏好
  preferences JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用RLS（行级安全）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和更新自己的profile
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 插入profile的触发器（当新用户注册时自动创建）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================
-- 2. 行程表
-- ====================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 基本信息
  title VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  
  -- 旅行参数
  budget DECIMAL(10, 2) NOT NULL,
  travelers INTEGER DEFAULT 1,
  traveler_types JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '[]',
  
  -- 行程内容
  overview JSONB,
  daily_plans JSONB NOT NULL DEFAULT '[]',
  budget_breakdown JSONB,
  
  -- 地图数据
  map_center JSONB,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED')),
  is_public BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(100) UNIQUE,
  
  -- 版本控制
  version INTEGER DEFAULT 1,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);
CREATE INDEX idx_trips_status ON trips(status);

-- 启用RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的行程
CREATE POLICY "Users can view own trips" 
  ON trips FOR SELECT 
  USING (auth.uid() = user_id OR is_public = TRUE);

-- 用户只能创建自己的行程
CREATE POLICY "Users can create own trips" 
  ON trips FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的行程
CREATE POLICY "Users can update own trips" 
  ON trips FOR UPDATE 
  USING (auth.uid() = user_id);

-- 用户只能删除自己的行程
CREATE POLICY "Users can delete own trips" 
  ON trips FOR DELETE 
  USING (auth.uid() = user_id);

-- ====================================
-- 3. 费用记录表
-- ====================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  
  -- 费用信息
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'TRANSPORTATION', 'ACCOMMODATION', 'FOOD', 
    'TICKETS', 'SHOPPING', 'ENTERTAINMENT', 'OTHER'
  )),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CNY',
  description TEXT,
  
  -- 支付信息
  payment_method VARCHAR(50),
  payer VARCHAR(100),
  
  -- 凭证
  receipt_url TEXT,
  
  -- 时间
  expense_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);

-- 启用RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己行程的费用
CREATE POLICY "Users can view own trip expenses" 
  ON expenses FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = expenses.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- 用户只能创建自己行程的费用
CREATE POLICY "Users can create own trip expenses" 
  ON expenses FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = expenses.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- 用户可以更新自己行程的费用
CREATE POLICY "Users can update own trip expenses" 
  ON expenses FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = expenses.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- 用户可以删除自己行程的费用
CREATE POLICY "Users can delete own trip expenses" 
  ON expenses FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = expenses.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- ====================================
-- 4. 自动更新时间戳函数
-- ====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加更新触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- 5. 实时功能启用
-- ====================================
-- 为需要实时更新的表启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- ====================================
-- 6. 存储桶配置（文件存储）
-- ====================================
-- 这部分需要在Supabase Dashboard中手动创建
-- Storage -> New Bucket
-- 桶名称：
-- 1. avatars（用户头像）- Public
-- 2. receipts（费用凭证）- Private
-- 3. trip-images（行程图片）- Public

-- ====================================
-- 完成！
-- ====================================
-- 数据库设计完成，现在可以开始使用Supabase了

