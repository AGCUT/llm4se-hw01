// Footer组件
import './Footer.module.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>关于我们</h4>
          <p>AI 旅行规划师 - 让旅行更简单</p>
        </div>
        <div className="footer-section">
          <h4>快速链接</h4>
          <ul>
            <li><a href="/">首页</a></li>
            <li><a href="/about">关于</a></li>
            <li><a href="/contact">联系我们</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>法律</h4>
          <ul>
            <li><a href="/terms">服务条款</a></li>
            <li><a href="/privacy">隐私政策</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {currentYear} AI 旅行规划师. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
