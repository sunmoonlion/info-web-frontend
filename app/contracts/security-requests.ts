// 采集申请的契约（用户面）。字段以 info-backend `interfaces/schemas/security_requests.py` 为真源。
// 这些写法由 `tests/unit/requests-contract-samples.test.ts` 对着预览样例（真后端录下来的返回）逐份检查。
import { z } from 'zod'

const uuid = z.uuid()

export const progressSchema = z.enum([
  'pending',
  'rejected',
  'withdrawn',
  'queued',
  'collecting',
  'building',
  'registering',
  'available',
  'quality_failed',
  'failed',
  'registration_failed',
])
export type Progress = z.infer<typeof progressSchema>

export const datasetSchema = z
  .object({
    dataset_id: z.string(),
    data_version: z.string(),
    start_date: z.string(),
    end_date: z.string(),
  })
  .loose()
export type Dataset = z.infer<typeof datasetSchema>

const originSchema = z
  .object({ app: z.string(), ref: z.string().nullable(), return_url: z.string().nullable() })
  .loose()

export const securityRequestSchema = z
  .object({
    id: uuid,
    security_code: z.string(),
    kind: z.string(),
    progress: progressSchema,
    created_at: z.string(),
    closed_at: z.string().nullable(),
    // 还有几个人也要（含自己）。看不到别人是谁
    requesters: z.number().int(),
    mine: z
      .object({
        reason: z.string().nullable(),
        origin: originSchema.nullable(),
        requested_at: z.string(),
        withdrawn: z.boolean(),
      })
      .loose()
      .nullable(),
    can_withdraw: z.boolean(),
    // 被拒绝时管理员写的原因。看不到是谁拒绝的
    rejection_note: z.string().nullable(),
    dataset: datasetSchema.nullable(),
  })
  .loose()
export type SecurityRequest = z.infer<typeof securityRequestSchema>

export const securityRequestsSchema = z.array(securityRequestSchema)

export const availabilitySchema = z
  .object({
    security_code: z.string(),
    market: z.string(),
    in_watchlist: z.boolean(),
    dataset: datasetSchema.nullable(),
    open_request: securityRequestSchema.nullable(),
    mine: z.boolean(),
    my_open_count: z.number().int(),
    max_open: z.number().int(),
    needs_approval: z.boolean(),
  })
  .loose()
export type Availability = z.infer<typeof availabilitySchema>

// 出错时：{ detail: { code, message } }
export const problemSchema = z
  .object({ detail: z.object({ code: z.string(), message: z.string().optional() }).loose() })
  .loose()
