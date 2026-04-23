'use client'

import type { GrowthStage } from '@/types/quest'

const STAGE_CONFIG: Record<GrowthStage, { emoji: string; label: string; color: string }> = {
  0: { emoji: '🌰', label: 'Seed', color: '#a78bfa' },
  1: { emoji: '🌱', label: 'Sprout', color: '#4ade80' },
  2: { emoji: '🌿', label: 'Mature', color: '#22c55e' },
  3: { emoji: '🌾', label: 'Harvest', color: '#facc15' },
}

interface PlantStatusCardProps {
  plantName: string
  plantEmoji: string
  stage: GrowthStage
  streak: number
  sunlight?: string
  waterFrequency?: number
  startMethod?: string
}

const formatSunlight = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const formatStartMethod = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function PlantStatusCard({ plantName, plantEmoji, stage, streak, sunlight, waterFrequency, startMethod }: PlantStatusCardProps) {
  const stageInfo = STAGE_CONFIG[stage]
  const displayLabel = (stage === 0 && startMethod) ? formatStartMethod(startMethod) : stageInfo.label

  return (
    <div className="quest-plant-card">
      <div className="quest-plant-card-visual">
        <div className="quest-plant-emoji-wrap" style={{ '--stage-color': stageInfo.color } as React.CSSProperties}>
          <span className="quest-plant-emoji">{plantEmoji}</span>
          <div className="quest-plant-stage-ring" />
        </div>
        <div className="quest-plant-stage-badge" style={{ background: stageInfo.color }}>
          {stageInfo.emoji} {displayLabel}
        </div>
      </div>

      <div className="quest-plant-info">
        <div className="quest-plant-name-row" style={{ alignItems: 'center' }}>
          <h2 className="quest-plant-name">{plantName}</h2>
        </div>

        {(sunlight || waterFrequency) && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
             {sunlight && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                 <span>☀️</span>
                 <span>{formatSunlight(sunlight)}</span>
               </div>
             )}
             {waterFrequency && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                 <span>💧</span>
                 <span>Every {waterFrequency} {waterFrequency === 1 ? 'day' : 'days'}</span>
               </div>
             )}
          </div>
        )}

        {streak > 0 && (
          <div className="quest-plant-streak-inline" style={{ marginTop: '0.5rem' }}>
            🔥 {streak} day streak
          </div>
        )}
      </div>
    </div>
  )
}
