'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import type { Reading, Search } from '@/contracts/supply'

import { usePick } from '../api/supply'
import { deadlineIso, defaultDeadlineLocal, newIdempotencyKey } from '../model/supply'
import { useErrorText } from './error-text'
import { fieldClass, inputClass, ReadingsField } from './fields'

// 按主题找的候选（0045 第四节）：按搜索给的原始顺序列，每条标网站审没审过、许可哪一档；
// 勾了再确认、再去取。候选 7 天内有效
export function CandidatePicker({ search, csrfToken }: { search: Search; csrfToken: string }) {
  const t = useTranslations('supply')
  const format = useFormatter()
  const errorText = useErrorText()
  const pick = usePick(csrfToken)
  const [chosen, setChosen] = useState<string[]>([])
  const [readings, setReadings] = useState<Reading[]>(['original', 'text'])
  const [deadline, setDeadline] = useState(() => defaultDeadlineLocal(new Date()))
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)

  if (search.status === 'searching') return <p role="status">{t('topic.searching')}</p>
  if (search.note === 'no_search_channel') return <p role="status">{t('topic.noChannel')}</p>
  if (search.candidates.length === 0) return <p role="status">{t('topic.none')}</p>
  const ready = search.status === 'ready'

  return (
    <div className="flex flex-col gap-3">
      {search.expires_at && ready ? (
        <p className="text-muted-foreground text-xs">
          {t('topic.expiresAt', {
            at: format.dateTime(new Date(search.expires_at), { dateStyle: 'medium' }),
          })}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {search.candidates.map((c) => (
          <li key={c.ref} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              aria-label={c.title}
              disabled={!ready}
              checked={chosen.includes(c.ref)}
              onChange={(e) => {
                setChosen(e.target.checked ? [...chosen, c.ref] : chosen.filter((r) => r !== c.ref))
                setIdempotencyKey(newIdempotencyKey())
              }}
            />
            <span className="flex flex-col">
              <a href={c.url} target="_blank" rel="noreferrer" className="underline">
                {c.title}
              </a>
              <span className="text-muted-foreground text-xs">
                {t(`topic.site.${c.site}`)}
                {c.license ? ` · ${t(`topic.license.${c.license}`)}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {ready ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const at = deadlineIso(deadline)
            if (!at || chosen.length === 0 || readings.length === 0) return
            pick.mutate(
              {
                searchId: search.search_id,
                refs: chosen,
                readings,
                followLinks: false,
                deadline: at,
                idempotencyKey,
              },
              { onSuccess: () => setIdempotencyKey(newIdempotencyKey()) },
            )
          }}
        >
          <ReadingsField value={readings} onChange={setReadings} name="pick-readings" />
          <label className={fieldClass}>
            {t('new.deadline')}
            <input
              type="datetime-local"
              className={inputClass}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={pick.isPending || chosen.length === 0}>
            {t('topic.pick')}
          </Button>
          {pick.isSuccess ? (
            <p role="status">{t('topic.picked', { count: pick.data.items.length })}</p>
          ) : null}
          {pick.isError ? <p role="alert">{errorText(pick.error)}</p> : null}
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">{t('topic.ended')}</p>
      )}
    </div>
  )
}
