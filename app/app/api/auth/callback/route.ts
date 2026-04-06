import { NextRequest, NextResponse } from 'next/server'

/**
 * BFF: OIDC 回调处理
 * 用 code 换 token，存 session，下发 HTTP-only cookie
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url))
  }

  try {
    // 1. 用 code 换 token
    const tokenRes = await fetch(`${process.env.CASDOOR_ENDPOINT}/api/login/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.CASDOOR_CLIENT_ID!,
        client_secret: process.env.CASDOOR_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.CASDOOR_REDIRECT_URI!,
      }),
    })

    if (!tokenRes.ok) throw new Error('Token exchange failed')

    const tokens = await tokenRes.json()

    // 2. 生成 session_id，存 token 到 Redis（TODO: 接入 Redis）
    const sessionId = crypto.randomUUID()
    // await redis.set(`session:${sessionId}`, JSON.stringify(tokens), { ex: 3600 })

    // 3. 下发 HTTP-only cookie
    const response = NextResponse.redirect(new URL('/dashboard', req.url))
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    })

    return response
  } catch {
    return NextResponse.redirect(new URL('/login?error=auth_failed', req.url))
  }
}
