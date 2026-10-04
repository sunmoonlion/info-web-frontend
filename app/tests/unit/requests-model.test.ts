import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  availabilitySchema,
  securityRequestSchema,
  securityRequestsSchema,
} from '@/contracts/security-requests'
import {
  cleanCode,
  isFinal,
  looksLikeCode,
  refreshEvery,
  situationOf,
  stations,
  submitLabel,
} from '@/features/requests/model/requests'
import { routes } from '@/lib/info/routes'

const fixtures = join(process.cwd(), 'preview/fixtures')
function responses(scenario: string) {
  const dir = join(fixtures, scenario)
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
    responses: { method: string; path: string; status: number; file: string }[]
  }
  return manifest.responses.map((each) => ({
    ...each,
    body: () => JSON.parse(readFileSync(join(dir, each.file), 'utf8')),
  }))
}

describe('契约认得样例里的每一份返回（样例是真后端录下来的）', () => {
  it.each(readdirSync(fixtures))('情景 %s', (scenario) => {
    let checked = 0
    for (const response of responses(scenario)) {
      if (response.status >= 400) continue
      const schema = response.path.endsWith('/availability')
        ? availabilitySchema
        : response.path.endsWith('/security-requests') && response.method === 'GET'
          ? securityRequestsSchema
          : response.path.includes('/security-requests')
            ? securityRequestSchema
            : null
      if (!schema) continue
      const parsed = schema.safeParse(response.body())
      expect(parsed.success ? null : `${response.path}: ${parsed.error.message}`).toBeNull()
      checked += 1
    }
    expect(checked).toBeGreaterThan(2)
  })
})

describe('证券代码', () => {
  it('六位数字才认；链接里带来不对的，当作没带', () => {
    expect(cleanCode('600585')).toBe('600585')
    expect(cleanCode(' 600585 ')).toBe('600585')
    expect(cleanCode('abc')).toBe('')
    expect(cleanCode('12345')).toBe('')
    expect(cleanCode(null)).toBe('')
    expect(looksLikeCode('60058')).toBe(false)
  })
  it('地址：from、ref 原样带着，没有的不带', () => {
    expect(routes.newRequest('zh-CN')).toBe('/zh-CN/requests/new')
    expect(routes.newRequest('zh-CN', { code: '600585', from: 'investment', ref: 'task:42' })).toBe(
      '/zh-CN/requests/new?code=600585&from=investment&ref=task%3A42',
    )
  })
})

describe('进度线', () => {
  const states = (progress: Parameters<typeof stations>[0]) =>
    stations(progress).map((each) => each.state)
  it('五站：已提交、已批准、采集中、建库中、可用', () => {
    expect(states('pending')).toEqual(['current', 'todo', 'todo', 'todo', 'todo'])
    expect(states('queued')).toEqual(['done', 'current', 'todo', 'todo', 'todo'])
    expect(states('collecting')).toEqual(['done', 'done', 'current', 'todo', 'todo'])
    expect(states('registering')).toEqual(['done', 'done', 'done', 'current', 'todo'])
    expect(states('available')).toEqual(['done', 'done', 'done', 'done', 'done'])
  })
  it('没到「可用」就结束的：停在那一站', () => {
    expect(states('rejected')).toEqual(['stopped', 'todo', 'todo', 'todo', 'todo'])
    expect(states('quality_failed')).toEqual(['done', 'done', 'done', 'stopped', 'todo'])
    expect(states('failed')).toEqual(['done', 'done', 'stopped', 'todo', 'todo'])
  })
  it('有没走完的才自己刷新', () => {
    const all = securityRequestsSchema.parse(
      responses('full')
        .find((each) => each.method === 'GET' && each.path.endsWith('/security-requests'))!
        .body(),
    )
    expect(refreshEvery(all)).toBe(15_000)
    expect(refreshEvery(all.filter((each) => isFinal(each.progress)))).toBe(false)
    expect(refreshEvery(undefined)).toBe(false)
  })
})

describe('申请页：查到的情况', () => {
  const found = (code: string) =>
    availabilitySchema.parse(
      responses('full')
        .find((each) => each.path.endsWith(`/securities/${code}/availability`))!
        .body(),
    )
  it('我已经申请过、还在走：不再提一次', () => {
    const situation = situationOf(found('601012'))
    expect(situation.kind).toBe('mine')
    expect(submitLabel(situation)).toBeNull()
  })
  it('我未完成的申请到上限了：不能提', () => {
    // 样例里这个人正好有五个没走完的
    expect(situationOf(found('600585'))).toEqual({ kind: 'limit', open: 5, max: 5 })
    expect(submitLabel(situationOf(found('002594')))).toBeNull()
  })
  it('没到上限时：没有数据就提交，已有数据就申请更新，别人在申请就「我也要」', () => {
    const room = { my_open_count: 1 }
    expect(submitLabel(situationOf({ ...found('600585'), ...room }))).toBe('submit')
    expect(submitLabel(situationOf({ ...found('002594'), ...room }))).toBe('update')
    const joining = situationOf({ ...found('601012'), ...room, mine: false })
    expect(joining.kind).toBe('join')
    expect(submitLabel(joining)).toBe('join')
  })
})
