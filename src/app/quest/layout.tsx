'use client'

import { QuestProvider } from '@/lib/QuestContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/quest', label: 'Home', icon: '🏠' },
  { href: '/quest/quests', label: 'Quests', icon: '⚔️' },
  { href: '/quest/calendar', label: 'Calendar', icon: '📅' },
  { href: '/quest/progress', label: 'Progress', icon: '📊' },
]

function QuestNav() {
  const pathname = usePathname()

  return (
    <nav className="quest-bottom-nav">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`quest-nav-item ${pathname === item.href ? 'active' : ''}`}
        >
          <span className="quest-nav-icon">{item.icon}</span>
          <span className="quest-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export default function QuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <QuestProvider>
      <div className="quest-layout">
        <div className="quest-content">
          {children}
        </div>
        <QuestNav />
      </div>
    </QuestProvider>
  )
}
