'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  Leaf, Sprout, Shield, Map, ArrowRight, Zap, Star, ShoppingCart, BookOpen, Trophy, User, Swords
} from 'lucide-react'

const FEATURES = {
  top: [
    {
      id: 'find-my-plant',
      icon: <Map size={24} />,
      emoji: '🗺️',
      title: 'Find My Plant',
      desc: 'AI Matching',
      href: '/preferences',
      accent: '#5ec482',
    },
    {
      id: 'start-growing',
      icon: <Sprout size={24} />,
      emoji: '🌱',
      title: 'Start Growing',
      desc: 'Pick Your First',
      href: '/recommendations',
      accent: '#42c96c',
    },
    {
      id: 'health-detection',
      icon: <Shield size={24} />,
      emoji: '🔬',
      title: 'Health Detection',
      desc: 'AI Diagnostics',
      href: '/diagnosis',
      accent: '#60a5fa',
    },
  ],
  main: {
    id: 'plant-quest',
    icon: <Swords size={120} strokeWidth={1.5} />,
    emoji: '🏆',
    title: 'Plant Quest',
    subtitle: 'MAIN EXPERIENCE',
    desc: 'Level up your journey. Complete daily tasks, earn XP, and track streaks.',
    href: '/quest',
    cta: 'Continue',
    accent: '#5ec482',
    tags: ['Tasks', 'XP', 'Streaks'],
  },
  other: {
    title: 'Other Features',
    items: [
      {
        id: 'marketplace',
        icon: <ShoppingCart size={20} />,
        title: 'Marketplace',
        desc: 'Buy & Sell',
        href: '/marketplace',
      },
      {
        id: 'plant-database',
        icon: <BookOpen size={20} />,
        title: 'Plant Database',
        desc: 'Explore Species',
        href: '/explore',
      },
      {
        id: 'profile',
        icon: <User size={20} />,
        title: 'Profile',
        desc: 'View your progress',
        href: '/profile',
      },
    ]
  }
}

export default function DashboardPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/?modal=login')
    }
  }, [loading, profile, router])

  if (loading || !profile) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-skeleton-wrap">
          <div className="skeleton" style={{ height: '80px', borderRadius: '16px', marginBottom: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '320px', borderRadius: '24px' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">
            Welcome back, <span className="dashboard-title-accent">{profile.username}</span>
          </h1>
          <p className="dashboard-subtitle">
            Choose where to grow today — each tool is designed to help you farm smarter.
          </p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="bento-container">
        {/* Top Row: 3 Small Cards */}
        <div className="bento-top-row">
          {FEATURES.top.map((f) => (
            <Link key={f.id} href={f.href} className="bento-card bento-small" style={{ '--card-accent': f.accent } as any}>
              <div className="bento-icon-box">{f.icon}</div>
              <div className="bento-content">
                <div className="bento-label-group">
                  <h3>{f.title}</h3>
                  <span className="bento-pro-badge">PRO</span>
                </div>
                <p>{f.desc}</p>
              </div>
              <ArrowRight size={16} className="bento-arrow" />
            </Link>
          ))}
        </div>

        {/* Bottom Row: Main Experience + Side Column */}
        <div className="bento-bottom-row">
          {/* Main Quest Card */}
          <Link href={FEATURES.main.href} className="bento-card bento-main" style={{ '--card-accent': FEATURES.main.accent } as any}>
            <div className="bento-main-header">
              <span className="bento-main-badge">
                <Star size={12} fill="currentColor" />
                {FEATURES.main.subtitle}
              </span>
            </div>
            
            <div className="bento-main-body">
              <div className="bento-main-content">
                <h2 className="bento-main-title">{FEATURES.main.title}</h2>
                <p className="bento-main-desc">{FEATURES.main.desc}</p>
                
                <div className="bento-main-tags">
                  {FEATURES.main.tags.map(tag => (
                    <span key={tag} className="bento-tag">{tag}</span>
                  ))}
                </div>

                <div className="bento-main-cta">
                  <span>{FEATURES.main.cta}</span>
                  <div className="cta-play-icon">▶</div>
                </div>
              </div>

              <div className="bento-main-visual">
                <div className="bento-main-icon-wrap">{FEATURES.main.icon}</div>
                <div className="bento-main-glow" />
              </div>
            </div>
          </Link>

          <div className="bento-side-col">
            <div className="bento-card bento-other">
              <div className="bento-other-header">
                <h4>{FEATURES.other.title}</h4>
              </div>
              <div className="bento-other-grid">
                {FEATURES.other.items.map((f) => (
                  <Link key={f.id} href={f.href} className="bento-other-item">
                    <div className="bento-other-icon">{f.icon}</div>
                    <div className="bento-other-text">
                      <h5>{f.title}</h5>
                      <p>{f.desc}</p>
                    </div>
                    <ArrowRight size={14} className="bento-other-arrow" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
