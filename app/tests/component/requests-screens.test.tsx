import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MyRequestsScreen, NewRequestScreen, RequestScreen } from '@/features/requests'
import { InfoProvider } from '@/lib/info/context'
import messages from '@/messages/zh-CN.json'

const push = vi.fn()
let search = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search,
  usePathname: () => '/zh-CN/requests',
}))

const fixtures = join(process.cwd(), 'preview/fixtures')
let scenario = 'full'
function manifestOf(name: string) {
  return JSON.parse(readFileSync(join(fixtures, name, 'manifest.json'), 'utf8')) as {
    pages: { title: string; path: string }[]
    responses: { method: string; path: string; status: number; file: string }[]
  }
}
const idOf = (title: string) =>
  manifestOf('full')
    .pages.find((page) => page.title === title)!
    .path.split('/')
    .pop()!

type Call = { method: string; path: string; body: Record<string, unknown>; csrf: string | null }
let calls: Call[] = []
let room = false // 让「没走完的申请」不到上限，好试提交

beforeEach(() => {
  calls = []
  scenario = 'full'
  room = false
  search = new URLSearchParams()
  push.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = String(input).split('?')[0]
      const method = init.method ?? 'GET'
      const headers = (init.headers ?? {}) as Record<string, string>
      if (path.startsWith('/api/web/v1/cross-app/origin')) {
        const from = new URL(String(input), 'http://x').searchParams.get('from')
        const body =
          from === 'investment'
            ? { app: 'investment', ref: null, return_url: 'http://localhost:3100/zh-CN/workbench' }
            : null
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (path.startsWith('/api/web/v1/cross-app/links')) {
        return new Response(
          JSON.stringify({
            app: 'info',
            targets: { knowledge: { web_base_url: 'https://knowledge.example.test' } },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      const found = manifestOf(scenario).responses.find(
        (each) => each.method === 'GET' && each.path === path,
      )
      if (method !== 'GET') {
        calls.push({
          method,
          path,
          body: JSON.parse(String(init.body ?? '{}')),
          csrf: headers['X-CSRF-Token'] ?? null,
        })
        // 答一个样例里的申请：形状是真的
        const one = manifestOf('full').responses.find(
          (each) => each.method === 'GET' && /security-requests\/[0-9a-f-]{36}$/.test(each.path),
        )!
        return new Response(readFileSync(join(fixtures, 'full', one.file), 'utf8'), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (!found)
        return new Response(JSON.stringify({ detail: { code: 'not_found' } }), { status: 404 })
      let body = JSON.parse(readFileSync(join(fixtures, scenario, found.file), 'utf8'))
      if (room && path.endsWith('/availability')) body = { ...body, my_open_count: 1 }
      return new Response(JSON.stringify(body), {
        status: found.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

function page(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <NextIntlClientProvider locale="zh-CN" messages={messages} timeZone="Asia/Shanghai">
      <QueryClientProvider client={client}>
        <InfoProvider csrfToken="csrf-for-test" locale="zh-CN">
          {children}
        </InfoProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  )
}

describe('申请入库', () => {
  it('什么都没带：代码栏是空的，没有提交钮', async () => {
    page(<NewRequestScreen />)
    expect(screen.getByRole('textbox', { name: '证券代码' })).toHaveValue('')
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
  })

  it('链接里 code=abc：页面照常打开，代码栏是空的（AT-INFO-11）', () => {
    search = new URLSearchParams('code=abc')
    page(<NewRequestScreen />)
    expect(screen.getByRole('textbox', { name: '证券代码' })).toHaveValue('')
  })

  it('从 investment 带着代码过来：填好了，写明从哪来，提交时把 from、ref 带给后端', async () => {
    room = true
    search = new URLSearchParams('code=600585&from=investment&ref=task:42')
    page(<NewRequestScreen />)
    expect(screen.getByRole('textbox', { name: '证券代码' })).toHaveValue('600585')
    expect(await screen.findByText('从 investment 来')).toBeInTheDocument()
    expect(await screen.findByText('还没有这家公司的数据，也没有人在申请。')).toBeInTheDocument()
    expect(
      screen.getByText(/提交之后要等管理员批准。.*批准之后通常 5 到 10 分钟。/),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: '申请理由' }), {
      target: { value: '要做水泥行业的对比' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/web/v1/security-requests',
      csrf: 'csrf-for-test',
      body: {
        security_code: '600585',
        reason: '要做水泥行业的对比',
        from: 'investment',
        ref: 'task:42',
      },
    })
    await waitFor(() => expect(push).toHaveBeenCalled())
    // 回到原处：地址是后端给的
    expect(screen.getByRole('link', { name: '回到原处' })).toHaveAttribute(
      'href',
      'http://localhost:3100/zh-CN/workbench',
    )
  })

  it('不认识的来处：不显示从哪来，没有「回到原处」（AT-INFO-12）', async () => {
    room = true
    search = new URLSearchParams('code=600585&from=somewhere')
    page(<NewRequestScreen />)
    await screen.findByText('还没有这家公司的数据，也没有人在申请。')
    expect(screen.queryByText(/从 .* 来/)).toBeNull()
    expect(screen.queryByRole('link', { name: '回到原处' })).toBeNull()
  })

  it('已有数据：显示数据版本与数据时点，按钮是「申请更新」（AT-INFO-09）', async () => {
    room = true
    search = new URLSearchParams('code=002594')
    page(<NewRequestScreen />)
    expect(await screen.findByText('已经有这家公司的数据。')).toBeInTheDocument()
    expect(screen.getByText(/数据到 2025-12-31/)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '去看这个数据集' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://knowledge.example.test/zh-CN/catalog/sz002594-financials'),
    )
    expect(screen.getByRole('button', { name: '申请更新' })).toBeInTheDocument()
  })

  it('我已经申请过：显示进度，不再提一次', async () => {
    search = new URLSearchParams('code=601012')
    page(<NewRequestScreen />)
    expect(await screen.findByText('你已经申请过这家公司，还在走。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '去看进度' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /提交|我也要|申请更新/ })).toBeNull()
  })

  it('没走完的申请到了 5 个：说明上限，不能提（AT-INFO-08）', async () => {
    search = new URLSearchParams('code=600585')
    page(<NewRequestScreen />)
    expect(await screen.findByText(/你没走完的申请已经有 5 个，上限是 5 个/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
  })

  it('代码不是 A 股：当场提示', async () => {
    search = new URLSearchParams('code=123456')
    page(<NewRequestScreen />)
    // 样例里没有这个代码的答复：按查不到处理，不给提交钮
    await waitFor(() =>
      expect(screen.getByRole('region', { name: '查到的情况' })).toHaveTextContent(
        /没有查到|不是沪深京/,
      ),
    )
    expect(screen.queryByRole('button', { name: '提交' })).toBeNull()
  })
})

describe('我的申请', () => {
  it('每个申请一行，带进度；没到「可用」就结束的写明白', async () => {
    page(<MyRequestsScreen />)
    const list = within(await screen.findByRole('list', { name: '我的申请' }))
    expect(list.getAllByRole('link')).toHaveLength(11)
    for (const words of [
      '等管理员批准',
      '可用了',
      '被拒绝了',
      '已撤回',
      '采到了，但没通过质量检查，没有发布',
    ]) {
      expect(list.getByText(words)).toBeInTheDocument()
    }
  })
  it('一个都没有', async () => {
    scenario = 'empty'
    page(<MyRequestsScreen />)
    expect(await screen.findByText('还没有申请。')).toBeInTheDocument()
  })
})

describe('一个申请', () => {
  it('等批准：能撤回；撤回带 CSRF', async () => {
    const id = idOf('一个申请：等批准')
    page(<RequestScreen id={id} />)
    expect(await screen.findByRole('status')).toHaveTextContent('等管理员批准')
    expect(screen.getByText(/连你在内，有 2 个人要/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '撤回' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: `/api/web/v1/security-requests/${id}/withdrawal`,
      csrf: 'csrf-for-test',
    })
    // 从 investment 来的：有一条回去的路，地址是后端给的
    expect(screen.getByRole('link', { name: '回到 investment' })).toHaveAttribute(
      'href',
      expect.stringContaining('http://localhost:3100/'),
    )
  })

  it('可用：数据版本、去看这个数据集；不能撤回', async () => {
    page(<RequestScreen id={idOf('一个申请：可用')} />)
    expect(await screen.findByRole('status')).toHaveTextContent('可用了')
    expect(screen.getByText(/数据版本 …/)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '去看这个数据集' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '撤回' })).toBeNull()
    expect(screen.getByRole('link', { name: '再申请一次' })).toBeInTheDocument()
  })

  it('被拒绝：看得到管理员写的原因，看不到是谁拒绝的（AT-INFO-04）', async () => {
    page(<RequestScreen id={idOf('一个申请：被拒绝')} />)
    expect(await screen.findByRole('status')).toHaveTextContent('被拒绝了')
    expect(screen.getByText('管理员的原因：')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/decided_by|actor/)
  })

  it('没通过质量检查：如实说（AT-INFO-10）', async () => {
    page(<RequestScreen id={idOf('一个申请：没通过质量检查')} />)
    expect(await screen.findByRole('status')).toHaveTextContent('没通过质量检查，没有发布')
    expect(screen.queryByRole('link', { name: '去看这个数据集' })).toBeNull()
  })
})
