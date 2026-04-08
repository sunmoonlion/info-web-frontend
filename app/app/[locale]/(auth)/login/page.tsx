import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

const loginUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`

export default function LoginPage() {
  const t = useTranslations('auth')

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('loginTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </div>
        <Button className="w-full" asChild>
          <a href={loginUrl}>{t('login')}</a>
        </Button>
      </div>
    </div>
  )
}
