'use client'

import { ArrowUpRightIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import Link from 'next/link'

import { CrossAppLink } from '@/components/common/cross-app-link'
import { Button, buttonVariants } from '@/components/ui/button'
import { useInfo } from '@/lib/info/context'
import { InfoError } from '@/lib/info/http'
import { routes } from '@/lib/info/routes'
import { cn } from '@/lib/utils'

import { useRequest, useRequestActions } from '../api/requests'
import { isFinal, wentWrong } from '../model/requests'
import { ProgressLine } from './progress-line'

// 一个申请：进度线、现在到哪了、终点不是「可用」时一句白话、可用之后去哪看。
// 用户只看得到自己的申请；看不到别的申请人是谁，只看得到「还有几个人也要」。
export function RequestScreen({ id }: { id: string }) {
  const t = useTranslations('requests.one')
  const tp = useTranslations('requests.progress')
  const format = useFormatter()
  const { locale } = useInfo()
  const found = useRequest(id)
  const { withdraw } = useRequestActions()

  if (!found.data) {
    return (
      <p className="text-muted-foreground mx-auto max-w-2xl px-6 py-10 text-sm">
        {found.isError ? t('failed') : t('loading')}
      </p>
    )
  }
  const request = found.data
  const done = isFinal(request.progress)
  const bad = wentWrong(request.progress)
  const origin = request.mine?.origin
  const failed = withdraw.isError ? (withdraw.error as InfoError).code : null

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10">
      <header>
        <Link
          href={routes.requests(locale)}
          className="text-muted-foreground text-[13px] underline-offset-3 hover:underline"
        >
          ← {t('back')}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {t('title', { code: request.security_code })}
          {request.kind === 'refresh' ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {t('kindRefresh')}
            </span>
          ) : null}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('requested', {
            at: format.dateTime(new Date(request.mine?.requested_at ?? request.created_at), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          })}
          {' · '}
          {t('others', { n: request.requesters })}
        </p>
      </header>

      <section className="rounded-xl border p-5">
        <ProgressLine progress={request.progress} />
        <p
          role="status"
          className={cn('mt-4 text-sm font-medium', bad && 'text-destructive')}
          data-progress={request.progress}
        >
          {tp(`now.${request.progress}`)}
        </p>
        {request.progress === 'rejected' && request.rejection_note ? (
          <p className="mt-1 text-sm">
            <span className="text-muted-foreground">{t('rejected')}：</span>
            {request.rejection_note}
          </p>
        ) : null}
        {!done ? <p className="text-muted-foreground mt-1 text-[13px]">{t('waiting')}</p> : null}
        {request.dataset ? (
          <p className="mt-2 text-sm">
            {t('dataset', {
              version: request.dataset.data_version.slice(-8),
              start: request.dataset.start_date,
              end: request.dataset.end_date,
            })}{' '}
            <CrossAppLink
              to="knowledge.dataset"
              values={{ dataset: request.dataset.dataset_id }}
              className="inline-flex items-center gap-0.5 underline underline-offset-3"
            >
              {t('toDataset')}
              <ArrowUpRightIcon className="size-3.5" />
            </CrossAppLink>
          </p>
        ) : null}
      </section>

      {request.mine?.reason ? (
        <section>
          <h2 className="text-muted-foreground mb-1 text-xs font-medium">{t('reason')}</h2>
          <p className="text-sm whitespace-pre-wrap">{request.mine.reason}</p>
        </section>
      ) : null}

      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          {t.has(`problem.${failed}`) ? t(`problem.${failed}`) : t('problem.other')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {/* 回到原处：地址是后端按它自己的配置给的，不用地址栏里带的任何地址 */}
        {origin?.return_url ? (
          <a
            href={origin.return_url}
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: request.progress === 'available' ? 'default' : 'outline' }),
            )}
          >
            {t('returnTo', { app: origin.app })}
          </a>
        ) : null}
        {request.can_withdraw ? (
          <Button
            variant="outline"
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate(request.id)}
          >
            {withdraw.isPending ? t('withdrawing') : t('withdraw')}
          </Button>
        ) : null}
        {done ? (
          <Link
            href={routes.newRequest(locale, { code: request.security_code })}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            {t('again')}
          </Link>
        ) : null}
      </div>
      {request.can_withdraw ? (
        <p className="text-muted-foreground text-[13px]">{t('withdrawNote')}</p>
      ) : null}
    </div>
  )
}
