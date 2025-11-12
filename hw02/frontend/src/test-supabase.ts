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