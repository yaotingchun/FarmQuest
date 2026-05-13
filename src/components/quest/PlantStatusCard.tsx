'use client'

import type { GrowthStage } from '@/types/quest'
import type { PlantSourceCategory } from '@/types/quest'
import Link from 'next/link'

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
  sourceCategory?: PlantSourceCategory
  sunlight?: string
  waterFrequency?: number
  startMethod?: string
  status?: 'in_progress' | 'completed'
  trackingLink?: string
}

const formatSunlight = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const formatStartMethod = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const SOURCE_CONFIG: Record<PlantSourceCategory, { label: string; emoji: string; className: string }> = {
  chosen_plant: { label: 'Self Planted', emoji: '🌱', className: 'source-self' },
  posted_order: { label: 'Posted Order', emoji: '📤', className: 'source-posted' },
  accepted_order: { label: 'Accepted Order', emoji: '🚜', className: 'source-accepted' },
}

export function PlantStatusCard({ plantName, plantEmoji, stage, streak, sourceCategory = 'chosen_plant', sunlight, waterFrequency, startMethod, status: propStatus, trackingLink }: PlantStatusCardProps) {
  const stageInfo = STAGE_CONFIG[stage]
  const displayLabel = (stage === 0 && startMethod) ? formatStartMethod(startMethod) : stageInfo.label
  const sourceInfo = SOURCE_CONFIG[sourceCategory]

  const isOrder = sourceCategory === 'posted_order' || sourceCategory === 'accepted_order'
  const status = propStatus || (stage === 3 ? 'completed' : 'in_progress')

  return (
    <div className="quest-plant-card">
      <div className="quest-plant-source-wrap" style={{ gap: '8px' }}>
        <span className={`quest-plant-source-badge ${sourceInfo.className}`}>
          {sourceInfo.emoji} {sourceInfo.label}
        </span>
        {isOrder && (
          <span className={`quest-plant-status-badge ${status}`}>
            {status === 'completed' ? '✓ Completed' : '⏳ In Progress'}
          </span>
        )}
      </div>

      <div className="quest-plant-card-body">
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
          <div className="quest-plant-name-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="quest-plant-name">{plantName}</h2>

          </div>

          {(sunlight || waterFrequency) && (
            <div className="quest-plant-detail-row">
              {sunlight && (
                <div className="quest-plant-detail-item">
                  <span>☀️</span>
                  <span>{formatSunlight(sunlight)}</span>
                </div>
              )}
              {waterFrequency && (
                <div className="quest-plant-detail-item">
                  <span>💧</span>
                  <span>Every {waterFrequency} {waterFrequency === 1 ? 'day' : 'days'}</span>
                </div>
              )}
            </div>
          )}

          {streak > 0 && (
            <div className="quest-plant-streak-inline">
              🔥 {streak} day streak
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
