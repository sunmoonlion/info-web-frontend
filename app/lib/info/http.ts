// info 接口的收发。同源 /api/web/v1；浏览器会话 cookie；改动类的请求带 CSRF；答复一律过 zod。
import { z } from 'zod'

import { problemSchema } from '@/contracts/security-requests'

export class InfoError extends Error {
  constructor(
    public readonly code: string,
    public readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(code)
    this.name = 'InfoError'
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

type Fetch = typeof fetch

async function exchange<T>(
  schema: z.ZodType<T>,
  path: string,
  init: RequestInit,
  fetchImpl: Fetch,
) {
  if (!path.startsWith('/api/web/v1/')) throw new Error('info web path expected')
  let response: Response
  try {
    response = await fetchImpl(path, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'manual',
      headers: {
        Accept: 'application/json',
        'X-Correlation-Id': crypto.randomUUID(),
        ...init.headers,
      },
    })
  } catch (error) {
    throw new InfoError('backend_unavailable', undefined, { cause: error })
  }
  if (!response.ok || response.type === 'opaqueredirect') {
    const problem = problemSchema.safeParse(await response.json().catch(() => null))
    throw new InfoError(
      problem.success ? problem.data.detail.code : 'backend_unavailable',
      response.status,
    )
  }
  const parsed = schema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new InfoError('contract_invalid', response.status, { cause: parsed.error })
  }
  return parsed.data
}

export function getJson<T>(schema: z.ZodType<T>, path: string, fetchImpl: Fetch = fetch) {
  return exchange(schema, path, { method: 'GET' }, fetchImpl)
}

export function postJson<T>(
  schema: z.ZodType<T>,
  path: string,
  options: { csrfToken: string; body?: unknown },
  fetchImpl: Fetch = fetch,
) {
  return exchange(
    schema,
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': options.csrfToken },
      body: JSON.stringify(options.body ?? {}),
    },
    fetchImpl,
  )
}

export function seg(value: string) {
  return encodeURIComponent(value)
}
