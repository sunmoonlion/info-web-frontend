import { defineDestinations } from '@/lib/cross-app/links'

// info 会把用户带去的页面，都登记在这里（PRD/apps/README.md 4.1）。
export const destinations = defineDestinations({
  // 申请变成「可用」之后，去 knowledge 看这个数据集
  'knowledge.dataset': { target: 'knowledge', segments: ['catalog', ':dataset'] },
  // 看看现在有哪些数据
  'knowledge.catalog': { target: 'knowledge', segments: ['catalog'] },
})

export type DestinationKey = keyof typeof destinations
