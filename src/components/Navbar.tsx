"use client"

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Sprout } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { LoginModal } from './LoginModal'

export const Navbar = () => {
  const { profile, loading } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [hash, setHash] = useState('')
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash || '')
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    if (searchParams.get('modal') === 'login' && !profile && !loading) {
      setIsLoginModalOpen(true)
    }
  }, [searchParams, profile, loading])

  const navItems = useMemo(
    () => [
      { label: 'Features', href: '/#features' },
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Forum', href: '/#forum' },
      { label: 'Explore Plants', href: '/explore' },
      { label: 'Health Detection', href: '/diagnosis', requiresAuth: true },
      { label: 'Find My Plants', href: '/preferences', requiresAuth: true },
    ],
    []
  )

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.requiresAuth || !!profile),
    [navItems, profile]
  )

  const isActive = (href: string) => {
    if (href.startsWith('/#')) {
      const targetHash = href.slice(1)
      return pathname === '/' && hash === targetHash
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }
  return (
    <>
    <nav className="navbar">
      <Link href="/" className="nav-logo">
        <div className="nav-logo-icon">
          <Sprout size={24} color="var(--accent)" strokeWidth={1.75} fill="var(--accent)" fillOpacity={0.2} />
        </div>
        <span className="nav-logo-text">Farm<span>Quest</span></span>
      </Link>

      <ul className="nav-links">
        {visibleNavItems.map((item) => (
          <li
            key={item.href}
            className={`nav-link-item ${isActive(item.href) ? 'nav-link-item-active' : ''}`}
          >
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
        {profile ? (
          <li>
            <Link href="/profile" className="nav-profile-link">
              <div className="nav-profile-info">
                <span className="nav-profile-name">{profile.username}</span>
                <span className="nav-profile-status">{profile.archetype || 'GROWER'}</span>
              </div>
              <div className="nav-profile-avatar">{profile.avatar}</div>
            </Link>
          </li>
        ) : (
          !loading && (
            <li>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="nav-cta"
                style={{ background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Log In
              </button>
            </li>
          )
        )}
      </ul>
    </nav>
      
    <LoginModal
      isOpen={isLoginModalOpen}
      onClose={() => setIsLoginModalOpen(false)}
    />
  </>
  )
}

