'use client'

import { useTranslations } from 'next-intl'

import { ApiClientError } from '@/lib/common/api-client'

// 后端拒绝时的错误码换成人话；没有专门说法的用一句通用的
export function useErrorText() {
  const t = useTranslations('supply.errors')
  return (error: unknown) => {
    const code = error instanceof ApiClientError ? error.problem.code : null
    return code && t.has(code) ? t(code) : t('generic')
  }
}
