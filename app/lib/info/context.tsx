'use client'

import { createContext, useContext } from 'react'

type InfoContext = { csrfToken: string; locale: string }

const Context = createContext<InfoContext | null>(null)

// 登录之后各功能都要用的两样：改动类请求的 CSRF、当前语言
export function InfoProvider({
  csrfToken,
  locale,
  children,
}: InfoContext & { children: React.ReactNode }) {
  return <Context.Provider value={{ csrfToken, locale }}>{children}</Context.Provider>
}

export function useInfo() {
  const value = useContext(Context)
  if (value === null) throw new Error('useInfo must be used inside InfoProvider')
  return value
}
