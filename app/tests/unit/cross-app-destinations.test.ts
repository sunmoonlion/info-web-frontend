import { describe, expect, it } from 'vitest'

import { destinations } from '@/lib/cross-app/destinations'
import { crossAppHref } from '@/lib/cross-app/links'

const links = {
  app: 'info',
  targets: { knowledge: { web_base_url: 'https://knowledge.example.test' } },
}

describe('where info takes people', () => {
  it('goes to the dataset page of knowledge', () => {
    expect(
      crossAppHref({
        links,
        destination: destinations['knowledge.dataset'],
        locale: 'zh-CN',
        values: { dataset: 'sh600276-financials' },
        ref: 'request:7f3a',
      }),
    ).toBe(
      'https://knowledge.example.test/zh-CN/catalog/sh600276-financials?from=info&ref=request%3A7f3a',
    )
  })

  it('goes to the catalog of knowledge', () => {
    expect(
      crossAppHref({ links, destination: destinations['knowledge.catalog'], locale: 'en' }),
    ).toBe('https://knowledge.example.test/en/catalog?from=info')
  })

  it('goes nowhere else', () => {
    expect(Object.keys(destinations).sort()).toEqual(['knowledge.catalog', 'knowledge.dataset'])
  })
})
