import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // zh-CN 不加前缀，en 加 /en 前缀
})

export const config = {
  matcher: [
    // 匹配所有路径，除了 api、_next、静态文件
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
