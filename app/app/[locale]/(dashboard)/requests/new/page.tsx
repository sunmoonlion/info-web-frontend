import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NewRequestScreen } from '@/features/requests'
import { routes } from '@/lib/info/routes'
import { requireSession } from '@/lib/info/session'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('requests.new')
  return { title: t('title'), robots: { index: false, follow: false } }
}

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined

// 申请入库。别的应用用链接把用户带到这里，可带 code、from、ref。
// 没登录的人先去登录，登录完回到这一页，这三个参数还在（AT-INFO-14）。别的参数不带。
export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  await requireSession(
    locale,
    routes.newRequest(locale, {
      code: one(query.code),
      from: one(query.from),
      ref: one(query.ref),
    }),
  )
  return <NewRequestScreen />
}
