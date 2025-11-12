// Simple HTTP Server Test
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <html>
      <head><title>测试服务器</title></head>
      <body>
        <h1>✅ 服务器工作正常！</h1>
        <p>如果您能看到这个页面，说明：</p>
        <ul>
          <li>✅ Node.js HTTP服务器正常</li>
          <li>✅ 浏览器可以访问本地服务</li>
          <li>✅ 网络配置正常</li>
        </ul>
        <p>问题可能出在Vite配置上</p>
      </body>
    </html>
  `);
});

server.listen(8888, '127.0.0.1', () => {
  console.log('✅ 测试服务器启动成功！');
  console.log('📍 访问: http://127.0.0.1:8888');
  console.log('');
  console.log('如果浏览器能打开这个页面，说明不是系统问题');
  console.log('问题可能在Vite配置');
});

