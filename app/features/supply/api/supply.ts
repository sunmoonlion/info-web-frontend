'use client'

// 提需求、我的需求、订阅、按主题找的取数与改动（knowfeed-backend `web/supply.py`）。
// 答复一律过 zod；改动带本人会话的 CSRF 令牌。
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'

import {
  demandSchema,
  demandsSchema,
  optionsSchema,
  prematchSchema,
  searchSchema,
  searchesSchema,
  securitiesSchema,
  submitSchema,
  subscriptionDetailSchema,
  subscriptionSchema,
  subscriptionsSchema,
  type DemandInput,
  type Reading,
  type SubscriptionInput,
} from '@/contracts/supply'
import { requestJson } from '@/lib/common/api-client'

const BASE = '/api/web/v1/supply'
const seg = (value: string) => encodeURIComponent(value)

export class SupplyContractError extends Error {
  constructor() {
    super('supply_contract_invalid')
    this.name = 'SupplyContractError'
  }
}

async function read<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: Parameters<typeof requestJson>[1],
) {
  const parsed = schema.safeParse(await requestJson<unknown>(path, init))
  if (!parsed.success) throw new SupplyContractError()
  return parsed.data
}

const keys = {
  options: ['web', 'supply', 'options'] as const,
  demands: ['web', 'supply', 'demands'] as const,
  subscriptions: ['web', 'supply', 'subscriptions'] as const,
  subscription: (id: string) => ['web', 'supply', 'subscription', id] as const,
  searches: ['web', 'supply', 'searches'] as const,
  search: (id: string) => ['web', 'supply', 'search', id] as const,
  securities: (q: string) => ['web', 'supply', 'securities', q] as const,
}

const OPEN = new Set(['accepted', 'fetching'])

export function useOptions() {
  return useQuery({
    queryKey: keys.options,
    queryFn: () => read(optionsSchema, `${BASE}/options`),
    staleTime: 10 * 60 * 1000,
  })
}

// 查主体：按名字或代码查证券
export function useSecurities(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: keys.securities(term),
    enabled: term.length >= 2,
    queryFn: () => read(securitiesSchema, `${BASE}/securities?q=${seg(term)}`),
  })
}

// 我的需求：还有没办完的，每 10 秒看一次
export function useDemands() {
  return useQuery({
    queryKey: keys.demands,
    queryFn: () => read(demandsSchema, `${BASE}/demands`),
    refetchInterval: (query) =>
      query.state.data?.some((d) => d.items.some((i) => OPEN.has(i.status))) ? 10_000 : false,
  })
}

export function useSubmitDemand(csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: DemandInput) =>
      read(submitSchema, `${BASE}/demands`, { method: 'POST', body, csrfToken }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.demands }),
  })
}

export function usePrematch(csrfToken: string) {
  return useMutation({
    mutationFn: (items: Array<Record<string, unknown>>) =>
      read(prematchSchema, `${BASE}/prematch`, {
        method: 'POST',
        body: { items },
        csrfToken,
      }),
  })
}

export function useCancelDemand(csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (demandId: string) =>
      read(demandSchema, `${BASE}/demands/${seg(demandId)}/cancel`, {
        method: 'POST',
        csrfToken,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.demands }),
  })
}

export function useRetryItem(csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { itemId: string; deadline: string; idempotencyKey: string }) =>
      read(submitSchema, `${BASE}/items/${seg(input.itemId)}/retry`, {
        method: 'POST',
        body: { deadline: input.deadline, idempotency_key: input.idempotencyKey },
        csrfToken,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.demands }),
  })
}

export function useSubscriptions() {
  return useQuery({
    queryKey: keys.subscriptions,
    queryFn: () => read(subscriptionsSchema, `${BASE}/subscriptions`),
  })
}

export function useSubscription(id: string | null) {
  return useQuery({
    queryKey: keys.subscription(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => read(subscriptionDetailSchema, `${BASE}/subscriptions/${seg(id ?? '')}`),
  })
}

export function useSubscribe(csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: SubscriptionInput) =>
      read(subscriptionSchema, `${BASE}/subscriptions`, { method: 'POST', body, csrfToken }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.subscriptions }),
  })
}

export type SubscriptionAction =
  | { id: string; action: 'pause' | 'resume' | 'cancel' }
  | { id: string; action: 'renew'; endsOn: string }
  | { id: string; action: 'backlog'; skip: boolean }

export function useSubscriptionAction(csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: SubscriptionAction) => {
      const path = `${BASE}/subscriptions/${seg(input.id)}`
      if (input.action === 'renew')
        return read(subscriptionSchema, `${path}/renew`, {
          method: 'POST',
          body: { ends_on: input.endsOn },
          csrfToken,
        })
      if (input.action === 'backlog')
        return read(subscriptionSchema, `${path}/backlog`, {
          method: 'PUT',
          body: { skip: input.skip },
          csrfToken,
        })
      return read(subscriptionSchema, `${path}/${input.action}`, { method: 'POST', csrfToken })
    },
    onSuccess: (_, input) => {
      void client.invalidateQueries({ queryKey: keys.subscriptions })
      void client.invalidateQueries({ queryKey: keys.subscription(input.id) })
    },
  })
}

export function useSearches() {
  return useQuery({
    queryKey: keys.searches,
    queryFn: () => read(searchesSchema, `${BASE}/searches`),
  })
}

// 搜在 worker 里跑：正在找时每 3 秒看一次
export function useSearch(id: string | null) {
  return useQuery({
    queryKey: keys.search(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => read(searchSchema, `${BASE}/searches/${seg(id ?? '')}`),
    refetchInterval: (query) => (query.state.data?.status === 'searching' ? 3000 : false),
  })
}

export function useStartSearch(csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { topic: string; sites: string[]; wanted: number }) =>
      read(searchSchema, `${BASE}/searches`, { method: 'POST', body, csrfToken }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.searches }),
  })
}

export function usePick(csrfToken: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      searchId: string
      refs: string[]
      readings: Reading[]
      followLinks: boolean
      deadline: string
      idempotencyKey: string
    }) =>
      read(demandSchema, `${BASE}/searches/${seg(input.searchId)}/pick`, {
        method: 'POST',
        body: {
          refs: input.refs,
          readings: input.readings,
          follow_links: input.followLinks,
          deadline: input.deadline,
          idempotency_key: input.idempotencyKey,
        },
        csrfToken,
      }),
    onSuccess: (_, input) => {
      void client.invalidateQueries({ queryKey: keys.demands })
      void client.invalidateQueries({ queryKey: keys.search(input.searchId) })
    },
  })
}
