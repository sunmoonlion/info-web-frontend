import { redirect } from 'next/navigation'

// 根路径直接跳转到 dashboard
export default function Home() {
  redirect('/dashboard')
}
