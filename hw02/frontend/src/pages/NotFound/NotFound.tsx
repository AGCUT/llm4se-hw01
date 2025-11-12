// NotFound页面
import { useNavigate } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div style={{ 
      padding: '60px 20px', 
      textAlign: 'center',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ fontSize: '72px', margin: '0' }}>404</h1>
      <h2 style={{ fontSize: '32px', marginTop: '20px' }}>页面不存在</h2>
      <p style={{ fontSize: '18px', color: '#666', marginTop: '10px' }}>
        抱歉，您访问的页面不存在
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '30px',
          padding: '12px 32px',
          fontSize: '16px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        返回首页
      </button>
    </div>
  )
}

export default NotFound
