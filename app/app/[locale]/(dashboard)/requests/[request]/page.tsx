import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { RequestScreen } from '@/features/requests'
import { routes } from '@/lib/info/routes'
import { requireSession } from '@/lib/info/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('requests.list')
  return { title: t('title'), robots: { index: false, follow: false } }
}

export default async function RequestPage({
  params,
}: {
  params: Promise<{ locale: string; request: string }>
}) {
  const { locale, request } = await params
  await requireSession(locale, routes.request(locale, request))
  return <RequestScreen id={request} />
}
