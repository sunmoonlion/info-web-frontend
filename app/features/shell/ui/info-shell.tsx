'use client'

import { useTranslations } from 'next-intl'

import { LogoutButton } from '@/components/auth/logout-button'
import { Link, usePathname } from '@/i18n/navigation'

const NAV = [
  { href: '/supply/new', key: 'new' },
  { href: '/supply/demands', key: 'demands' },
  { href: '/supply/subscriptions', key: 'subscriptions' },
] as const

// knowfeed web端的外框：顶上一条，三个入口：提需求、我的需求、订阅（SDD 0045 第一节）。
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
  const tNav = useTranslations('supply.nav')
  const tAuth = useTranslations('auth')
  const pathname = usePathname()
  return (
    <div
      className="bg-background flex min-h-dvh flex-col"
      data-route-class="authenticated-workspace"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <span className="mr-3 text-sm font-semibold">{t('brand')}</span>
        <nav className="flex gap-3 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={pathname === item.href ? 'font-medium' : 'text-muted-foreground'}
            >
              {tNav(item.key)}
            </Link>
          ))}
        </nav>
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
