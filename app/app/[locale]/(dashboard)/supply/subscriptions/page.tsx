import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { SubscriptionsPanel } from '@/features/supply'
import { InfoShell } from '@/features/shell'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('supply.subscriptions')
  return { title: t('title'), robots: { index: false, follow: false } }
}

// 订阅（SDD 0045 第 2.2、2.5 节）：建、看每轮记录、暂停、恢复、续订、撤。
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireBrowserSession(locale, `/${locale}/supply/subscriptions`)
  const t = await getTranslations('supply.subscriptions')
  return (
    <InfoShell csrfToken={session.csrf_token} locale={locale}>
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">{t('lead')}</p>
        <SubscriptionsPanel csrfToken={session.csrf_token} />
      </div>
    </InfoShell>
  )
}
