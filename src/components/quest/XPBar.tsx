'use client'

interface XPBarProps {
  current: number
  needed: number
  progress: number
  level: number
  totalXP: number
}

export function XPBar({ current, needed, progress, level, totalXP }: XPBarProps) {
  return (
    <div className="quest-xp-bar">
      <div className="quest-xp-header">
        <div className="quest-xp-level">
          <span className="quest-xp-level-badge">⚡ Lv.{level}</span>
          <span className="quest-xp-total">{totalXP.toLocaleString()} XP total</span>
        </div>
        <span className="quest-xp-progress-text">{current}/{needed} XP</span>
      </div>
      <div className="quest-xp-track">
        <div className="quest-xp-fill" style={{ width: `${progress}%` }}>
          <div className="quest-xp-glow" />
        </div>
      </div>
      <p className="quest-xp-hint">{needed - current} XP to Level {level + 1}</p>
    </div>
  )
}
