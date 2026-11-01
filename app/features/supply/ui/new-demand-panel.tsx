'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { DemandInput, Prematch, Reading } from '@/contracts/supply'
import { Link } from '@/i18n/navigation'

import {
  useOptions,
  usePrematch,
  useSearch,
  useSecurities,
  useStartSearch,
  useSubmitDemand,
} from '../api/supply'
import {
  deadlineIso,
  defaultDeadlineLocal,
  describeDemand,
  newIdempotencyKey,
  parseSubjects,
  parseUrls,
  urlDemand,
} from '../model/supply'
import { CandidatePicker } from './candidates'
import { useErrorText } from './error-text'
import { DocTypeSelect, fieldClass, inputClass, ReadingsField } from './fields'

type Tab = 'description' | 'url' | 'topic'
const TABS: Tab[] = ['description', 'url', 'topic']

// 提需求（SDD 0045 第 2.1、2.2 节）：按描述、给网址、按主题找。本人提交即确认（knowfeed 凭
// 本人令牌请 knowbase 记确认）；提交前可以先预切合，看这类能不能取、网站审没审过
export function NewDemandPanel({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('supply.new')
  const [tab, setTab] = useState<Tab>('description')
  return (
    <section className="flex flex-col gap-4" aria-label={t('title')}>
      <div role="tablist" className="flex gap-2 border-b">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={`px-3 py-2 text-sm ${tab === name ? 'border-primary border-b-2 font-medium' : 'text-muted-foreground'}`}
            onClick={() => setTab(name)}
          >
            {t(`tabs.${name}`)}
          </button>
        ))}
      </div>
      {tab === 'description' ? <DescriptionForm csrfToken={csrfToken} /> : null}
      {tab === 'url' ? <UrlForm csrfToken={csrfToken} /> : null}
      {tab === 'topic' ? <TopicForm csrfToken={csrfToken} /> : null}
    </section>
  )
}

function CommonFields({
  readings,
  setReadings,
  deadline,
  setDeadline,
  note,
  setNote,
}: {
  readings: Reading[]
  setReadings: (v: Reading[]) => void
  deadline: string
  setDeadline: (v: string) => void
  note: string
  setNote: (v: string) => void
}) {
  const t = useTranslations('supply.new')
  return (
    <>
      <ReadingsField value={readings} onChange={setReadings} name="readings" />
      <label className={fieldClass}>
        {t('deadline')}
        <input
          type="datetime-local"
          required
          className={inputClass}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </label>
      <label className={fieldClass}>
        {t('note')}
        <Textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </label>
    </>
  )
}

function PrematchList({ result }: { result: Prematch }) {
  const t = useTranslations('supply')
  return (
    <ul aria-label={t('new.checked')} className="flex flex-col gap-1 text-sm">
      {result.items.map((answer) => (
        <li key={answer.ref}>
          <span className="font-mono">{answer.ref}</span> · {t(`new.prematch.${answer.status}`)}
          {answer.reason && t.has(`reason.${answer.reason}`)
            ? ` · ${t(`reason.${answer.reason}`)}`
            : ''}
          {answer.eta_seconds
            ? ` · ${t('new.eta', { minutes: Math.ceil(answer.eta_seconds / 60) })}`
            : ''}
        </li>
      ))}
    </ul>
  )
}

function useSubmission(csrfToken: string) {
  const submit = useSubmitDemand(csrfToken)
  const [key, setKey] = useState(newIdempotencyKey)
  return {
    submit,
    key,
    send: (body: DemandInput) =>
      submit.mutate(body, { onSuccess: () => setKey(newIdempotencyKey()) }),
  }
}

function Result({ submission }: { submission: ReturnType<typeof useSubmission> }) {
  const t = useTranslations('supply.new')
  const errorText = useErrorText()
  const { submit } = submission
  if (submit.isError) return <p role="alert">{errorText(submit.error)}</p>
  if (!submit.isSuccess) return null
  const { demand, already_ready: ready } = submit.data
  return (
    <div role="status" className="flex flex-col gap-1 text-sm">
      {demand ? (
        <p>
          {t('submitted')}{' '}
          <Link href="/supply/demands" className="underline">
            →
          </Link>
        </p>
      ) : (
        <p>{t('allReady')}</p>
      )}
      {demand && ready.length ? <p>{t('alreadyReady', { count: ready.length })}</p> : null}
    </div>
  )
}

