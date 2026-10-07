'use client'

import { useTranslations } from 'next-intl'

import { LogoutButton } from '@/components/auth/logout-button'

// info 网页端的外框：顶上一条。账 56 起这里没有给用户看的页面：
// 申请入库改为我们在 info 管理端发起采集；缺数据的需求由 investment 的 data.missing 事件汇总。
export function InfoShell({
  csrfToken,
  locale,
  children,
}: {
  csrfToken: string
  locale: string
  children: React.ReactNode
}) {
  const t = useTranslations('shell')
  const tAuth = useTranslations('auth')
  return (
    <div
      className="bg-background flex min-h-dvh flex-col"
      data-route-class="authenticated-workspace"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <span className="mr-3 text-sm font-semibold">{t('brand')}</span>
        <div className="flex-1" />
        <LogoutButton
          csrfToken={csrfToken}
          locale={locale}
          label={tAuth('logout')}
          errorLabel={tAuth('logoutFailed')}
        />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
