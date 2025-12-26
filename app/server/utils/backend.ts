/**
 * 服务器端工具函数：转发请求到后端 API
 * 改造：支持 Cookie 转发
 */

// 获取后端 API 基础地址（从 Nuxt 运行时配置读取）
function getBackendBaseUrl(event?: any): string {
  try {
    const config = useRuntimeConfig(event)
    return config.backendApiUrl || 'http://47.100.19.119'
  } catch {
    return 'http://47.100.19.119'
  }
}

/**
 * 转发请求到后端 API（改造：支持 Cookie 转发）
 * @param event Nuxt 事件对象
 * @param path 后端 API 路径（例如：'/api/login/'）
 * @param options 请求选项
 */
export async function forwardToBackend(
  event: any,
  path: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
) {
  const backendBaseUrl = getBackendBaseUrl(event)
  const url = `${backendBaseUrl}${path}`
  
  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  // 改造：转发 Cookie（不再使用 Authorization header）
  const cookies = event.headers.get('cookie')
  if (cookies) {
    headers['Cookie'] = cookies
  }
  
  // 如果是调用认证服务，添加 X-Service-Call header
  const authServiceUrl = useRuntimeConfig(event).authServiceUrl || 'http://localhost:3030'
  if (url.includes(authServiceUrl) || path.includes('/auth/')) {
    headers['X-Service-Call'] = 'true'
  }
  
  // 转发请求到后端（使用 $fetch，Nuxt 会自动提供）
  // @ts-ignore - $fetch 在 Nuxt 服务器端是全局可用的
  const response = await $fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    credentials: 'include', // 确保 Cookie 被发送
  })
  
  return response
}

/**
 * 处理错误响应
 */
export function handleBackendError(error: any) {
  if (error?.response) {
    const errorMessage = error.response._data?.detail || error.response._data?.message || '请求失败，请稍后再试'
    throw createError({
      statusCode: error.response.status || 500,
      statusMessage: errorMessage,
    })
  } else {
    throw createError({
      statusCode: 500,
      statusMessage: '网络错误，请稍后重试',
    })
  }
}
