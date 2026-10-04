'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  availabilitySchema,
  securityRequestSchema,
  securityRequestsSchema,
} from '@/contracts/security-requests'
import { useInfo } from '@/lib/info/context'
import { getJson, postJson, seg } from '@/lib/info/http'

import { isFinal, REFRESH_MS, refreshEvery } from '../model/requests'

const base = '/api/web/v1'
const mineKey = ['info', 'requests'] as const

// 这家公司现在是什么情况：有没有数据、有没有人在申请、我能不能提
export function useAvailability(code: string) {
  return useQuery({
    queryKey: ['info', 'availability', code],
    queryFn: () => getJson(availabilitySchema, `${base}/securities/${seg(code)}/availability`),
    enabled: code !== '',
    retry: false,
  })
}

// 我的申请。有没走完的，就每 15 秒刷新一次
export function useMyRequests() {
  return useQuery({
    queryKey: mineKey,
    queryFn: () => getJson(securityRequestsSchema, `${base}/security-requests`),
    refetchInterval: (query) => refreshEvery(query.state.data),
  })
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: [...mineKey, id],
    queryFn: () => getJson(securityRequestSchema, `${base}/security-requests/${seg(id)}`),
    refetchInterval: (query) =>
      query.state.data && !isFinal(query.state.data.progress) ? REFRESH_MS : false,
  })
}

export function useRequestActions() {
  const { csrfToken } = useInfo()
  const client = useQueryClient()
  const changed = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: mineKey }),
      client.invalidateQueries({ queryKey: ['info', 'availability'] }),
    ])
  return {
    // 提出申请，或加入已有的申请。重复提交拿回原来那一个
    submit: useMutation({
      mutationFn: (input: {
        code: string
        reason: string
        // 从别的应用带过来的。不可信：后端逐个校验，不合规则的当作没带
        from: string | null
        ref: string | null
      }) =>
        postJson(securityRequestSchema, `${base}/security-requests`, {
          csrfToken,
          body: {
            security_code: input.code,
            ...(input.reason.trim() ? { reason: input.reason.trim() } : {}),
            ...(input.from ? { from: input.from } : {}),
            ...(input.ref ? { ref: input.ref } : {}),
          },
        }),
      onSuccess: changed,
    }),
    withdraw: useMutation({
      mutationFn: (id: string) =>
        postJson(securityRequestSchema, `${base}/security-requests/${seg(id)}/withdrawal`, {
          csrfToken,
        }),
      onSuccess: changed,
    }),
  }
}
