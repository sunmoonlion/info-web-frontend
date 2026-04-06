import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

/**
 * BFF: 发起 OIDC 登录
 * 跳转到 Casdoor 授权页
 */
export async function GET(_req: NextRequest) {
  const casdoorEndpoint = process.env.CASDOOR_ENDPOINT!
  const clientId = process.env.CASDOOR_CLIENT_ID!
  const redirectUri = encodeURIComponent(process.env.CASDOOR_REDIRECT_URI!)
  const state = crypto.randomUUID()

  const authUrl =
    `${casdoorEndpoint}/login/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=openid profile email` +
    `&state=${state}`

  redirect(authUrl)
}
