import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MyDemandsPanel, NewDemandPanel, SubscriptionsPanel } from '@/features/supply'
import messages from '@/messages/zh-CN.json'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const CSRF = 'csrf-token-0123456789-0123456789-abcd'
const options = {
  doc_types: { annual_report: 'disclosure', interim_announcement: 'disclosure', law: 'policy' },
  periodic: ['annual_report'],
  topics: [],
  editions: ['full'],
  org_doc_types: ['law'],
  max_linked: 20,
  max_targets: 50,
  max_urls: 20,
  max_candidates: 50,
  max_every_hours: 720,
  max_monthly_cap: 1000,
}
const item = {
  item_id: 'i-1',
  confirmation_item: 'c1',
  key: {
    subject: '600519.SH',
    doc_type: 'annual_report',
    period_start: '2025-01-01',
    period_end: '2025-12-31',
  },
  url: null,
  follow_links: false,
  readings: ['original'],
  status: 'fetching',
  reason: null,
  receipt: {},
  retry_of: null,
  updated_at: '2026-10-29T12:00:00Z',
}
const demand = {
  demand_id: 'd-1',
  app: 'knowfeed',
  proposer: 'user',
  status: 'fetching',
  created_at: '2026-10-29T12:00:00Z',
  deadline: '2026-11-05T12:00:00Z',
  note: '做估值用',
  items: [
    item,
    {
      ...item,
      item_id: 'i-2',
      confirmation_item: 'c2',
      key: null,
      url: 'https://www.stats.gov.cn/a.html',
      status: 'unsatisfiable',
      reason: 'site_review_expired',
    },
  ],
}

type Call = { url: string; method: string; body: unknown; csrf: string | null }
let calls: Call[] = []

function serve(routes: Record<string, (call: Call) => Response>) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const headers = (init.headers ?? {}) as Record<string, string>
      const call = {
        url: String(input),
        method: init.method ?? 'GET',
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        csrf: headers['X-CSRF-Token'] ?? null,
      }
      calls.push(call)
      const route = routes[`${call.method} ${call.url.split('?')[0]}`]
      return route ? route(call) : new Response('{}', { status: 404 })
    }),
  )
}
afterEach(() => vi.unstubAllGlobals())

