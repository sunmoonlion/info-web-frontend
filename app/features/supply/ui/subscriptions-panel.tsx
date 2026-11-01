'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Reading, Subscription, SubscriptionInput } from '@/contracts/supply'

import {
  useOptions,
  useSearches,
  useSubscribe,
  useSubscription,
  useSubscriptionAction,
  useSubscriptions,
} from '../api/supply'
import { addDays, newIdempotencyKey, parseSubjects, parseUrls } from '../model/supply'
import { CandidatePicker } from './candidates'
import { useErrorText } from './error-text'
import { DocTypeSelect, fieldClass, inputClass, ReadingsField } from './fields'

const EVERY = [6, 24, 168] as const

// 订阅（SDD 0045 第 2.2、2.5 节）：建、看每轮记录、暂停、恢复、续订、撤。建、续、撤凭本人
// 令牌在 knowbase 留、改、撤长期范围同意
export function SubscriptionsPanel({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('supply')
  const subscriptions = useSubscriptions()
  return (
    <div className="flex flex-col gap-6">
      <CreateForm csrfToken={csrfToken} />
      {subscriptions.isPending ? <p role="status">{t('loading')}</p> : null}
      {subscriptions.isError ? <p role="alert">{t('failed')}</p> : null}
      {subscriptions.data?.length === 0 ? <p role="status">{t('subscriptions.none')}</p> : null}
      <ul className="flex flex-col gap-4" aria-label={t('subscriptions.title')}>
        {subscriptions.data?.map((s) => (
          <SubscriptionCard key={s.subscription_id} sub={s} csrfToken={csrfToken} />
        ))}
      </ul>
    </div>
  )
}

function CreateForm({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('supply')
  const errorText = useErrorText()
  const options = useOptions()
  const subscribe = useSubscribe(csrfToken)
  const [by, setBy] = useState<SubscriptionInput['by']>('description')
  const [subjectText, setSubjectText] = useState('')
  const [docType, setDocType] = useState('interim_announcement')
  const [urlText, setUrlText] = useState('')
  const [topic, setTopic] = useState('')
  const [readings, setReadings] = useState<Reading[]>(['original'])
  const [endsOn, setEndsOn] = useState(() => addDays(new Date(), 180))
  const [every, setEvery] = useState<number>(24)
  const [monthlyCap, setMonthlyCap] = useState(50)
  const [purpose, setPurpose] = useState('')
  const [skipBacklog, setSkipBacklog] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const { subjects } = parseSubjects(subjectText)
  const { urls } = parseUrls(urlText)

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-4"
      aria-label={t('subscriptions.create')}
      onSubmit={(e) => {
        e.preventDefault()
        subscribe.mutate(
          {
            by,
            subjects: by === 'description' ? subjects : [],
            doc_types: by === 'description' ? [docType] : [],
            urls: by === 'url' ? urls : [],
            topic: by === 'topic' ? topic.trim() : null,
            readings,
            ends_on: endsOn,
            every_hours: every,
            monthly_cap: monthlyCap,
            purpose: purpose.trim(),
            skip_backlog: skipBacklog,
            idempotency_key: idempotencyKey,
          },
          { onSuccess: () => setIdempotencyKey(newIdempotencyKey()) },
        )
      }}
    >
      <label className={fieldClass}>
        {t('subscriptions.by')}
        <select
          className={inputClass}
          value={by}
          onChange={(e) => setBy(e.target.value as SubscriptionInput['by'])}
        >
          {(['description', 'url', 'topic'] as const).map((value) => (
            <option key={value} value={value}>
              {t(`subscriptions.byOption.${value}`)}
            </option>
          ))}
        </select>
      </label>
      {by === 'description' ? (
        <>
          <label className={fieldClass}>
            {t('new.subjects')}
            <Textarea
              value={subjectText}
              placeholder={t('new.subjectsHint')}
              onChange={(e) => setSubjectText(e.target.value)}
            />
          </label>
          <label className={fieldClass} htmlFor="subscription-doc-type">
            {t('new.docType')}
            <DocTypeSelect
              id="subscription-doc-type"
              options={options.data}
              value={docType}
              onChange={setDocType}
            />
          </label>
        </>
      ) : null}
      {by === 'url' ? (
        <label className={fieldClass}>
          {t('new.urls')}
          <Textarea
            value={urlText}
            placeholder={t('new.urlsHint')}
            onChange={(e) => setUrlText(e.target.value)}
          />
        </label>
      ) : null}
      {by === 'topic' ? (
        <label className={fieldClass}>
          {t('topic.topic')}
          <input
            className={inputClass}
            value={topic}
            maxLength={200}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
      ) : null}
      <ReadingsField value={readings} onChange={setReadings} name="subscription-readings" />
      <div className="flex flex-wrap gap-3">
        <label className={fieldClass}>
          {t('subscriptions.endsOn')}
          <input
            type="date"
            required
            className={inputClass}
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
          />
        </label>
        <label className={fieldClass}>
          {t('subscriptions.every')}
          <select
            className={inputClass}
            value={every}
            onChange={(e) => setEvery(Number(e.target.value))}
          >
            {EVERY.map((h) => (
              <option key={h} value={h}>
                {t(`subscriptions.everyOption.${h}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          {t('subscriptions.monthlyCap')}
          <input
            type="number"
            min={1}
            max={options.data?.max_monthly_cap ?? 1000}
            className={inputClass}
            value={monthlyCap}
            onChange={(e) => setMonthlyCap(Number(e.target.value) || 1)}
          />
        </label>
      </div>
      <label className={fieldClass}>
        {t('subscriptions.purpose')}
        <input
          className={inputClass}
          required
          maxLength={200}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={skipBacklog}
          onChange={(e) => setSkipBacklog(e.target.checked)}
        />
        {t('subscriptions.skipBacklog')}
      </label>
      <Button type="submit" disabled={subscribe.isPending || !purpose.trim()}>
        {t('subscriptions.create')}
      </Button>
      {subscribe.isError ? <p role="alert">{errorText(subscribe.error)}</p> : null}
    </form>
  )
}

function SubscriptionCard({ sub, csrfToken }: { sub: Subscription; csrfToken: string }) {
  const t = useTranslations('supply')
  const format = useFormatter()
  const errorText = useErrorText()
  const act = useSubscriptionAction(csrfToken)
  const [open, setOpen] = useState(false)
  const [renewTo, setRenewTo] = useState(() => addDays(new Date(sub.ends_on), 180))
  const live = sub.status === 'active' || sub.status === 'paused'
  const what =
    sub.by === 'description'
      ? `${sub.subjects.join(', ')} · ${sub.doc_types.map((d) => (t.has(`docType.${d}`) ? t(`docType.${d}`) : d)).join(', ')}`
      : sub.by === 'url'
        ? sub.urls.join(', ')
        : (sub.topic ?? '')
  return (
    <li className="rounded-lg border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{t(`subscriptions.status.${sub.status}`)}</span>
        <span>{what}</span>
        <span className="text-muted-foreground">
          {t('subscriptions.until', { date: sub.ends_on })}
        </span>
        {sub.last_checked_at ? (
          <span className="text-muted-foreground">
            {t('subscriptions.lastChecked', {
              at: format.dateTime(new Date(sub.last_checked_at), {
                dateStyle: 'medium',
                timeStyle: 'short',
              }),
            })}
          </span>
        ) : null}
      </div>
      {sub.status_reason && t.has(`subscriptions.statusReason.${sub.status_reason}`) ? (
        <p className="text-muted-foreground">
          {t(`subscriptions.statusReason.${sub.status_reason}`)}
        </p>
      ) : null}
      {sub.renew_due ? <p role="status">{t('subscriptions.renewDue')}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {sub.status === 'active' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => act.mutate({ id: sub.subscription_id, action: 'pause' })}
          >
            {t('subscriptions.pause')}
          </Button>
        ) : null}
        {sub.status === 'paused' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => act.mutate({ id: sub.subscription_id, action: 'resume' })}
          >
            {t('subscriptions.resume')}
          </Button>
        ) : null}
        {live || sub.status === 'expired' ? (
          <>
            <label className="flex items-center gap-1">
              {t('subscriptions.renew')}
              <input
                type="date"
                className={inputClass}
                value={renewTo}
                onChange={(e) => setRenewTo(e.target.value)}
              />
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                act.mutate({ id: sub.subscription_id, action: 'renew', endsOn: renewTo })
              }
            >
              {t('subscriptions.doRenew')}
            </Button>
          </>
        ) : null}
        {live ? (
          <>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={sub.skip_backlog}
                onChange={(e) =>
                  act.mutate({ id: sub.subscription_id, action: 'backlog', skip: e.target.checked })
                }
              />
              {t('subscriptions.skipBacklog')}
            </label>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => act.mutate({ id: sub.subscription_id, action: 'cancel' })}
            >
              {t('subscriptions.cancel')}
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
          {open ? t('subscriptions.hideRounds') : t('subscriptions.showRounds')}
        </Button>
      </div>
      {act.isError ? <p role="alert">{errorText(act.error)}</p> : null}
      {open ? <Rounds id={sub.subscription_id} /> : null}
      {sub.by === 'topic' && live ? (
        <TopicRound id={sub.subscription_id} csrfToken={csrfToken} />
      ) : null}
    </li>
  )
}

function Rounds({ id }: { id: string }) {
  const t = useTranslations('supply.subscriptions')
  const format = useFormatter()
  const detail = useSubscription(id)
  if (!detail.data) return null
  if (detail.data.rounds.length === 0) return <p className="mt-2">{t('noRounds')}</p>
  return (
    <table className="mt-2 w-full text-left text-xs">
      <caption className="sr-only">{t('rounds')}</caption>
      <thead>
        <tr>
          <th>{t('round.at')}</th>
          <th>{t('round.found')}</th>
          <th>{t('round.taken')}</th>
          <th>{t('round.overCap')}</th>
        </tr>
      </thead>
      <tbody>
        {detail.data.rounds.map((r) => (
          <tr key={r.started_at}>
            <td>
              {format.dateTime(new Date(r.started_at), { dateStyle: 'medium', timeStyle: 'short' })}
            </td>
            <td>{r.found}</td>
            <td>{r.taken}</td>
            <td>{r.over_cap}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// 按主题订阅：这一轮的候选要本人勾（7 天内）
function TopicRound({ id, csrfToken }: { id: string; csrfToken: string }) {
  const t = useTranslations('supply.subscriptions')
  const searches = useSearches()
  const current = searches.data?.find((s) => s.subscription_id === id && s.status === 'ready')
  if (!current) return null
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="font-medium">{t('candidates')}</p>
      <CandidatePicker search={current} csrfToken={csrfToken} />
    </div>
  )
}
