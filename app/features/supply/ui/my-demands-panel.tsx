'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import type { Demand, DemandItem } from '@/contracts/supply'

import { useCancelDemand, useDemands, useRetryItem } from '../api/supply'
import {
  canCancel,
  canRetry,
  deadlineIso,
  defaultDeadlineLocal,
  keyText,
  newIdempotencyKey,
  receiptSummary,
} from '../model/supply'
import { useErrorText } from './error-text'

// 我的需求（SDD 0045 第 2.5 节）：本人名下的全部需求单，能看、取消、再试一次
export function MyDemandsPanel({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('supply')
  const demands = useDemands()
  if (demands.isPending) return <p role="status">{t('loading')}</p>
  if (demands.isError) return <p role="alert">{t('failed')}</p>
  if (demands.data.length === 0) return <p role="status">{t('demands.none')}</p>
  return (
    <ul className="flex flex-col gap-4" aria-label={t('demands.title')}>
      {demands.data.map((demand) => (
        <DemandCard key={demand.demand_id} demand={demand} csrfToken={csrfToken} />
      ))}
    </ul>
  )
}

function DemandCard({ demand, csrfToken }: { demand: Demand; csrfToken: string }) {
  const t = useTranslations('supply')
  const format = useFormatter()
  const errorText = useErrorText()
  const cancel = useCancelDemand(csrfToken)
  const when = (at: string) =>
    format.dateTime(new Date(at), { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{t(`status.${demand.status}`)}</span>
        <span className="text-muted-foreground">{t(`proposer.${demand.proposer}`)}</span>
        <span className="text-muted-foreground">
          {t('demands.createdAt', { at: when(demand.created_at) })}
        </span>
        {demand.deadline ? (
          <span className="text-muted-foreground">
            {t('demands.deadline', { at: when(demand.deadline) })}
          </span>
        ) : null}
        <span className="flex-1" />
        {canCancel(demand.items.map((i) => i.status)) ? (
          <Button
            variant="outline"
            size="sm"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(demand.demand_id)}
          >
            {t('demands.cancel')}
          </Button>
        ) : null}
      </div>
      {demand.note ? <p className="mt-1 text-sm">{demand.note}</p> : null}
      {cancel.isError ? <p role="alert">{errorText(cancel.error)}</p> : null}
      <ul className="mt-3 flex flex-col gap-2">
        {demand.items.map((item) => (
          <ItemRow key={item.item_id} item={item} csrfToken={csrfToken} />
        ))}
      </ul>
    </li>
  )
}

function ItemRow({ item, csrfToken }: { item: DemandItem; csrfToken: string }) {
  const t = useTranslations('supply')
  const errorText = useErrorText()
  const retry = useRetryItem(csrfToken)
  const [retryKey, setRetryKey] = useState(newIdempotencyKey)
  const [retryDeadline] = useState(() => deadlineIso(defaultDeadlineLocal(new Date())) ?? '')
  const { materials, notTaken } = receiptSummary(item.receipt)
  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs">{item.url ?? keyText(item.key)}</span>
        <span>{t(`status.${item.status}`)}</span>
        {item.reason && t.has(`reason.${item.reason}`) ? (
          <span className="text-muted-foreground">{t(`reason.${item.reason}`)}</span>
        ) : null}
        {item.retry_of ? (
          <span className="text-muted-foreground">{t('demands.retryOf')}</span>
        ) : null}
        {materials ? (
          <span className="text-muted-foreground">
            {t('demands.materials', { count: materials })}
          </span>
        ) : null}
        {notTaken ? (
          <span className="text-muted-foreground">
            {t('demands.notTaken', { count: notTaken })}
          </span>
        ) : null}
        {canRetry(item.status) ? (
          <Button
            variant="outline"
            size="xs"
            disabled={retry.isPending}
            onClick={() =>
              retry.mutate(
                {
                  itemId: item.item_id,
                  deadline: retryDeadline,
                  idempotencyKey: retryKey,
                },
                { onSuccess: () => setRetryKey(newIdempotencyKey()) },
              )
            }
          >
            {t('demands.retry')}
          </Button>
        ) : null}
      </div>
      {retry.isSuccess ? <p role="status">{t('demands.retried')}</p> : null}
      {retry.isError ? <p role="alert">{errorText(retry.error)}</p> : null}
    </li>
  )
}
