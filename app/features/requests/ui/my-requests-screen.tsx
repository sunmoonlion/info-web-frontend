'use client'

import { useFormatter, useTranslations } from 'next-intl'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { useInfo } from '@/lib/info/context'
import { routes } from '@/lib/info/routes'
import { cn } from '@/lib/utils'

import { useMyRequests } from '../api/requests'
import { wentWrong } from '../model/requests'
import { ProgressLine } from './progress-line'

// 我的申请：每个申请一行，带进度线。有没走完的，页面每 15 秒自己刷新。
export function MyRequestsScreen() {
  const t = useTranslations('requests.list')
  const tp = useTranslations('requests.progress')
  const format = useFormatter()
  const { locale } = useInfo()
  const requests = useMyRequests()
  const when = (at: string) =>
    format.dateTime(new Date(at), { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
      <header className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
        </div>
        <Link href={routes.newRequest(locale)} className={cn(buttonVariants())}>
          {t('requestNew')}
        </Link>
      </header>

      {requests.isPending ? (
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      ) : requests.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {t('failed')}
        </p>
      ) : requests.data.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border px-4 py-6 text-center text-sm">
          {t('none')}
        </p>
      ) : (
        <ul aria-label={t('title')} className="divide-y rounded-xl border">
          {requests.data.map((request) => (
            <li key={request.id}>
              <Link
                href={routes.request(locale, request.id)}
                className="hover:bg-muted/60 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
              >
                <span className="w-24 shrink-0">
                  <span className="block font-mono text-base font-medium">
                    {request.security_code}
                  </span>
                  {request.kind === 'refresh' ? (
                    <span className="text-muted-foreground text-xs">{t('update')}</span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <ProgressLine progress={request.progress} compact />
                  <span
                    className={cn(
                      'mt-1 block text-[13px]',
                      wentWrong(request.progress) ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {tp(`now.${request.progress}`)}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-[13px]">
                  {when(request.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
