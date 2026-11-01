// web端供给接口的契约（SDD 0045 第一、二节）。字段以 knowfeed-backend
// `app/interfaces/http/web/supply.py` 为真源。
import { z } from 'zod'

const when = z.string()

export const optionsSchema = z
  .object({
    doc_types: z.record(z.string(), z.string()),
    periodic: z.array(z.string()),
    topics: z.array(z.string()),
    editions: z.array(z.string()),
    org_doc_types: z.array(z.string()),
    max_linked: z.number().int(),
    max_targets: z.number().int(),
    max_urls: z.number().int(),
    max_candidates: z.number().int(),
    max_every_hours: z.number().int(),
    max_monthly_cap: z.number().int(),
  })
  .loose()
export type SupplyOptions = z.infer<typeof optionsSchema>

export const securitySchema = z.object({ subject: z.string(), name: z.string() }).loose()
export const securitiesSchema = z.array(securitySchema)

export const itemSchema = z
  .object({
    item_id: z.string(),
    confirmation_item: z.string(),
    key: z.record(z.string(), z.unknown()).nullable(),
    url: z.string().nullable(),
    follow_links: z.boolean(),
    // 用户声明的「公开页面、不用登录」（给网址的那一项）
    declared_public: z.boolean().optional(),
    readings: z.array(z.string()),
    status: z.string(),
    reason: z.string().nullable(),
    receipt: z.record(z.string(), z.unknown()),
    retry_of: z.string().nullable(),
    updated_at: when,
  })
  .loose()
export type DemandItem = z.infer<typeof itemSchema>

export const demandSchema = z
  .object({
    demand_id: z.string(),
    app: z.string(),
    proposer: z.string(),
    status: z.string(),
    created_at: when,
    deadline: when.nullable(),
    note: z.string().nullable(),
    items: z.array(itemSchema),
  })
  .loose()
export type Demand = z.infer<typeof demandSchema>
export const demandsSchema = z.array(demandSchema)

export const submitSchema = z
  .object({
    demand: demandSchema.nullable(),
    replayed: z.boolean(),
    already_ready: z.array(z.string()),
  })
  .loose()
export type SubmitResult = z.infer<typeof submitSchema>

export const prematchSchema = z
  .object({
    contract: z.string(),
    items: z.array(
      z
        .object({
          ref: z.string(),
          status: z.string(),
          reason: z.string().nullable().optional(),
          license: z.string().nullable().optional(),
          eta_seconds: z.number().nullable().optional(),
        })
        .loose(),
    ),
  })
  .loose()
export type Prematch = z.infer<typeof prematchSchema>

export const subscriptionSchema = z
  .object({
    subscription_id: z.string(),
    revision: z.number().int(),
    by: z.enum(['description', 'url', 'topic']),
    subjects: z.array(z.string()),
    doc_types: z.array(z.string()),
    urls: z.array(z.string()),
    topic: z.string().nullable(),
    readings: z.array(z.string()),
    starts_on: z.string(),
    ends_on: z.string(),
    every_hours: z.number().int(),
    monthly_cap: z.number().int(),
    purpose: z.string(),
    // 生效中、暂停、已到期、已取消、被停用（0045 第 2.5 节）
    status: z.enum(['active', 'paused', 'expired', 'cancelled', 'disabled']),
    status_reason: z.string().nullable(),
    skip_backlog: z.boolean(),
    renew_due: z.boolean(),
    last_checked_at: when.nullable(),
    next_check_at: when.nullable(),
    created_at: when,
  })
  .loose()
export type Subscription = z.infer<typeof subscriptionSchema>
export const subscriptionsSchema = z.array(subscriptionSchema)

export const roundSchema = z
  .object({
    started_at: when,
    finished_at: when.nullable(),
    found: z.number().int(),
    taken: z.number().int(),
    over_cap: z.number().int(),
    demand_id: z.string().nullable(),
    note: z.string().nullable(),
  })
  .loose()
export type Round = z.infer<typeof roundSchema>

export const subscriptionDetailSchema = z
  .object({ subscription: subscriptionSchema, rounds: z.array(roundSchema) })
  .loose()

export const candidateSchema = z
  .object({
    ref: z.string(),
    title: z.string(),
    url: z.string(),
    snippet: z.string(),
    date: z.string().nullable(),
    channel_id: z.string(),
    site: z.string(),
    license: z.string().nullable(),
  })
  .loose()
export type Candidate = z.infer<typeof candidateSchema>

export const searchSchema = z
  .object({
    search_id: z.string(),
    topic: z.string(),
    sites: z.array(z.string()),
    wanted: z.number().int(),
    // 正在找、候选已出（7 天）、已结束
    status: z.enum(['searching', 'ready', 'ended']),
    note: z.string().nullable(),
    subscription_id: z.string().nullable(),
    created_at: when,
    expires_at: when.nullable(),
    candidates: z.array(candidateSchema),
  })
  .loose()
export type Search = z.infer<typeof searchSchema>
export const searchesSchema = z.array(searchSchema)

export type Reading = 'original' | 'text' | 'pages' | 'table'

export type DescriptionKeyInput = {
  subject: string
  doc_type: string
  period_start?: string | null
  period_end?: string | null
}

export type DemandInput = {
  kind: 'description' | 'url'
  items: Array<{
    key?: DescriptionKeyInput
    url?: string
    follow_links?: boolean
    declared_public?: boolean
    prefill?: { title?: string; doc_type?: string; subject?: string }
  }>
  readings: Reading[]
  deadline: string
  note?: string | null
  idempotency_key: string
}

export type SubscriptionInput = {
  by: 'description' | 'url' | 'topic'
  subjects: string[]
  doc_types: string[]
  urls: string[]
  topic: string | null
  readings: Reading[]
  ends_on: string
  every_hours: number
  monthly_cap: number
  purpose: string
  skip_backlog: boolean
  idempotency_key?: string
}
