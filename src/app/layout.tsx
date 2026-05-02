import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FarmQuest — Grow Food, Level Up Life',
  description: 'The micro-farming app that turns your home into a thriving garden. Track plants, earn XP, and join a community of urban growers.',
}

import { AuthProvider } from '@/context/AuthContext'
import { Suspense } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* Persistent Background Layer */}
          <div className="bg-canvas">
            <div className="bg-grid" />
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
          </div>

          <div className="page-wrapper">
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            <main>{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}