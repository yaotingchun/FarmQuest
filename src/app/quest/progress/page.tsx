'use client'

import { useQuest } from '@/lib/QuestContext'
import { XPBar } from '@/components/quest/XPBar'
import { BadgeGrid } from '@/components/quest/BadgeGrid'
import { GrowthTimeline } from '@/components/quest/GrowthTimeline'
import Link from 'next/link'

export default function ProgressPage() {
  const {
    plantState, badges, xpInfo, currentStage, hasActivePlant
  } = useQuest()

  if (!hasActivePlant || !plantState) {
    return (
      <div className="quest-page quest-empty">
        <div className="quest-empty-icon">📊</div>
        <h2>No Active Quest</h2>
        <p>Select a plant from the <Link href="/quest" className="quest-link">Quest Hub</Link> to track progress.</p>
      </div>
    )
  }

  // Health history chart (simple bar visualization)
  const healthLog = plantState.daily_health_log.slice(-14)

  return (
    <div className="quest-page quest-progress-page">
      <div className="quest-progress-header">
        <h1>Progress</h1>
        <p className="quest-progress-sub">Your growing journey at a glance</p>
      </div>

      {/* XP Section */}
      <div className="quest-progress-card">
        <XPBar
          current={xpInfo.current}
          needed={xpInfo.needed}
          progress={xpInfo.progress}
          level={plantState.current_level}
          totalXP={plantState.total_xp}
        />
      </div>

      {/* Stats Grid */}
      <div className="quest-progress-stats">
        <div className="quest-progress-stat-card">
          <span className="quest-stat-icon">📆</span>
          <span className="quest-stat-value">{plantState.completed_dates.length}</span>
          <span className="quest-stat-label">Days Completed</span>
        </div>
        <div className="quest-progress-stat-card">
          <span className="quest-stat-icon">🔥</span>
          <span className="quest-stat-value">{plantState.longest_streak}</span>
          <span className="quest-stat-label">Best Streak</span>
        </div>
        <div className="quest-progress-stat-card">
          <span className="quest-stat-icon">⚡</span>
          <span className="quest-stat-value">{plantState.total_xp}</span>
          <span className="quest-stat-label">Total XP</span>
        </div>
        <div className="quest-progress-stat-card">
          <span className="quest-stat-icon">🏅</span>
          <span className="quest-stat-value">{badges.filter(b => b.unlocked).length}</span>
          <span className="quest-stat-label">Badges</span>
        </div>
      </div>

      {/* Growth Timeline */}
      <div className="quest-progress-card">
        <GrowthTimeline
          currentStage={currentStage}
          transitions={plantState.stage_transitions}
        />
      </div>

      {/* Badges */}
      <div className="quest-progress-card">
        <BadgeGrid badges={badges} />
      </div>

      {/* Health History */}
      <div className="quest-progress-card">
        <h3 className="quest-health-title">💚 Health History (Last 14 Days)</h3>
        <div className="quest-health-chart">
          {healthLog.map((entry, i) => (
            <div key={i} className="quest-health-bar-wrap">
              <div
                className="quest-health-bar"
                style={{
                  height: `${entry.health}%`,
                  background: entry.health > 70 ? '#4ade80' : entry.health > 40 ? '#facc15' : '#f87171',
                }}
              />
              <span className="quest-health-bar-label">
                {new Date(entry.date + 'T00:00:00').getDate()}
              </span>
            </div>
          ))}
          {healthLog.length === 0 && (
            <p className="quest-health-empty">Health tracking starts after your first daily quest.</p>
          )}
        </div>
      </div>
    </div>
  )
}
