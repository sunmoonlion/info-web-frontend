import { getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const loginUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`

type Props = {
  searchParams: Promise<{
    error?: string
    error_hint?: string
    error_description?: string
  }>
}

export default async function LoginPage({ searchParams }: Props) {
  const t = await getTranslations('auth')
  const params = await searchParams

  let errorText: string | null = null
  if (params.error === 'auth_failed') {
    errorText = t('errorAuthFailed')
  } else if (params.error === 'no_code') {
    errorText = t('errorNoCode')
  } else if (params.error === 'oauth_error') {
    const parts = [params.error_hint, params.error_description].filter(Boolean)
    errorText = parts.length ? parts.join(' — ') : t('errorOAuthGeneric')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('loginTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </div>
        {errorText ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive"
          >
            {errorText}
          </p>
        ) : null}
        <a href={loginUrl} className={cn(buttonVariants({ className: 'w-full' }))}>
          {t('login')}
        </a>
      </div>
    </div>
  )
}
