'use client'

import type { Quest } from '@/types/quest'

interface QuestCardProps {
  quest: Quest
  index: number
  onComplete: (quest: Quest) => void
}

export function QuestCard({ quest, index, onComplete }: QuestCardProps) {
  const isLocked = quest.status === 'locked'
  const isActive = quest.status === 'active'
  const isCompleted = quest.status === 'completed'

  return (
    <div className={`quest-main-card ${quest.status}`}>
      {/* Status indicator */}
      <div className="quest-main-card-status">
        <div className={`quest-status-dot ${quest.status}`}>
          {isCompleted && '✓'}
          {isLocked && '🔒'}
          {isActive && <span className="quest-active-pulse" />}
        </div>
        {index < 2 && <div className={`quest-status-line ${isCompleted ? 'filled' : ''}`} />}
      </div>

      <div className="quest-main-card-body">
        <div className="quest-main-card-header">
          <div>
            <div className="quest-main-card-step">Quest {index + 1}</div>
            <h3 className="quest-main-card-title">{quest.title}</h3>
          </div>
          <div className="quest-main-card-xp">+{quest.xp_reward} XP</div>
        </div>

        <p className="quest-main-card-desc">{quest.description}</p>

        {!isLocked && (
          <div className="quest-main-card-tasks">
            {quest.tasks.map((task, i) => (
              <div key={task.id} className={`quest-main-task ${task.completed ? 'done' : ''}`}>
                <div className={`quest-main-task-check ${task.completed ? 'checked' : ''}`}>
                  {task.completed ? '✓' : i + 1}
                </div>
                <span>{task.label}</span>
              </div>
            ))}
          </div>
        )}

        {isActive && quest.isActionable && (
          <button
            className="quest-main-complete-btn"
            onClick={() => onComplete(quest)}
          >
            Complete Quest →
          </button>
        )}

        {isCompleted && (
          <div className="quest-main-completed-badge">
            ✅ Completed
          </div>
        )}
      </div>
    </div>
  )
}
