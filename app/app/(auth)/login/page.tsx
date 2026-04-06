'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const t = useTranslations('auth')

  const handleLogin = () => {
    // BFF_PROVIDER=frontend 时跳自己的 /api/auth/login
    // BFF_PROVIDER=backend 时跳后端 NEXT_PUBLIC_API_URL/auth/login
    const bffProvider = process.env.NEXT_PUBLIC_BFF_PROVIDER ?? 'frontend'
    const loginUrl =
      bffProvider === 'backend'
        ? `${process.env.NEXT_PUBLIC_API_URL}/auth/login`
        : '/api/auth/login'
    window.location.href = loginUrl
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('loginTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </div>
        <Button className="w-full" onClick={handleLogin}>
          {t('login')}
        </Button>
      </div>
    </div>
  )
}
