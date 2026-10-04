'use client'

import { ArrowUpRightIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { LogoutButton } from '@/components/auth/logout-button'
import { CrossAppLink } from '@/components/common/cross-app-link'
import { InfoProvider } from '@/lib/info/context'
import { routes } from '@/lib/info/routes'
import { cn } from '@/lib/utils'

// info 网页端的外框：顶上一条导航。用户在这里只做两件事：申请入库、看自己的申请。
export function InfoShell({
  csrfToken,
  locale,
  children,
}: {
  csrfToken: string
  locale: string
  children: React.ReactNode
}) {
  const t = useTranslations('requests.shell')
  const tAuth = useTranslations('auth')
  const pathname = usePathname()
  const link = 'rounded-md px-3 py-1.5 text-sm hover:bg-foreground/5'
  const onNew = pathname.endsWith('/requests/new')
  return (
    <InfoProvider csrfToken={csrfToken} locale={locale}>
      <div
        className="bg-background flex min-h-dvh flex-col"
        data-route-class="authenticated-workspace"
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <span className="mr-3 text-sm font-semibold">{t('brand')}</span>
          <nav aria-label={t('brand')} className="flex items-center gap-1">
            <Link
              href={routes.newRequest(locale)}
              aria-current={onNew ? 'page' : undefined}
              className={cn(link, onNew && 'bg-foreground/[0.07] font-medium')}
            >
              {t('new')}
            </Link>
            <Link
              href={routes.requests(locale)}
              aria-current={!onNew ? 'page' : undefined}
              className={cn(link, !onNew && 'bg-foreground/[0.07] font-medium')}
            >
              {t('mine')}
            </Link>
            <CrossAppLink to="knowledge.catalog" className={cn(link, 'flex items-center gap-1')}>
              {t('catalog')}
              <ArrowUpRightIcon className="text-muted-foreground size-3.5" />
            </CrossAppLink>
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
    </InfoProvider>
  )
}
