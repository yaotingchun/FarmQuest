'use client'

import type { GrowthStage } from '@/types/quest'

const STAGE_CONFIG: Record<GrowthStage, { emoji: string; label: string; color: string }> = {
  seed: { emoji: '🌰', label: 'Seed', color: '#a78bfa' },
  sprout: { emoji: '🌱', label: 'Sprout', color: '#4ade80' },
  mature: { emoji: '🌿', label: 'Mature', color: '#22c55e' },
  harvest: { emoji: '🌾', label: 'Harvest', color: '#facc15' },
}

interface PlantStatusCardProps {
  plantName: string
  plantEmoji: string
  stage: GrowthStage
  health: number
  hydration: number
  streak: number
  level: number
}

export function PlantStatusCard({ plantName, plantEmoji, stage, health, hydration, streak, level }: PlantStatusCardProps) {
  const stageInfo = STAGE_CONFIG[stage]

  return (
    <div className="quest-plant-card">
      <div className="quest-plant-card-visual">
        <div className="quest-plant-emoji-wrap" style={{ '--stage-color': stageInfo.color } as React.CSSProperties}>
          <span className="quest-plant-emoji">{plantEmoji}</span>
          <div className="quest-plant-stage-ring" />
        </div>
        <div className="quest-plant-stage-badge" style={{ background: stageInfo.color }}>
          {stageInfo.emoji} {stageInfo.label}
        </div>
      </div>

      <div className="quest-plant-info">
        <div className="quest-plant-name-row">
          <h2 className="quest-plant-name">{plantName}</h2>
          <span className="quest-plant-level">Lv.{level}</span>
        </div>

        <div className="quest-plant-meters">
          <div className="quest-meter">
            <div className="quest-meter-header">
              <span>💧 Hydration</span>
              <span className="quest-meter-val">{hydration}%</span>
            </div>
            <div className="quest-meter-track">
              <div
                className="quest-meter-fill hydration"
                style={{ width: `${hydration}%` }}
              />
            </div>
          </div>

          <div className="quest-meter">
            <div className="quest-meter-header">
              <span>💚 Health</span>
              <span className="quest-meter-val">{health}%</span>
            </div>
            <div className="quest-meter-track">
              <div
                className="quest-meter-fill health"
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
        </div>

        {streak > 0 && (
          <div className="quest-plant-streak-inline">
            🔥 {streak} day streak
          </div>
        )}
      </div>
    </div>
  )
}
