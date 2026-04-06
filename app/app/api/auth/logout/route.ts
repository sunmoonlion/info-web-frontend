import { NextRequest, NextResponse } from 'next/server'

/**
 * BFF: 退出登录
 * 清除 session cookie，跳转 Casdoor 登出
 */
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('session_id')?.value

  if (sessionId) {
    // TODO: 从 Redis 删除 session
    // await redis.del(`session:${sessionId}`)
  }

  const response = NextResponse.redirect(new URL('/login', req.url))
  response.cookies.delete('session_id')

  return response
}
