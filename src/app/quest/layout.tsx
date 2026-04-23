'use client'

import { QuestProvider } from '@/lib/QuestContext'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'


function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login') // Redirect if not authenticated
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  return <QuestProvider>{children}</QuestProvider>
}

export default function QuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="quest-layout">
      <div className="quest-content">
        <AuthGuard>{children}</AuthGuard>
      </div>
    </div>
  )
}
