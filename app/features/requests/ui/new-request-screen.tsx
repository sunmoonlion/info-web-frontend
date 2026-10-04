'use client'

import { ArrowUpRightIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { CrossAppLink } from '@/components/common/cross-app-link'
import { ReturnToOrigin } from '@/components/common/return-to-origin'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCrossAppOrigin } from '@/lib/cross-app/use-cross-app'
import { useInfo } from '@/lib/info/context'
import { InfoError } from '@/lib/info/http'
import { routes } from '@/lib/info/routes'
import { cn } from '@/lib/utils'

import { useAvailability, useRequestActions } from '../api/requests'
import { cleanCode, looksLikeCode, REASON_MAX, situationOf, submitLabel } from '../model/requests'
import { ProgressLine } from './progress-line'

const label = 'mb-1.5 block text-sm font-medium'
const hint = 'text-muted-foreground mt-1.5 text-[13px]'

// 申请入库。填了代码立刻说查到的情况：有没有数据、有没有人在申请、要不要等批准、还能不能提。
// 链接里带来的 code、from、ref 都不可信：code 不对就当没带；from、ref 交给后端认。
export function NewRequestScreen() {
  const t = useTranslations('requests.new')
  const tp = useTranslations('requests.progress')
  const router = useRouter()
  const { locale } = useInfo()
  const search = useSearchParams()
  const from = search.get('from')
  const ref = search.get('ref')
  const origin = useCrossAppOrigin()

  const [typed, setTyped] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const text = typed ?? cleanCode(search.get('code'))
  const code = cleanCode(text)
  const found = useAvailability(code)
  const { submit } = useRequestActions()

  const situation = found.data ? situationOf(found.data) : null
  const action = situation ? submitLabel(situation) : null
  const unknown = found.isError && (found.error as InfoError).code === 'security_code_invalid'
  const failed = submit.isError ? (submit.error as InfoError).code : null

  async function send() {
    if (!action || submit.isPending) return
    try {
      const made = await submit.mutateAsync({ code, reason, from, ref })
      router.push(routes.request(locale, made.id))
    } catch {
      // 原因显示在下面
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('lead')}</p>
        {origin.data ? (
          <p className="text-muted-foreground mt-2 text-[13px]">
            {t('from', { app: origin.data.app })}
          </p>
        ) : null}
      </header>

      <section>
        <label htmlFor="security-code" className={label}>
          {t('code')}
        </label>
        <Input
          id="security-code"
          inputMode="numeric"
          maxLength={6}
          value={text}
          onChange={(event) => setTyped(event.target.value)}
          aria-invalid={text !== '' && !looksLikeCode(text)}
          className="w-40 font-mono text-base tracking-widest"
        />
        <p className={hint}>{t('codeHint')}</p>
        {text.length === 6 && !looksLikeCode(text) ? (
          <p role="alert" className="text-destructive mt-1 text-[13px]">
            {t('codeInvalid')}
          </p>
        ) : null}
      </section>

      {code ? (
        <section aria-label={t('found')} className="rounded-xl border p-4 text-sm">
          <h2 className="text-muted-foreground mb-2 text-xs font-medium">{t('found')}</h2>
          {found.isPending ? (
            <p className="text-muted-foreground">{t('checking')}</p>
          ) : unknown ? (
            <p role="alert" className="text-destructive">
              {t('codeUnknown')}
            </p>
          ) : !found.data || !situation ? (
            <p role="alert" className="text-destructive">
              {t('checkFailed')}
            </p>
          ) : (
            <div className="space-y-2">
              {found.data.dataset ? (
                <div>
                  <p className="font-medium">{t('hasData')}</p>
                  <p className="text-muted-foreground text-[13px]">
                    {t('dataLine', {
                      version: found.data.dataset.data_version.slice(-8),
                      end: found.data.dataset.end_date,
                    })}{' '}
                    <CrossAppLink
                      to="knowledge.dataset"
                      values={{ dataset: found.data.dataset.dataset_id }}
                      className="text-foreground inline-flex items-center gap-0.5 underline underline-offset-3"
                    >
                      {t('toDataset')}
                      <ArrowUpRightIcon className="size-3.5" />
                    </CrossAppLink>
                  </p>
                </div>
              ) : null}
              {situation.kind === 'mine' ? (
                <div className="space-y-2">
                  <p className="font-medium">{t('mine')}</p>
                  <ProgressLine progress={situation.request.progress} />
                  <p className="text-muted-foreground text-[13px]">
                    {tp(`now.${situation.request.progress}`)}{' '}
                    <Link
                      href={routes.request(locale, situation.request.id)}
                      className="text-foreground underline underline-offset-3"
                    >
                      {t('toMine')}
                    </Link>
                  </p>
                </div>
              ) : null}
              {situation.kind === 'join' ? (
                <div className="space-y-2">
                  <p className="font-medium">{t('join')}</p>
                  <ProgressLine progress={situation.request.progress} />
                  <p className="text-muted-foreground text-[13px]">
                    {tp(`now.${situation.request.progress}`)} ·{' '}
                    {t('others', { n: situation.others })}
                  </p>
                  <p className="text-muted-foreground text-[13px]">{t('joinHint')}</p>
                </div>
              ) : null}
              {situation.kind === 'limit' ? (
                <p role="alert" className="text-amber-700 dark:text-amber-400">
                  {t('limit', { open: situation.open, max: situation.max })}
                </p>
              ) : null}
              {situation.kind === 'fresh' ? <p>{t('fresh')}</p> : null}
              {situation.kind === 'has_data' ? (
                <p className="text-muted-foreground text-[13px]">{t('updateHint')}</p>
              ) : null}
              {situation.kind === 'fresh' || situation.kind === 'has_data' ? (
                <p className="text-muted-foreground text-[13px]">
                  {found.data.needs_approval ? t('needsApproval') : t('watch')} {t('wait')}
                </p>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {action ? (
        <section>
          <label htmlFor="request-reason" className={label}>
            {t('reason')}
          </label>
          <Textarea
            id="request-reason"
            rows={3}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className={hint}>{t('reasonHint', { max: REASON_MAX })}</p>
        </section>
      ) : null}

      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          {t.has(`problem.${failed}`) ? t(`problem.${failed}`) : t('problem.other')}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        {action ? (
          <Button disabled={submit.isPending} onClick={() => void send()}>
            {submit.isPending
              ? t('submitting')
              : action === 'join'
                ? t('join2')
                : action === 'update'
                  ? t('update')
                  : t('submit')}
          </Button>
        ) : null}
        <ReturnToOrigin className={cn(buttonVariants({ variant: 'outline' }))}>
          {t('back')}
        </ReturnToOrigin>
      </div>
    </div>
  )
}
