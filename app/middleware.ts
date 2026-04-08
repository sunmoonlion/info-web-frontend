import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // 所有 locale 都显示前缀: /zh-CN/... 和 /en/...
})

export const config = {
  matcher: [
    // 匹配所有路径，除了 api、_next、静态文件
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
