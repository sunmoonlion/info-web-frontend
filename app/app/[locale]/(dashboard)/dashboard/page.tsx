import { redirect } from 'next/navigation'

import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 登录之后默认到这里。info 网页端给用户用的就是申请：直接去「我的申请」。
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  await requireBrowserSession(locale)
  redirect(`/${locale}/requests`)
}
