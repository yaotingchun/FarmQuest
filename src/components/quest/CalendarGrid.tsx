'use client'

import { useState, useEffect } from 'react'
import type { CalendarEntry, DayStatus } from '@/types/quest'

const STATUS_COLORS: Record<string, string> = {
  completed: '#4ade80',
  pending: '#fbbf24',
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  pending: 'Pending',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarGridProps {
  entries: CalendarEntry[]
  year: number
  month: number
  onMonthChange: (year: number, month: number) => void
}

export function CalendarGrid({ entries, year, month, onMonthChange }: CalendarGridProps) {
  const [selectedDay, setSelectedDay] = useState<CalendarEntry | null>(null)

  const groupedTasks = selectedDay?.tasks.reduce<Record<string, typeof selectedDay.tasks>>((acc, task) => {
    const group = task.plant_name || 'General'
    if (!acc[group]) acc[group] = []
    acc[group].push(task)
    return acc
  }, {}) || {}

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Build grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => {
    if (month === 0) onMonthChange(year - 1, 11)
    else onMonthChange(year, month - 1)
  }

  const nextMonth = () => {
    if (month === 11) onMonthChange(year + 1, 0)
    else onMonthChange(year, month + 1)
  }

  const goToday = () => {
    const d = new Date()
    onMonthChange(d.getFullYear(), d.getMonth())
    
    // Auto-select today if it exists in current entries
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const todayEntry = entries.find(e => e.date === todayStr)
    if (todayEntry) {
      setSelectedDay(todayEntry)
    }
  }

  // Effect to auto-select today on first load if we are in today's month
  useEffect(() => {
    if (!selectedDay) {
      const d = new Date()
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const entry = entries.find(e => e.date === todayStr)
      if (entry) setSelectedDay(entry)
    }
  }, [entries, selectedDay])

  return (
    <div className="quest-calendar">
      {/* Month header */}
      <div className="quest-cal-header">
        <button className="quest-cal-nav" onClick={prevMonth}>←</button>
        <div className="quest-cal-month-info">
          <h3 className="quest-cal-month">{MONTH_NAMES[month]} {year}</h3>
          <button className="quest-cal-today-btn" onClick={goToday}>
            Today
          </button>
        </div>
        <button className="quest-cal-nav" onClick={nextMonth}>→</button>
      </div>

      {/* Legend */}
      <div className="quest-cal-legend">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="quest-cal-legend-item">
            <div className="quest-cal-legend-dot" style={{ background: color }} />
            <span>{STATUS_LABELS[status as DayStatus]}</span>
          </div>
        ))}
      </div>

      {/* Day names */}
      <div className="quest-cal-daynames">
        {DAY_NAMES.map(d => (
          <div key={d} className="quest-cal-dayname">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="quest-cal-grid">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="quest-cal-cell empty" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const entry = entries.find(e => e.date === dateStr)
          const statuses = entry?.statuses || []
          const isToday = dateStr === todayStr
          const hasTasks = entry && entry.tasks.length > 0

          return (
            <div
              key={day}
              className={`quest-cal-cell ${isToday ? 'today' : ''} ${hasTasks ? 'has-tasks' : ''}`}
              onClick={() => entry && setSelectedDay(entry)}
            >
              <span className="quest-cal-day-num">{day}</span>
              {hasTasks && statuses.length > 0 && (
                <div className="quest-cal-dots">
                  {statuses
                    .filter(s => s !== 'milestone')
                    .map(s => (
                    <div
                      key={s}
                      className="quest-cal-dot"
                      style={{ background: STATUS_COLORS[s] }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="quest-cal-detail">
          <div className="quest-cal-detail-header">
            <h4>{new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric'
            })}</h4>
            <button className="quest-cal-detail-close" onClick={() => setSelectedDay(null)}>✕</button>
          </div>

          <div className="quest-cal-detail-status">
            {selectedDay.statuses
              .filter(s => s !== 'milestone')
              .map(s => (
              <div key={s} className="quest-cal-detail-status-pill">
                <div
                  className="quest-cal-legend-dot"
                  style={{ background: STATUS_COLORS[s] }}
                />
                <span>{STATUS_LABELS[s]}</span>
              </div>
            ))}
          </div>

          {selectedDay.tasks.length > 0 ? (
            <div className="quest-cal-detail-tasks">
              {/* 1. Pending Section */}
              {selectedDay.tasks.some(t => !t.completed) && (
                <div className="quest-cal-status-group">
                  <h5 className="quest-cal-group-status-title">Pending Tasks</h5>
                  {Object.entries(groupedTasks).map(([plantName, plantTasks]) => {
                    const pending = plantTasks.filter(t => !t.completed)
                    if (pending.length === 0) return null
                    return (
                      <div key={plantName} className="quest-cal-plant-subgroup">
                        <span className="quest-cal-plant-tag">{plantName}</span>
                        {pending.map(task => (
                          <div key={task.id} className="quest-cal-detail-task">
                            <span className="quest-cal-task-check">○</span>
                            <span>{task.label}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 2. Completed Section */}
              {selectedDay.tasks.some(t => t.completed) && (
                <div className="quest-cal-status-group completed">
                  <h5 className="quest-cal-group-status-title">Completed Tasks</h5>
                  {Object.entries(groupedTasks).map(([plantName, plantTasks]) => {
                    const completed = plantTasks.filter(t => t.completed)
                    if (completed.length === 0) return null
                    return (
                      <div key={plantName} className="quest-cal-plant-subgroup">
                        <span className="quest-cal-plant-tag">{plantName}</span>
                        {completed.map(task => (
                          <div key={task.id} className="quest-cal-detail-task done">
                            <span className="quest-cal-task-check checked">✓</span>
                            <span>{task.label}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="quest-cal-no-tasks">No tasks scheduled for this day.</p>
          )}
        </div>
      )}
    </div>
  )
}
