'use client'

import type { QuestTask, TaskCategory } from '@/types/quest'

const CATEGORY_CONFIG: Record<TaskCategory, { emoji: string; label: string; color: string }> = {
  care: { emoji: '💧', label: 'Care', color: '#38bdf8' },
  growth: { emoji: '🌱', label: 'Growth', color: '#4ade80' },
  observation: { emoji: '👁️', label: 'Observe', color: '#a78bfa' },
}

interface TaskListProps {
  tasks: QuestTask[]
  onComplete: (taskId: string) => void
  grouped?: boolean
  readOnly?: boolean
}

export function TaskList({ tasks, onComplete, grouped = false, readOnly = false }: TaskListProps) {
  if (!grouped) {
    return (
      <div className="quest-task-list">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} onComplete={onComplete} readOnly={readOnly} />
        ))}
      </div>
    )
  }

  // Grouped by category
  const categories: TaskCategory[] = ['care', 'growth', 'observation']
  return (
    <div className="quest-task-groups">
      {categories.map(cat => {
        const catTasks = tasks.filter(t => t.category === cat)
        if (catTasks.length === 0) return null
        const cfg = CATEGORY_CONFIG[cat]
        return (
          <div key={cat} className="quest-task-group">
            <div className="quest-task-group-header">
              <span className="quest-task-group-emoji">{cfg.emoji}</span>
              <span className="quest-task-group-label" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="quest-task-group-count">
                {catTasks.filter(t => t.completed).length}/{catTasks.length}
              </span>
            </div>
            {catTasks.map(task => (
              <TaskItem key={task.id} task={task} onComplete={onComplete} readOnly={readOnly} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function TaskItem({ task, onComplete, readOnly = false }: { task: QuestTask; onComplete: (id: string) => void; readOnly?: boolean }) {
  const cfg = CATEGORY_CONFIG[task.category]
  return (
    <div
      className={`quest-task-item ${task.completed ? 'completed' : ''}`}
      onClick={() => !task.completed && !readOnly && onComplete(task.id)}
      style={{ cursor: task.completed || readOnly ? 'default' : 'pointer', opacity: readOnly && !task.completed ? 0.78 : 1 }}
    >
      <div className={`quest-task-check ${task.completed ? 'checked' : ''}`}>
        {task.completed && <span>✓</span>}
      </div>
      <div className="quest-task-content">
        <span className="quest-task-label">{task.label}</span>
        <div className="quest-task-meta">
          <span className="quest-task-cat-badge" style={{ background: `${cfg.color}20`, color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="quest-task-xp">+{task.xp_reward} XP</span>
        </div>
      </div>
    </div>
  )
}
