'use client'

import { CheckIcon, XIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { Progress } from '@/contracts/security-requests'
import { cn } from '@/lib/utils'

import { stations } from '../model/requests'

// 进度线：已提交 → 已批准 → 采集中 → 建库中 → 可用。没到「可用」就结束的，停在那一站。
export function ProgressLine({
  progress,
  compact = false,
}: {
  progress: Progress
  compact?: boolean
}) {
  const t = useTranslations('requests.progress')
  return (
    <ol className="flex items-center" aria-label={t(`now.${progress}`)}>
      {stations(progress).map(({ station, state }, index) => (
        <li key={station} className="flex items-center">
          {index > 0 ? (
            <span
              className={cn(
                'h-px',
                compact ? 'w-4' : 'w-8 sm:w-14',
                state === 'todo' ? 'bg-border' : 'bg-foreground',
              )}
            />
          ) : null}
          <span className="flex items-center gap-1.5">
            <span
              data-state={state}
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]',
                state === 'done' && 'border-foreground bg-foreground text-background',
                state === 'current' && 'border-foreground ring-foreground/20 ring-4',
                state === 'stopped' &&
                  (progress === 'withdrawn'
                    ? 'border-muted-foreground text-muted-foreground'
                    : 'border-destructive text-destructive'),
                state === 'todo' && 'text-muted-foreground',
              )}
            >
              {state === 'done' ? (
                <CheckIcon className="size-3" />
              ) : state === 'stopped' ? (
                <XIcon className="size-3" />
              ) : (
                index + 1
              )}
            </span>
            {compact ? null : (
              <span
                className={cn(
                  'text-[13px] whitespace-nowrap',
                  state === 'todo' && 'text-muted-foreground',
                  state === 'current' && 'font-medium',
                  state === 'stopped' &&
                    (progress === 'withdrawn' ? 'font-medium' : 'text-destructive font-medium'),
                )}
              >
                {t(station)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  )
}
