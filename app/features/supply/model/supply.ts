// 提需求表单的规矩（SDD 0045 第 2.2 节），与界面分开，单测直接测。

import type { DemandInput, Reading } from '@/contracts/supply'

export const READINGS: Reading[] = ['original', 'text', 'pages', 'table']
const SECURITY = /^\d{6}\.(SH|SZ|BJ)$/
const ORG = /^org:([0-9A-HJ-NPQRTUWXY]{18}|kb-[a-z0-9-]{3,48})$/

// 一次提交一个幂等钥匙：点两次「提交」回原来那张单
export function newIdempotencyKey(): string {
  const id =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `web-${id}`
}

// 主体：证券代码（含市场）或词表里的机构编号；一行一个或逗号隔开
export function parseSubjects(text: string): { subjects: string[]; bad: string[] } {
  const all = text
    .split(/[\s,，、]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const normal = (s: string) => (s.startsWith('org:') ? s : s.toUpperCase())
  const good = (s: string) => SECURITY.test(normal(s)) || ORG.test(s)
  return {
    subjects: [...new Set(all.filter(good).map(normal))],
    bad: all.filter((s) => !good(s)),
  }
}

export function parseUrls(text: string): { urls: string[]; bad: string[] } {
  const all = text
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const ok = (value: string) => {
    try {
      const url = new URL(value)
      return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
    } catch {
      return false
    }
  }
  return { urls: [...new Set(all.filter(ok))], bad: all.filter((u) => !ok(u)) }
}

// 「最晚什么时候要」：本地时间的输入框值（YYYY-MM-DDTHH:mm）换成带时区的时刻
export function deadlineIso(local: string): string | null {
  if (!local) return null
  const value = new Date(local)
  return Number.isNaN(value.getTime()) ? null : value.toISOString()
}

export function defaultDeadlineLocal(now: Date, days = 7): string {
  const at = new Date(now.getTime() + days * 86_400_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`
}

export function describeDemand(input: {
  subjects: string[]
  docType: string
  periodStart: string
  periodEnd: string
  readings: Reading[]
  deadline: string
  note: string
  idempotencyKey: string
}): DemandInput {
  return {
    kind: 'description',
    items: input.subjects.map((subject) => ({
      key: {
        subject,
        doc_type: input.docType,
        period_start: input.periodStart || null,
        period_end: input.periodEnd || null,
      },
    })),
    readings: input.readings,
    deadline: input.deadline,
    note: input.note.trim() || null,
    idempotency_key: input.idempotencyKey,
  }
}

export function urlDemand(input: {
  urls: string[]
  followLinks: boolean
  title: string
  readings: Reading[]
  deadline: string
  note: string
  idempotencyKey: string
}): DemandInput {
  return {
    kind: 'url',
    items: input.urls.map((url) => ({
      url,
      follow_links: input.followLinks,
      // 表单里勾了「我确认这些是公开页面、不用登录」才提交得了，记进需求项
      declared_public: true,
      prefill: input.title.trim() ? { title: input.title.trim() } : undefined,
    })),
    readings: input.readings,
    deadline: input.deadline,
    note: input.note.trim() || null,
    idempotency_key: input.idempotencyKey,
  }
}

const OPEN = new Set(['accepted', 'fetching', 'timeout'])
const RETRYABLE = new Set(['failed', 'timeout', 'unsatisfiable'])

export const canCancel = (statuses: string[]) => statuses.some((s) => OPEN.has(s))
export const canRetry = (status: string) => RETRYABLE.has(status)

// 回执里写了几份资料、还有几个链接没取
export function receiptSummary(receipt: Record<string, unknown>): {
  materials: number
  notTaken: number
} {
  const materials = Array.isArray(receipt.materials) ? receipt.materials.length : 0
  const notTaken = typeof receipt.not_taken === 'number' ? receipt.not_taken : 0
  return { materials, notTaken }
}

// 描述写成一行：主体 · 类型 · 期间
export function keyText(key: Record<string, unknown> | null): string {
  if (!key) return ''
  const period = [key.period_start, key.period_end].filter(Boolean).join(' ~ ')
  return [key.subject, key.doc_type, period].filter(Boolean).join(' · ')
}

export function addDays(day: Date, days: number): string {
  return new Date(day.getTime() + days * 86_400_000).toISOString().slice(0, 10)
}
