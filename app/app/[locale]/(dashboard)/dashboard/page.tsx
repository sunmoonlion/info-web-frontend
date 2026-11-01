import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { InfoShell } from '@/features/shell'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shell')
  return { title: t('brand'), robots: { index: false, follow: false } }
}

// 登录之后默认到这里：一句说明，入口在顶上一条（提需求、我的需求、订阅，SDD 0045 第一节）。
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireBrowserSession(locale)
  const t = await getTranslations('shell')
  return (
    <InfoShell csrfToken={session.csrf_token} locale={locale}>
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-xl font-semibold tracking-tight">{t('nothingHere')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('hint')}</p>
      </div>
    </InfoShell>
  )
}
