# AI旅行规划�?- 前端

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管�?*: Zustand
- **数据请求**: TanStack Query + Axios
- **UI组件**: Ant Design
- **样式**: Tailwind CSS + CSS Modules
- **路由**: React Router v6
- **图表**: ECharts
- **地图**: 高德地图 JavaScript API 2.0
- **语音**: Web Speech API / 科大讯飞 WebSocket
- **实时通信**: Socket.io Client

## 项目结构

```
frontend/
├── public/                 # 静态资�?
├── src/
�?  ├── api/               # API请求封装
�?  ├── assets/            # 资源文件
�?  ├── components/        # 组件
�?  �?  ├── common/        # 通用组件
�?  �?  ├── layout/        # 布局组件
�?  �?  ├── trip/          # 行程组件
�?  �?  ├── expense/       # 费用组件
�?  �?  └── voice/         # 语音组件
�?  ├── pages/             # 页面
�?  ├── hooks/             # 自定义Hooks
�?  ├── store/             # 状态管�?
�?  ├── services/          # 业务服务
�?  ├── utils/             # 工具函数
�?  ├── types/             # 类型定义
�?  └── config/            # 配置文件
└── tests/                 # 测试文件
```

## 开发指�?

### 安装依赖

```bash
npm install
```

### 环境变量配置

复制 `.env.example` �?`.env.local` 并填写配置：

```bash
cp .env.example .env.local
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

### 代码检�?

```bash
npm run lint
npm run lint:fix
```

### 代码格式�?

```bash
npm run format
```

### 运行测试

```bash
npm test
```

## Docker部署

### 构建镜像

```bash
docker build -t ai-travel-planner-frontend .
```

### 运行容器

```bash
docker run -p 80:80 ai-travel-planner-frontend
```

## 贡献指南

1. Fork项目
2. 创建特性分�?(`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

## 许可�?

MIT License