function DescriptionForm({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('supply.new')
  const options = useOptions()
  const submission = useSubmission(csrfToken)
  const prematch = usePrematch(csrfToken)
  const [subjectText, setSubjectText] = useState('')
  const [lookup, setLookup] = useState('')
  const securities = useSecurities(lookup)
  const [docType, setDocType] = useState('annual_report')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [readings, setReadings] = useState<Reading[]>(['original', 'pages'])
  const [deadline, setDeadline] = useState(() => defaultDeadlineLocal(new Date()))
  const [note, setNote] = useState('')
  const { subjects, bad } = parseSubjects(subjectText)
  const body = () =>
    describeDemand({
      subjects,
      docType,
      periodStart,
      periodEnd,
      readings,
      deadline: deadlineIso(deadline) ?? '',
      note,
      idempotencyKey: submission.key,
    })

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!subjects.length || bad.length || !readings.length) return
        submission.send(body())
      }}
    >
      <label className={fieldClass}>
        {t('lookup')}
        <input
          className={inputClass}
          value={lookup}
          placeholder={t('lookupHint')}
          onChange={(e) => setLookup(e.target.value)}
        />
      </label>
      {securities.data?.length ? (
        <ul className="flex flex-wrap gap-2 text-sm">
          {securities.data.map((s) => (
            <li key={s.subject}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubjectText((text) => `${text.trim()}\n${s.subject}`.trim())}
              >
                {s.name} {s.subject}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <label className={fieldClass}>
        {t('subjects')}
        <Textarea
          value={subjectText}
          placeholder={t('subjectsHint')}
          onChange={(e) => setSubjectText(e.target.value)}
        />
      </label>
      {bad.length ? <p role="alert">{t('badSubjects', { list: bad.join(', ') })}</p> : null}
      <label className={fieldClass} htmlFor="supply-doc-type">
        {t('docType')}
        <DocTypeSelect
          id="supply-doc-type"
          options={options.data}
          value={docType}
          onChange={setDocType}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={fieldClass}>
          {t('periodStart')}
          <input
            type="date"
            className={inputClass}
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
        </label>
        <label className={fieldClass}>
          {t('periodEnd')}
          <input
            type="date"
            className={inputClass}
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </label>
      </div>
      <p className="text-muted-foreground text-xs">{t('periodHint')}</p>
      <CommonFields {...{ readings, setReadings, deadline, setDeadline, note, setNote }} />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!subjects.length || prematch.isPending}
          onClick={() =>
            prematch.mutate(
              body().items.map((item, n) => ({ ref: `c${n + 1}`, key: item.key, readings })),
            )
          }
        >
          {t('check')}
        </Button>
        <Button type="submit" disabled={submission.submit.isPending || !subjects.length}>
          {t('submit')}
        </Button>
      </div>
      {prematch.data ? <PrematchList result={prematch.data} /> : null}
      <Result submission={submission} />
    </form>
  )
}

function UrlForm({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('supply.new')
  const options = useOptions()
  const submission = useSubmission(csrfToken)
  const prematch = usePrematch(csrfToken)
  const [urlText, setUrlText] = useState('')
  const [followLinks, setFollowLinks] = useState(false)
  const [title, setTitle] = useState('')
  const [publicPage, setPublicPage] = useState(false)
  const [readings, setReadings] = useState<Reading[]>(['original', 'text'])
  const [deadline, setDeadline] = useState(() => defaultDeadlineLocal(new Date()))
  const [note, setNote] = useState('')
  const { urls, bad } = parseUrls(urlText)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!urls.length || bad.length || !publicPage || !readings.length) return
        submission.send(
          urlDemand({
            urls,
            followLinks,
            title,
            readings,
            deadline: deadlineIso(deadline) ?? '',
            note,
            idempotencyKey: submission.key,
          }),
        )
      }}
    >
      <label className={fieldClass}>
        {t('urls')}
        <Textarea
          value={urlText}
          placeholder={t('urlsHint')}
          onChange={(e) => setUrlText(e.target.value)}
        />
      </label>
      {bad.length ? <p role="alert">{t('badUrls', { list: bad.join(', ') })}</p> : null}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={followLinks}
          onChange={(e) => setFollowLinks(e.target.checked)}
        />
        {t('followLinks', { max: options.data?.max_linked ?? 20 })}
      </label>
      <label className={fieldClass}>
        {t('title')}
        <input
          className={inputClass}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          required
          checked={publicPage}
          onChange={(e) => setPublicPage(e.target.checked)}
        />
        {t('publicPage')}
      </label>
      <CommonFields {...{ readings, setReadings, deadline, setDeadline, note, setNote }} />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!urls.length || prematch.isPending}
          onClick={() =>
            prematch.mutate(urls.map((url, n) => ({ ref: `c${n + 1}`, url, readings })))
          }
        >
          {t('check')}
        </Button>
        <Button type="submit" disabled={submission.submit.isPending || !urls.length || !publicPage}>
          {t('submit')}
        </Button>
      </div>
      {prematch.data ? <PrematchList result={prematch.data} /> : null}
      <Result submission={submission} />
    </form>
  )
}

function TopicForm({ csrfToken }: { csrfToken: string }) {
  const t = useTranslations('supply.topic')
  const errorText = useErrorText()
  const start = useStartSearch(csrfToken)
  const [topic, setTopic] = useState('')
  const [sites, setSites] = useState('')
  const [wanted, setWanted] = useState(20)
  const search = useSearch(start.data?.search_id ?? null)

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!topic.trim()) return
          start.mutate({
            topic: topic.trim(),
            sites: sites
              .split(/\s+/)
              .map((s) => s.trim())
              .filter(Boolean),
            wanted,
          })
        }}
      >
        <label className={fieldClass}>
          {t('topic')}
          <input
            className={inputClass}
            value={topic}
            maxLength={200}
            placeholder={t('topicHint')}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <label className={fieldClass}>
          {t('sites')}
          <Textarea
            value={sites}
            placeholder={t('sitesHint')}
            onChange={(e) => setSites(e.target.value)}
          />
        </label>
        <label className={fieldClass}>
          {t('wanted')}
          <input
            type="number"
            min={1}
            max={50}
            className={inputClass}
            value={wanted}
            onChange={(e) => setWanted(Number(e.target.value) || 1)}
          />
        </label>
        <Button type="submit" disabled={start.isPending || !topic.trim()}>
          {t('start')}
        </Button>
        {start.isError ? <p role="alert">{errorText(start.error)}</p> : null}
      </form>
      {search.data ? <CandidatePicker search={search.data} csrfToken={csrfToken} /> : null}
    </div>
  )
}
