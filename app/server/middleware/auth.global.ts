import type { EventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'

interface AuthContext {
  user: any | null
  authenticated: boolean
  sessionId?: string
}

declare module 'h3' {
  interface H3EventContext {
    auth?: AuthContext
  }
}

// 短时间缓存用户信息（减少 BFF 调用）
const userCache = new Map<string, { user: any; expires: number }>()
const CACHE_TTL = 5000 // 5秒缓存

export default defineEventHandler(async (event) => {
  // 跳过静态资源和非 API 请求
  const url = getRequestURL(event)
  if (url.pathname.startsWith('/_nuxt') || url.pathname.startsWith('/api/')) {
    return
  }

  const config = useRuntimeConfig()
  const cookies = parseCookies(event)
  const sessionCookieName = config.public.sessionCookieName || 'sunmoonai_session'
  const sessionId = cookies[sessionCookieName]

  // 如果没有 Session Cookie，直接跳过
  if (!sessionId) {
    event.context.auth = {
      user: null,
      authenticated: false,
    }
    return
  }

  // 验证 Session ID 格式（防止注入攻击）
  if (!/^[0-9a-fA-F-]{36}$/.test(sessionId)) {
    event.context.auth = {
      user: null,
      authenticated: false,
    }
    return
  }

  // 检查缓存
  const cached = userCache.get(sessionId)
  if (cached && cached.expires > Date.now()) {
    event.context.auth = {
      user: cached.user,
      authenticated: true,
      sessionId,
    }
    return
  }

  // 调用业务BFF的 /auth/me 接口（业务BFF会转发Cookie到auth-app-bff）
  try {
    // 业务BFF地址（应该从配置中获取）
    const bffUrl = config.public.bffUrl || config.bffUrl || 'http://localhost:8000'
    const apiVersion = config.public.apiVersion || 'v1'
    const user = await $fetch(`${bffUrl}/api/${apiVersion}/auth/me`, {
      headers: {
        cookie: `${sessionCookieName}=${sessionId}`, // 转发 Cookie
      },
      credentials: 'include', // 确保 Cookie 被发送
      timeout: 3000, // 3秒超时
      retry: 1, // 重试1次
    })

    // 更新缓存
    userCache.set(sessionId, {
      user,
      expires: Date.now() + CACHE_TTL,
    })

    // 定期清理过期缓存
    if (userCache.size > 1000) {
      const now = Date.now()
      for (const [key, value] of userCache.entries()) {
        if (value.expires < now) {
          userCache.delete(key)
        }
      }
    }

    // 注入到上下文
    event.context.auth = {
      user,
      authenticated: true,
      sessionId,
    }
  } catch (error: any) {
    // 区分错误类型
    if (error.statusCode === 401 || error.statusCode === 403) {
      // 认证失败：Cookie 无效或过期
      event.context.auth = {
        user: null,
        authenticated: false,
      }
    } else {
      // 网络错误或其他错误：记录日志，但不影响页面渲染
      console.error('[Auth Middleware] Failed to fetch user:', error)
      event.context.auth = {
        user: null,
        authenticated: false,
      }
    }
  }
}) satisfies EventHandler

