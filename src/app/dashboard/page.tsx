'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import {
  Leaf, Sprout, Shield, Map, ArrowRight, Zap, Star,
} from 'lucide-react'

const FEATURES = [
  {
    id: 'find-my-plant',
    number: '01',
    icon: <Map size={32} strokeWidth={1.5} />,
    emoji: '🗺️',
    title: 'Find My Plant',
    subtitle: 'AI-Powered Recommendations',
    desc: 'Answer a few quick questions about your space, climate, and lifestyle. Our smart engine will recommend the perfect plants tailored just for you.',
    href: '/preferences',
    cta: 'Start Questionnaire',
    accent: '#5ec482',
    tags: ['Smart Match', 'Climate-Aware', 'Personalized'],
  },
  {
    id: 'pick-a-plant',
    number: '02',
    icon: <Sprout size={32} strokeWidth={1.5} />,
    emoji: '🌱',
    title: 'Pick a Plant',
    subtitle: 'Browse & Select',
    desc: 'Explore our curated plant catalogue and handpick the ones that spark your interest. Filter by difficulty, season, and growing space.',
    href: '/recommendations',
    cta: 'Browse Plants',
    accent: '#42c96c',
    tags: ['Full Catalogue', 'Filter by Space', 'Difficulty Rated'],
  },
  {
    id: 'plant-quest',
    number: '03',
    icon: <Star size={32} strokeWidth={1.5} />,
    emoji: '⚡',
    title: 'Plant Quest',
    subtitle: 'Daily Quests & XP',
    desc: 'Level up your farming journey. Complete daily care tasks, earn XP, track streaks, and watch your plants grow stage by stage.',
    href: '/quest',
    cta: 'Start Quest',
    accent: '#facc15',
    tags: ['Daily Tasks', 'XP & Levels', 'Streak Tracker'],
  },
  {
    id: 'health-detection',
    number: '04',
    icon: <Shield size={32} strokeWidth={1.5} />,
    emoji: '🔬',
    title: 'Health Detection',
    subtitle: 'AI Diagnostics',
    desc: 'Upload a photo of your plant and our AI will instantly diagnose its health, identify diseases, and provide a personalized treatment protocol.',
    href: '/diagnosis',
    cta: 'Run Diagnosis',
    accent: '#60a5fa',
    tags: ['AI-Powered', 'Instant Results', 'Treatment Plan'],
  },
]

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
          <div className="dashboard-welcome-badge">
            <Leaf size={12} />
            Your Farm Hub
          </div>
          <h1 className="dashboard-title">
            Welcome back, <span className="dashboard-title-accent">{profile.username}</span>
          </h1>
          <p className="dashboard-subtitle">
            Choose where to grow today — each tool is designed to help you farm smarter.
          </p>
        </div>
        <div className="dashboard-header-right">
          <div className="dashboard-stat-chip">
            <Zap size={14} color="#facc15" />
            <span>Lv. {profile.level ?? 1}</span>
          </div>
          <div className="dashboard-stat-chip">
            <Sprout size={14} color="var(--accent)" />
            <span>{profile.plantsGrown ?? 0} Grown</span>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="dashboard-grid">
        {FEATURES.map((feature, idx) => (
          <Link
            key={feature.id}
            href={feature.href}
            className="dashboard-card"
            id={`dashboard-card-${feature.id}`}
            style={{ '--card-accent': feature.accent } as React.CSSProperties}
          >
            {/* Number tag */}
            <span className="dashboard-card-num">{feature.number}</span>

            {/* Icon */}
            <div className="dashboard-card-icon-wrap">
              <div className="dashboard-card-icon" style={{ color: feature.accent }}>
                {feature.icon}
              </div>
              <span className="dashboard-card-emoji">{feature.emoji}</span>
            </div>

            {/* Content */}
            <div className="dashboard-card-body">
              <p className="dashboard-card-subtitle">{feature.subtitle}</p>
              <h2 className="dashboard-card-title">{feature.title}</h2>
              <p className="dashboard-card-desc">{feature.desc}</p>
            </div>

            {/* Tags */}
            <div className="dashboard-card-tags">
              {feature.tags.map(tag => (
                <span key={tag} className="dashboard-card-tag">{tag}</span>
              ))}
            </div>

            {/* CTA */}
            <div className="dashboard-card-cta">
              <span>{feature.cta}</span>
              <ArrowRight size={16} />
            </div>

            {/* Glow overlay on hover */}
            <div className="dashboard-card-glow" />
          </Link>
        ))}
      </div>
    </div>
  )
}
