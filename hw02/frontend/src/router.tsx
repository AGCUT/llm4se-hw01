// 路由配置
import { useEffect, useState } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import MainLayout from '@/components/layout/MainLayout/MainLayout'

// 页面组件
import Home from '@/pages/Home/Home'
import AuthPage from '@/pages/Auth/AuthPage'
import Dashboard from '@/pages/Dashboard/Dashboard'
import TripCreate from '@/pages/TripCreate/TripCreate'
import TripDetail from '@/pages/TripDetail/TripDetail'
import ExpenseManage from '@/pages/ExpenseManage/ExpenseManage'
import Profile from '@/pages/Profile/Profile'
import Settings from '@/pages/Profile/Settings'
import NotFound from '@/pages/NotFound/NotFound'

// 受保护的路由组件
const ProtectedRoute = () => {
  const { user, loading } = useAuthStore()

  // 正在加载认证状态
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          gap: '20px',
          backgroundColor: '#f7fafc'
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            border: '5px solid #e2e8f0',
            borderTop: '5px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
        <div style={{ color: '#4a5568', fontSize: '16px', fontWeight: 500 }}>
          正在验证身份...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // 未登录则重定向到登录页
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 已登录则渲染子路由
  return <Outlet />
}

// 公开路由组件（已登录用户不能访问）
const PublicRoute = () => {
  const { user, loading } = useAuthStore()

  // 正在加载认证状态
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        加载中...
      </div>
    )
  }

  // 已登录则重定向到首页
  if (user) {
    return <Navigate to="/" replace />
  }

  // 未登录则渲染子路由
  return <Outlet />
}

// 路由配置
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />
      },
      // 受保护的路由
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <Dashboard />
          },
          {
            path: 'trip/create',
            element: <TripCreate />
          },
          {
            path: 'trip/:id',
            element: <TripDetail />
          },
          {
            path: 'expense',
            element: <ExpenseManage />
          },
          {
            path: 'profile',
            element: <Profile />
          },
          {
            path: 'settings',
            element: <Settings />
          }
        ]
      }
    ]
  },
  // 公开路由（认证页面）
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: <AuthPage />
      },
      {
        path: '/register',
        element: <AuthPage />
      },
      {
        path: '/auth',
        element: <AuthPage />
      }
    ]
  },
  // 404 页面
  {
    path: '*',
    element: <NotFound />
  }
])

export default router
