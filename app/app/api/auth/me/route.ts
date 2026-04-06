import { NextRequest, NextResponse } from 'next/server'

/**
 * BFF: 获取当前登录用户信息
 * 前端通过此接口判断是否已登录
 */
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('session_id')?.value

  if (!sessionId) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  // TODO: 从 Redis 取 token，解析用户信息
  // const tokens = await redis.get(`session:${sessionId}`)
  // if (!tokens) return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({
    user: {
      id: 'placeholder',
      name: 'tpl User',
    },
  })
}
