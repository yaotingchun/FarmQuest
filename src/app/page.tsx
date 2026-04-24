'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { StatsBand } from '@/components/StatsBand'
import { HowItWorks } from '@/components/HowItWorks'
import { Forum } from '@/components/Forum'
import { CTA } from '@/components/CTA'

export default function Home() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile) {
      router.replace('/dashboard')
    }
  }, [profile, loading, router])

  if (loading || profile) {
    return null // Prevent flash of landing page content
  }

  return (
    <>
      <Hero />
      <Features />
      <StatsBand />
      <HowItWorks />
      <CTA />
    </>
  )
}