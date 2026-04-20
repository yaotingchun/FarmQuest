'use client'

import { useState } from 'react'
import { useQuest } from '@/lib/QuestContext'
import { QuestCard } from '@/components/quest/QuestCard'
import { TaskList } from '@/components/quest/TaskList'
import Link from 'next/link'

type Tab = 'main' | 'daily'

export default function QuestsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('main')
  const {
    plantState, mainQuests, todayTasks,
    completeMainQuestStep, completeTask, hasActivePlant
  } = useQuest()

  if (!hasActivePlant) {
    return (
      <div className="quest-page quest-empty">
        <div className="quest-empty-icon">⚔️</div>
        <h2>No Active Quest</h2>
        <p>Select a plant from the <Link href="/quest" className="quest-link">Quest Hub</Link> to begin.</p>
      </div>
    )
  }

  return (
    <div className="quest-page quest-quests">
      {/* Header */}
      <div className="quest-quests-header">
        <h1>Quests</h1>
        <p className="quest-quests-sub">
          {plantState?.daily_unlocked
            ? 'Complete daily tasks to keep your plant healthy'
            : 'Complete the setup quest to begin daily care'}
        </p>
      </div>

      {/* Tabs */}
      <div className="quest-tabs">
        <button
          className={`quest-tab ${activeTab === 'main' ? 'active' : ''}`}
          onClick={() => setActiveTab('main')}
        >
          🏰 Main Quest
          {plantState && plantState.main_quest_step >= 3 && (
            <span className="quest-tab-badge done">✓</span>
          )}
        </button>
        <button
          className={`quest-tab ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          📋 Daily Quest
          {!plantState?.daily_unlocked && (
            <span className="quest-tab-badge locked">🔒</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="quest-tab-content">
        {activeTab === 'main' && (
          <div className="quest-main-quest-list">
            <div className="quest-main-progress">
              <div className="quest-main-progress-bar">
                <div
                  className="quest-main-progress-fill"
                  style={{ width: `${((plantState?.main_quest_step || 0) / 3) * 100}%` }}
                />
              </div>
              <span className="quest-main-progress-text">
                {plantState?.main_quest_step || 0}/3 Completed
              </span>
            </div>

            {mainQuests.map((quest, i) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                index={i}
                onComplete={completeMainQuestStep}
              />
            ))}

            {plantState && plantState.main_quest_step >= 3 && (
              <div className="quest-main-unlocked">
                <span>🎉</span>
                <div>
                  <h3>Daily Quests Unlocked!</h3>
                  <p>Switch to the Daily Quest tab to start your care routine.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="quest-daily-quest-section">
            {plantState?.daily_unlocked ? (
              todayTasks.length > 0 ? (
                <>
                  <div className="quest-daily-summary">
                    <span className="quest-daily-count">
                      {todayTasks.filter(t => t.completed).length}/{todayTasks.length} tasks
                    </span>
                    <span className="quest-daily-xp">
                      +{todayTasks.reduce((acc, t) => acc + t.xp_reward, 0)} XP possible
                    </span>
                  </div>
                  <TaskList tasks={todayTasks} onComplete={completeTask} grouped />
                </>
              ) : (
                <div className="quest-hub-no-tasks">
                  <span>✨</span>
                  <p>No tasks due today. Check back tomorrow!</p>
                </div>
              )
            ) : (
              <div className="quest-daily-locked">
                <div className="quest-daily-locked-icon">🔒</div>
                <h3>Daily Quests Locked</h3>
                <p>Complete all 3 Main Quest steps to unlock your daily care routine.</p>
                <button
                  className="quest-daily-locked-btn"
                  onClick={() => setActiveTab('main')}
                >
                  Go to Main Quest →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
