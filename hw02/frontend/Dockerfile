# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 定义构建参数（环境变量）
# 这些变量在构建时传入，用于 Vite 构建
# 使用默认值处理可选环境变量
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ARG VITE_AMAP_KEY=""
ARG VITE_XUNFEI_APP_ID=""
ARG VITE_XUNFEI_API_KEY=""
ARG VITE_API_URL="http://localhost:3000"
ARG VITE_WS_URL="ws://localhost:3000"

# 将构建参数转换为环境变量（Vite 需要在构建时读取）
# 如果参数为空，Vite 会使用代码中的默认值
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_AMAP_KEY=${VITE_AMAP_KEY}
ENV VITE_XUNFEI_APP_ID=${VITE_XUNFEI_APP_ID}
ENV VITE_XUNFEI_API_KEY=${VITE_XUNFEI_API_KEY}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

# 复制 package 文件
COPY package*.json ./

# 安装依赖（使用 npm ci 以获得更快的、可靠的、可重复的构建）
RUN npm ci --only=production=false

# 复制源代码
COPY . .

# 构建应用
# 使用 build:docker 脚本跳过 TypeScript 检查（仅用于 Docker 构建）
# 如果构建失败，会输出详细错误信息
RUN echo "Starting build process..." && \
    echo "Running Docker build (skipping TypeScript check)..." && \
    npm run build:docker || (echo "Build failed! Error details above." && exit 1)

# 生产镜像 - 运行阶段
FROM nginx:alpine

# 安装 curl 和 wget 用于健康检查
RUN apk add --no-cache curl wget

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 设置文件权限（nginx 以 root 运行，但文件权限要正确）
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]

