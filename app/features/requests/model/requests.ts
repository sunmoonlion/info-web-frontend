// 采集申请的几条规则。纯函数。
import type { Availability, Progress, SecurityRequest } from '@/contracts/security-requests'

// ---------------- 证券代码 ----------------
// 六位数字。是不是沪深京 A 股由后端认：这里只挡明显不对的，不重复一份后端的规则
export function cleanCode(text: string | null | undefined): string {
  const code = (text ?? '').trim()
  return /^\d{6}$/.test(code) ? code : ''
}

export function looksLikeCode(text: string): boolean {
  return /^\d{6}$/.test(text.trim())
}

// ---------------- 进度 ----------------
// 进度线上的五站。批准之后的几站是后端从采集的状态推出来的
export const STATIONS = ['submitted', 'approved', 'collecting', 'building', 'available'] as const
export type Station = (typeof STATIONS)[number]

const AT: Record<Progress, number> = {
  pending: 0,
  rejected: 0,
  withdrawn: 0,
  queued: 1,
  collecting: 2,
  failed: 2,
  building: 3,
  registering: 3, // 建好了，正在交给查询服务：还在「建库中」这一站
  quality_failed: 3,
  registration_failed: 3,
  available: 4,
}

const FINAL = new Set<Progress>([
  'rejected',
  'withdrawn',
  'available',
  'quality_failed',
  'failed',
  'registration_failed',
])

export function isFinal(progress: Progress): boolean {
  return FINAL.has(progress)
}

export type StationState = 'done' | 'current' | 'stopped' | 'todo'

// 每一站是做完了、正在这里、停在这里、还没到
export function stations(progress: Progress): { station: Station; state: StationState }[] {
  const at = AT[progress]
  const stopped = isFinal(progress) && progress !== 'available'
  return STATIONS.map((station, index) => ({
    station,
    state:
      progress === 'available' || index < at
        ? 'done'
        : index === at
          ? stopped
            ? 'stopped'
            : 'current'
          : 'todo',
  }))
}

// 没到「可用」就结束、而且不是用户自己撤回的：要让用户一眼看出来没成
export function wentWrong(progress: Progress): boolean {
  return isFinal(progress) && progress !== 'available' && progress !== 'withdrawn'
}

// 页面开着的时候每 15 秒自己刷新一次；都到终点了就不再刷新
export const REFRESH_MS = 15_000

export function refreshEvery(requests: readonly SecurityRequest[] | undefined): number | false {
  if (!requests) return false
  return requests.some((request) => !isFinal(request.progress)) ? REFRESH_MS : false
}

// ---------------- 申请页：查到的情况 ----------------
export type Situation =
  | { kind: 'mine'; request: SecurityRequest } // 我已经申请过，还在走
  | { kind: 'limit'; open: number; max: number } // 我未完成的申请到上限了
  | { kind: 'has_data' } // 已有数据：可以申请更新
  | { kind: 'join'; request: SecurityRequest; others: number } // 别人申请了，还在走：我也要
  | { kind: 'fresh' }

export function situationOf(found: Availability): Situation {
  if (found.open_request && found.mine) return { kind: 'mine', request: found.open_request }
  if (found.my_open_count >= found.max_open) {
    return { kind: 'limit', open: found.my_open_count, max: found.max_open }
  }
  if (found.open_request) {
    return { kind: 'join', request: found.open_request, others: found.open_request.requesters }
  }
  if (found.dataset) return { kind: 'has_data' }
  return { kind: 'fresh' }
}

// 提交钮上写什么。不能提交的情形没有钮
export function submitLabel(situation: Situation): 'submit' | 'join' | 'update' | null {
  if (situation.kind === 'fresh') return 'submit'
  if (situation.kind === 'join') return 'join'
  if (situation.kind === 'has_data') return 'update'
  return null
}

export const REASON_MAX = 500
