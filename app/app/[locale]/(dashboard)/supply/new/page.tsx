import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NewDemandPanel } from '@/features/supply'
import { InfoShell } from '@/features/shell'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('supply.new')
  return { title: t('title'), robots: { index: false, follow: false } }
}

// 提需求（SDD 0045 第 2.1、2.2 节）：按描述、给网址、按主题找；本人提交即确认。
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireBrowserSession(locale, `/${locale}/supply/new`)
  const t = await getTranslations('supply.new')
  return (
    <InfoShell csrfToken={session.csrf_token} locale={locale}>
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">{t('lead')}</p>
        <NewDemandPanel csrfToken={session.csrf_token} />
      </div>
    </InfoShell>
  )
}
