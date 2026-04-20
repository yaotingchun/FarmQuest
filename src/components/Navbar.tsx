"use client"

import { Sprout } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export const Navbar = () => {
  const pathname = usePathname()
  const [hash, setHash] = useState('')

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash || '')
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  const navItems = useMemo(
    () => [
      { label: 'Features', href: '/#features' },
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Forum', href: '/#forum' },
      { label: 'Explore Plants', href: '/explore' },
      { label: 'Health Detection', href: '/diagnosis' },
      { label: 'Find Plants', href: '/recommendations' },
    ],
    []
  )

  const isActive = (href: string) => {
    if (href.startsWith('/#')) {
      const targetHash = href.slice(1) // "#features"
      return pathname === '/' && hash === targetHash
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="navbar">
      <a href="/" className="nav-logo">
        <div className="nav-logo-icon">
          <Sprout size={24} color="var(--accent)" strokeWidth={1.75} fill="var(--accent)" fillOpacity={0.2} />
        </div>
        <span className="nav-logo-text">Farm<span>Quest</span></span>
      </a>

      <ul className="nav-links">
        {navItems.map((item) => (
          <li
            key={item.href}
            className={`nav-link-item ${isActive(item.href) ? 'nav-link-item-active' : ''}`}
          >
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
        <li><a href="/preferences" className="nav-cta">Start Growing →</a></li>
        <li>
          <a href="/profile" className="nav-profile-link">
            <div className="nav-profile-info">
              <span className="nav-profile-name">yaoting_25</span>
              <span className="nav-profile-status">ELITE GROWER</span>
            </div>
            <div className="nav-profile-avatar">🧑‍🌾</div>
          </a>
        </li>
      </ul>
    </nav>
  )
}

