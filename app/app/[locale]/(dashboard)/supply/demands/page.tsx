import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { MyDemandsPanel } from '@/features/supply'
import { InfoShell } from '@/features/shell'
import { requireBrowserSession } from '@/lib/server/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('supply.demands')
  return { title: t('title'), robots: { index: false, follow: false } }
}

// 我的需求（SDD 0045 第 2.5 节）：本人名下的全部需求单，能看、取消、再试一次。
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await requireBrowserSession(locale, `/${locale}/supply/demands`)
  const t = await getTranslations('supply.demands')
  return (
    <InfoShell csrfToken={session.csrf_token} locale={locale}>
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">{t('lead')}</p>
        <MyDemandsPanel csrfToken={session.csrf_token} />
      </div>
    </InfoShell>
  )
}
