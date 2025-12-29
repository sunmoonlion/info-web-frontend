import type { AuthState } from '@/types/auth/authapi'
import type { LoginRequest } from '@/types/users/loginapi'
import { forwardToBackend, handleBackendError } from '../../utils/backend'

/**
 * 登录 API - Nuxt 服务器端路由
 * 路径：POST /api/users/login
 * 改造：使用 auth-app-backend 的 /login/oauth 接口，返回用户信息（不再返回 Token）
 */
export default defineEventHandler(async (event: any) => {
  try {
    // 读取请求体
    const body = await readBody<LoginRequest>(event)
    
    // 验证请求体
    if (!body.userName || !body.passWord) {
      throw createError({
        statusCode: 400,
        statusMessage: '用户名或密码不能为空',
      })
    }
    
    // 改造：调用 auth-app-backend 的登录接口（使用 Cookie 认证）
    const config = useRuntimeConfig(event)
    const authServiceUrl = config.authServiceUrl || 'http://localhost:3030'
    
    // 转发请求到 auth-app-backend
    const response = await $fetch(`${authServiceUrl}/api/v1/login/oauth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        username: body.userName,
        password: body.passWord,
      },
      credentials: 'include', // 确保 Cookie 被发送和接收
    })
    
    // 改造：返回用户信息（不再返回 Token）
    // auth-app-backend 会设置 Cookie，这里只返回用户信息
    return {
      userName: response.email || response.username || body.userName,
      userId: response.id || null,
      email: response.email,
      full_name: response.full_name,
      is_active: response.is_active,
      is_superuser: response.is_superuser,
    } as any
  } catch (error: any) {
    return handleBackendError(error)
  }
})
