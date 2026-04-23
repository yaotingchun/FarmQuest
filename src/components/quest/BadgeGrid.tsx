'use client'

import type { Badge } from '@/types/quest'

interface BadgeGridProps {
  badges: Badge[]
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const unlocked = badges.filter(b => b.unlocked).length

  return (
    <div className="quest-badge-section">
      <div className="quest-badge-header">
        <h3>🏅 Badges</h3>
        <span className="quest-badge-count">{unlocked}/{badges.length} earned</span>
      </div>
      <div className="quest-badge-grid">
        {badges.map(badge => (
          <div
            key={badge.id}
            className={`quest-badge-item ${badge.unlocked ? 'unlocked' : 'locked'}`}
            title={badge.description}
            style={{ '--badge-color': badge.color } as React.CSSProperties}
          >
            <div className="quest-badge-icon">
              {badge.unlocked ? badge.icon : '🔒'}
            </div>
            <span className="quest-badge-label">{badge.label}</span>
            {badge.unlocked && <div className="quest-badge-glow" />}
          </div>
        ))}
      </div>
    </div>
  )
}
