'use client'

import type { GrowthStage } from '@/types/quest'

const STAGES: { key: GrowthStage; emoji: string; label: string; color: string }[] = [
  { key: 'seed', emoji: '🌰', label: 'Seed', color: '#a78bfa' },
  { key: 'sprout', emoji: '🌱', label: 'Sprout', color: '#4ade80' },
  { key: 'mature', emoji: '🌿', label: 'Mature', color: '#22c55e' },
  { key: 'harvest', emoji: '🌾', label: 'Harvest', color: '#facc15' },
]

interface GrowthTimelineProps {
  currentStage: GrowthStage
  transitions: { stage: GrowthStage; date: string }[]
}

export function GrowthTimeline({ currentStage, transitions }: GrowthTimelineProps) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage)

  return (
    <div className="quest-growth-timeline">
      <h3 className="quest-growth-title">🌱 Growth Journey</h3>
      <div className="quest-growth-track">
        {STAGES.map((stage, i) => {
          const isReached = i <= currentIdx
          const isCurrent = stage.key === currentStage
          const transition = transitions.find(t => t.stage === stage.key)

          return (
            <div key={stage.key} className="quest-growth-stage-item">
              {i > 0 && (
                <div className={`quest-growth-connector ${isReached ? 'filled' : ''}`}
                  style={{ '--connector-color': stage.color } as React.CSSProperties}
                />
              )}
              <div
                className={`quest-growth-node ${isReached ? 'reached' : ''} ${isCurrent ? 'current' : ''}`}
                style={{ '--node-color': stage.color } as React.CSSProperties}
              >
                <span className="quest-growth-node-emoji">{stage.emoji}</span>
                {isCurrent && <div className="quest-growth-pulse" />}
              </div>
              <span className="quest-growth-stage-label">{stage.label}</span>
              {transition && (
                <span className="quest-growth-date">
                  {new Date(transition.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
