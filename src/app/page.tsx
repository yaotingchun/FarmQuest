'use client'

import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { StatsBand } from '@/components/StatsBand'
import { HowItWorks } from '@/components/HowItWorks'
import { Forum } from '@/components/Forum'
import { CTA } from '@/components/CTA'

export default function Home() {
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