import { describe, expect, it } from 'vitest'

import {
  canCancel,
  canRetry,
  deadlineIso,
  describeDemand,
  keyText,
  parseSubjects,
  parseUrls,
  receiptSummary,
  urlDemand,
} from '@/features/supply/model/supply'

describe('提需求表单的规矩', () => {
  it('主体认证券代码与机构编号，别的列出来', () => {
    expect(parseSubjects('600519.sh\norg:kb-stats-bureau，000858.SZ 600519.SH abc')).toEqual({
      subjects: ['600519.SH', 'org:kb-stats-bureau', '000858.SZ'],
      bad: ['abc'],
    })
  })

  it('网址只认 http(s)', () => {
    expect(parseUrls('https://www.stats.gov.cn/a.html ftp://x.cn/a not-a-url')).toEqual({
      urls: ['https://www.stats.gov.cn/a.html'],
      bad: ['ftp://x.cn/a', 'not-a-url'],
    })
  })

  it('按描述的需求每个主体一项，期间不写就是空', () => {
    const body = describeDemand({
      subjects: ['600519.SH', '000858.SZ'],
      docType: 'annual_report',
      periodStart: '2025-01-01',
      periodEnd: '',
      readings: ['original', 'pages'],
      deadline: '2026-11-05T00:00:00.000Z',
      note: '  ',
      idempotencyKey: 'web-1234567890',
    })
    expect(body.kind).toBe('description')
    expect(body.items[1].key).toEqual({
      subject: '000858.SZ',
      doc_type: 'annual_report',
      period_start: '2025-01-01',
      period_end: null,
    })
    expect(body.note).toBeNull()
  })

  it('给网址的需求带上连不连文件、预填的标题', () => {
    const body = urlDemand({
      urls: ['https://www.stats.gov.cn/a.html'],
      followLinks: true,
      title: '公报',
      readings: ['original'],
      deadline: '2026-11-05T00:00:00.000Z',
      note: '',
      idempotencyKey: 'web-1234567890',
    })
    expect(body.items[0]).toEqual({
      url: 'https://www.stats.gov.cn/a.html',
      follow_links: true,
      declared_public: true,
      prefill: { title: '公报' },
    })
  })

  it('最晚时间、取消、再试一次、回执', () => {
    expect(deadlineIso('')).toBeNull()
    expect(deadlineIso('2026-11-05T08:00')).toMatch(/^2026-11-0[45]T/)
    expect(canCancel(['ready', 'fetching'])).toBe(true)
    expect(canCancel(['ready', 'timeout'])).toBe(true)
    expect(canCancel(['ready', 'cancelled'])).toBe(false)
    expect(['failed', 'timeout', 'unsatisfiable'].every(canRetry)).toBe(true)
    expect(canRetry('cancelled')).toBe(false)
    expect(receiptSummary({ materials: [{}, {}], not_taken: 3 })).toEqual({
      materials: 2,
      notTaken: 3,
    })
    expect(
      keyText({ subject: '600519.SH', doc_type: 'annual_report', period_end: '2025-12-31' }),
    ).toBe('600519.SH · annual_report · 2025-12-31')
  })
})
