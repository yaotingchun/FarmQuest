'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuest } from '@/lib/QuestContext'
import { PlantStatusCard } from '@/components/quest/PlantStatusCard'
import { TaskList } from '@/components/quest/TaskList'
import { StreakCounter } from '@/components/quest/StreakCounter'
import { XPBar } from '@/components/quest/XPBar'
import { RecoveryBanner } from '@/components/quest/RecoveryBanner'
import Link from 'next/link'

function QuestHubContent() {
  const searchParams = useSearchParams()
  const {
    plantState, plantData, todayTasks, hasActivePlant,
    completeTask, xpInfo, currentStage, streakCount,
    isRecoveryNeeded, availablePlants, selectPlant, resetQuest
  } = useQuest()

  // Auto-select plant from query parameter (?plant=P001)
  useEffect(() => {
    const plantParam = searchParams.get('plant')
    if (plantParam && !hasActivePlant) {
      selectPlant(plantParam)
    }
  }, [searchParams, hasActivePlant, selectPlant])

  // ── Plant Picker (no active plant) ──
  if (!hasActivePlant) {
    return (
      <div className="quest-page quest-picker">
        <div className="quest-picker-header">
          <div className="quest-picker-badge">🌱 PLANT QUEST</div>
          <h1 className="quest-picker-title">
            Choose Your <span className="quest-accent-text">Plant</span>
          </h1>
          <p className="quest-picker-desc">
            Select a plant to begin your growing journey. Complete quests, earn XP, and watch it thrive!
          </p>
        </div>

        <div className="quest-picker-grid">
          {availablePlants.slice(0, 12).map(plant => (
            <button
              key={plant.plant_id}
              className="quest-picker-card"
              onClick={() => selectPlant(plant.plant_id)}
            >
              <span className="quest-picker-emoji">{plant.emoji}</span>
              <span className="quest-picker-name">{plant.name}</span>
              <span className="quest-picker-info">
                💧 Every {plant.water_frequency_days}d · ☀️ {plant.sunlight_type.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Active Quest Hub ──
  const completedToday = todayTasks.filter(t => t.completed).length
  const totalToday = todayTasks.length
  const allDone = completedToday === totalToday && totalToday > 0

  return (
    <div className="quest-page quest-hub">
      {/* Page header */}
      <div className="quest-hub-header">
        <div>
          <h1 className="quest-hub-title">Plant Quest</h1>
          <p className="quest-hub-sub">Your daily plant care companion</p>
        </div>
        <button className="quest-reset-btn" onClick={resetQuest} title="Start over">
          ↺
        </button>
      </div>

      {/* Recovery banner */}
      {isRecoveryNeeded && plantState && (
        <RecoveryBanner plantName={plantState.plant_name} health={plantState.health} />
      )}

      {/* Plant Status */}
      {plantState && plantData && (
        <PlantStatusCard
          plantName={plantState.plant_name}
          plantEmoji={plantData.emoji}
          stage={currentStage}
          health={plantState.health}
          hydration={plantState.hydration}
          streak={streakCount}
          level={plantState.current_level}
        />
      )}

      {/* XP Bar */}
      {plantState && (
        <XPBar
          current={xpInfo.current}
          needed={xpInfo.needed}
          progress={xpInfo.progress}
          level={plantState.current_level}
          totalXP={plantState.total_xp}
        />
      )}

      {/* Streak + Quick Stats */}
      {plantState && (
        <div className="quest-hub-stats-row">
          <StreakCounter count={streakCount} best={plantState.longest_streak} />
          <div className="quest-hub-today-progress">
            <div className="quest-hub-today-ring">
              <svg viewBox="0 0 36 36" className="quest-ring-svg">
                <path
                  className="quest-ring-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="quest-ring-fill"
                  strokeDasharray={`${totalToday > 0 ? (completedToday / totalToday) * 100 : 0}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="quest-ring-text">{completedToday}/{totalToday}</span>
            </div>
            <span className="quest-hub-today-label">Today</span>
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <div className="quest-hub-tasks-section">
        <div className="quest-hub-tasks-header">
          <h2>Today&apos;s Tasks</h2>
          {!plantState?.daily_unlocked && (
            <span className="quest-hub-locked-hint">🔒 Complete Main Quest first</span>
          )}
        </div>

        {plantState?.daily_unlocked ? (
          todayTasks.length > 0 ? (
            <>
              <TaskList tasks={todayTasks} onComplete={completeTask} />
              {allDone && (
                <div className="quest-hub-all-done">
                  🎉 All tasks completed! +{50} bonus XP
                </div>
              )}
            </>
          ) : (
            <div className="quest-hub-no-tasks">
              <span>🌟</span>
              <p>No tasks due today. Your plant is doing great!</p>
            </div>
          )
        ) : (
          <div className="quest-hub-locked-msg">
            <span>⚔️</span>
            <p>Complete the <Link href="/quest/quests" className="quest-link">Main Quest</Link> to unlock daily tasks.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuestHubPage() {
  return (
    <Suspense fallback={
      <div className="quest-page">
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '120px' }}>
          Loading quest...
        </p>
      </div>
    }>
      <QuestHubContent />
    </Suspense>
  )
}
