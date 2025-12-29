/**
 * 刷新 Token API - Nuxt 服务器端路由
 * 路径：POST /api/token/refresh
 * 
 * 改造：已废弃，使用 Session + Cookie 认证，不再需要刷新 Token
 * 保留此接口用于兼容，但实际应该调用 auth-app-backend 的 /auth/me 接口
 */
export default defineEventHandler(async (event: any) => {
  // 改造：不再刷新 Token，而是从 auth-app-backend 获取用户信息
  const config = useRuntimeConfig(event)
  const authServiceUrl = config.authServiceUrl || 'http://localhost:3030'
  const cookies = parseCookies(event)
  const sessionCookieName = config.public.sessionCookieName || 'sunmoonai_session'
  const sessionId = cookies[sessionCookieName]

  if (!sessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No session found',
    })
  }

  try {
    // 调用 auth-app-backend 的 /auth/me 接口获取用户信息
    const user = await $fetch(`${authServiceUrl}/api/v1/auth/me`, {
      headers: {
        cookie: `${sessionCookieName}=${sessionId}`,
        'X-Service-Call': 'true',
      },
      credentials: 'include',
      timeout: 3000,
    })

    // 返回用户信息（兼容旧接口格式）
    return {
      userName: user.email || user.username,
      userId: user.id,
      email: user.email,
      full_name: user.full_name,
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 401,
      statusMessage: error.statusMessage || 'Failed to refresh session',
    })
  }
})
