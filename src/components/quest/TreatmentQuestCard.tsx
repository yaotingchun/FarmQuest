'use client'

import type { TreatmentQuest } from '@/types/quest'
import { ShieldCheck, Clock, CheckCircle2, Sparkles } from 'lucide-react'

interface TreatmentQuestCardProps {
  quest: TreatmentQuest
  index: number
  total: number
  onComplete: (questId: string) => void
  readOnly?: boolean
}

const CATEGORY_ICONS: Record<string, string> = {
  soil: '🪴',
  water: '💧',
  pesticide: '🧪',
  nutrient: '🧬',
  pruning: '✂️',
  environment: '🌡️',
  other: '📋',
}

const CATEGORY_COLORS: Record<string, string> = {
  soil: '#92400e',
  water: '#0369a1',
  pesticide: '#7c3aed',
  nutrient: '#15803d',
  pruning: '#b45309',
  environment: '#0e7490',
  other: '#6b7280',
}

export function TreatmentQuestCard({ quest, index, total, onComplete, readOnly = false }: TreatmentQuestCardProps) {
  const categoryIcon = CATEGORY_ICONS[quest.category] || '📋'
  const categoryColor = CATEGORY_COLORS[quest.category] || '#6b7280'
  const isCompleted = quest.completed

  return (
    <div
      className={`treatment-quest-card ${isCompleted ? 'completed' : ''}`}
      onClick={() => !isCompleted && !readOnly && onComplete(quest.id)}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '14px 16px',
        background: isCompleted ? 'rgba(255,255,255,0.01)' : 'rgba(249,115,22,0.03)',
        border: `1px solid ${isCompleted ? 'rgba(255,255,255,0.04)' : 'rgba(249,115,22,0.15)'}`,
        borderRadius: '16px',
        cursor: isCompleted || readOnly ? 'default' : 'pointer',
        transition: 'all 0.25s',
        opacity: isCompleted ? 0.55 : 1,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Treatment glow accent */}
      {!isCompleted && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
          background: 'linear-gradient(180deg, #f97316, #ef4444)',
          borderRadius: '3px 0 0 3px'
        }} />
      )}

      {/* Timeline marker */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
        paddingLeft: !isCompleted ? '4px' : '0'
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: isCompleted ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.12)',
          border: `2px solid ${isCompleted ? 'rgba(34,197,94,0.4)' : 'rgba(249,115,22,0.35)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 800,
          color: isCompleted ? '#22c55e' : '#f97316',
          transition: 'all 0.3s'
        }}>
          {isCompleted ? '✓' : `D${quest.day}`}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.88rem', fontWeight: 600,
          color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
          lineHeight: 1.5,
          textDecoration: isCompleted ? 'line-through' : 'none'
        }}>
          {quest.step}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Treatment badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
            background: 'rgba(249,115,22,0.1)', color: '#fb923c',
            border: '1px solid rgba(249,115,22,0.15)'
          }}>
            🩺 Treatment
          </span>
          {/* Category badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
            background: `${categoryColor}15`, color: categoryColor,
            border: `1px solid ${categoryColor}25`
          }}>
            {categoryIcon} {quest.category}
          </span>
          {/* Duration */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
            background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)',
            border: '1px solid var(--glass-border)'
          }}>
            <Clock size={10} /> {quest.duration}
          </span>
          {/* XP */}
          <span style={{
            fontSize: '0.72rem', fontWeight: 800, color: '#fbbf24',
            marginLeft: 'auto'
          }}>
            +{quest.xp_reward} XP
          </span>
        </div>
      </div>
    </div>
  )
}

// Summary card showing overall treatment progress
export function TreatmentProgressCard({
  quests,
  diseaseName,
  severity,
  expectedBenefits
}: {
  quests: TreatmentQuest[]
  diseaseName: string
  severity: string
  expectedBenefits?: { yieldSavedPercent: number; recoveryTimeDays: number; healthImprovement: number; description: string }
}) {
  const completed = quests.filter(q => q.completed).length
  const total = quests.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone = completed === total && total > 0

  const severityColor = severity === 'severe' ? '#ef4444' : severity === 'moderate' ? '#f97316' : '#eab308'

  return (
    <div style={{
      background: allDone
        ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.08))'
        : 'rgba(249,115,22,0.04)',
      border: `1px solid ${allDone ? 'rgba(34,197,94,0.2)' : 'rgba(249,115,22,0.15)'}`,
      borderRadius: '20px', padding: '1.25rem',
      marginBottom: '1rem'
    }}>
      {allDone ? (
        /* Recovery Complete Celebration */
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎊</div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#22c55e', marginBottom: '4px' }}>
            Recovery Complete!
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
            All treatment steps for {diseaseName} have been completed.
          </p>
          {expectedBenefits && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#22c55e' }}>{expectedBenefits.yieldSavedPercent}%</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Yield Saved</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38bdf8' }}>{expectedBenefits.recoveryTimeDays}d</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>Recovery</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#a78bfa' }}>{expectedBenefits.healthImprovement}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>New Health</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* In-progress summary */
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#f97316" />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Treating: {diseaseName}
                </div>
                <div style={{
                  display: 'inline-flex', marginTop: '4px',
                  padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
                  background: `${severityColor}15`, color: severityColor,
                  border: `1px solid ${severityColor}25`
                }}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)} severity
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f97316' }}>{completed}/{total}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>Steps Done</div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '10px',
              background: 'linear-gradient(90deg, #f97316, #ef4444)',
              width: `${progress}%`,
              transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 0 8px rgba(249,115,22,0.3)'
            }} />
          </div>
        </>
      )}
    </div>
  )
}