function show(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider
      locale="zh-CN"
      messages={messages}
      timeZone="Asia/Shanghai"
      now={new Date('2026-10-29T12:00:00Z')}
    >
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

describe('提需求', () => {
  it('按描述提交：带上本人会话的 CSRF、读法、最晚时间与幂等钥匙', async () => {
    serve({
      'GET /api/web/v1/supply/options': () => Response.json(options),
      'POST /api/web/v1/supply/demands': () =>
        Response.json({ demand, replayed: false, already_ready: ['c3'] }, { status: 201 }),
    })
    show(<NewDemandPanel csrfToken={CSRF} />)
    fireEvent.change(screen.getByLabelText('主体'), { target: { value: '600519.SH' } })
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await screen.findByText('已提交，进度在「我的需求」看。')
    const post = calls.find((c) => c.method === 'POST')
    expect(post).toMatchObject({ url: '/api/web/v1/supply/demands', csrf: CSRF })
    const body = post?.body as Record<string, unknown>
    expect(body.kind).toBe('description')
    expect(body.readings).toEqual(['original', 'pages'])
    expect(String(body.idempotency_key)).toMatch(/^web-/)
    expect(body.deadline).toBeTruthy()
    expect(screen.getByText('1 项你在 knowbase 已经有了，不必再取。')).toBeInTheDocument()
  })

  it('给网址要先确认是公开页面；knowbase 不让记确认时照实说', async () => {
    serve({
      'GET /api/web/v1/supply/options': () => Response.json(options),
      'POST /api/web/v1/supply/demands': () =>
        Response.json({ code: 'user_token_app_denied' }, { status: 403 }),
    })
    show(<NewDemandPanel csrfToken={CSRF} />)
    fireEvent.click(screen.getByRole('tab', { name: '给网址' }))
    fireEvent.change(screen.getByLabelText('网址'), {
      target: { value: 'https://www.stats.gov.cn/a.html' },
    })
    const submit = screen.getByRole('button', { name: '提交' })
    expect(submit).toBeDisabled()
    fireEvent.click(screen.getByLabelText('我确认这些是公开页面、不用登录'))
    fireEvent.click(submit)
    expect(
      await screen.findByText('knowbase 还没开放 knowfeed 替你记确认，这一步暂时做不了。'),
    ).toBeInTheDocument()
    const sent = calls.find((c) => c.method === 'POST')?.body as {
      kind: string
      items: Array<Record<string, unknown>>
    }
    expect(sent.kind).toBe('url')
    // 公开页面的声明随需求项交，后端照记（0045 第 2.2 节）
    expect(sent.items[0]).toMatchObject({ declared_public: true, follow_links: false })
  })
})

describe('我的需求', () => {
  it('列出各项的状态与原因，能取消、能再试一次', async () => {
    serve({
      'GET /api/web/v1/supply/demands': () => Response.json([demand]),
      'POST /api/web/v1/supply/demands/d-1/cancel': () =>
        Response.json({ ...demand, status: 'cancelled' }),
      'POST /api/web/v1/supply/items/i-2/retry': () =>
        Response.json({ demand, replayed: false, already_ready: [] }, { status: 201 }),
    })
    show(<MyDemandsPanel csrfToken={CSRF} />)
    const list = await screen.findByRole('list', { name: '我的需求' })
    expect(within(list).getByText('网站审核超过时限没人审')).toBeInTheDocument()
    expect(within(list).getByText('做估值用')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '再试一次' }))
    await screen.findByText('已再试一次，新的一项在列表里。')
    fireEvent.click(screen.getByRole('button', { name: '取消这张单' }))
    await vi.waitFor(() =>
      expect(calls.some((c) => c.url === '/api/web/v1/supply/demands/d-1/cancel')).toBe(true),
    )
    expect(calls.find((c) => c.url.endsWith('/retry'))?.csrf).toBe(CSRF)
  })
})

describe('订阅', () => {
  const sub = {
    subscription_id: 's-1',
    revision: 1,
    by: 'description',
    subjects: ['600519.SH'],
    doc_types: ['interim_announcement'],
    urls: [],
    topic: null,
    readings: ['original'],
    starts_on: '2026-10-29',
    ends_on: '2026-11-10',
    every_hours: 24,
    monthly_cap: 50,
    purpose: '跟踪公告',
    status: 'active',
    status_reason: null,
    skip_backlog: false,
    renew_due: true,
    last_checked_at: null,
    next_check_at: null,
    created_at: '2026-10-29T12:00:00Z',
  }

  it('建订阅、提醒续订、暂停', async () => {
    serve({
      'GET /api/web/v1/supply/options': () => Response.json(options),
      'GET /api/web/v1/supply/subscriptions': () => Response.json([sub]),
      'GET /api/web/v1/supply/searches': () => Response.json([]),
      'POST /api/web/v1/supply/subscriptions': () => Response.json(sub, { status: 201 }),
      'POST /api/web/v1/supply/subscriptions/s-1/pause': () =>
        Response.json({ ...sub, status: 'paused' }),
    })
    show(<SubscriptionsPanel csrfToken={CSRF} />)
    expect(await screen.findByText('快到期了，要续就续订。')).toBeInTheDocument()
    const form = screen.getByRole('form', { name: '建订阅' })
    fireEvent.change(within(form).getByLabelText('主体'), { target: { value: '600519.SH' } })
    fireEvent.change(within(form).getByLabelText('用途'), { target: { value: '跟踪公告' } })
    fireEvent.click(within(form).getByRole('button', { name: '建订阅' }))
    await vi.waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toMatchObject({
        url: '/api/web/v1/supply/subscriptions',
        csrf: CSRF,
      }),
    )
    const body = calls.find((c) => c.method === 'POST')?.body as Record<string, unknown>
    expect(body).toMatchObject({
      by: 'description',
      subjects: ['600519.SH'],
      doc_types: ['interim_announcement'],
      every_hours: 24,
    })
    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    await vi.waitFor(() => expect(calls.some((c) => c.url.endsWith('/s-1/pause'))).toBe(true))
  })
})
