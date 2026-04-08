import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">欢迎使用 tpl 应用</p>
    </div>
  )
}
