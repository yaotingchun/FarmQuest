'use client'

import { useState, useEffect } from 'react'
import type { CalendarEntry, DayStatus } from '@/types/quest'

const STATUS_COLORS: Record<DayStatus, string> = {
  completed: '#4ade80',
  pending: '#facc15',
  missed: '#f87171',
  critical: '#dc2626',
  milestone: '#a78bfa',
}

const STATUS_LABELS: Record<DayStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  missed: 'Missed',
  critical: 'Critical',
  milestone: 'Milestone',
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

  const todayStr = new Date().toISOString().split('T')[0]

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
  }

  return (
    <div className="quest-calendar">
      {/* Month header */}
      <div className="quest-cal-header">
        <button className="quest-cal-nav" onClick={prevMonth}>←</button>
        <div className="quest-cal-month-info">
          <h3 className="quest-cal-month">{MONTH_NAMES[month]} {year}</h3>
          <button className="quest-cal-today-btn" onClick={goToday}>Today</button>
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
          const status = entry?.day_status
          const isToday = dateStr === todayStr
          const hasTasks = entry && entry.tasks.length > 0
          const isMilestone = status === 'milestone'

          return (
            <div
              key={day}
              className={`quest-cal-cell ${isToday ? 'today' : ''} ${status || ''} ${hasTasks ? 'has-tasks' : ''}`}
              onClick={() => entry && setSelectedDay(entry)}
            >
              <span className="quest-cal-day-num">{day}</span>
              {hasTasks && status && (
                <div
                  className="quest-cal-dot"
                  style={{ background: STATUS_COLORS[status] }}
                />
              )}
              {isMilestone && <span className="quest-cal-milestone-icon">⭐</span>}
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

          {selectedDay.milestone_label && (
            <div className="quest-cal-milestone-banner">
              🎉 {selectedDay.milestone_label}
            </div>
          )}

          <div className="quest-cal-detail-status">
            <div
              className="quest-cal-legend-dot"
              style={{ background: STATUS_COLORS[selectedDay.day_status] }}
            />
            <span>{STATUS_LABELS[selectedDay.day_status]}</span>
          </div>

          {selectedDay.tasks.length > 0 ? (
            <div className="quest-cal-detail-tasks">
              {selectedDay.tasks.map(task => (
                <div key={task.id} className={`quest-cal-detail-task ${task.completed ? 'done' : ''}`}>
                  <span className={`quest-cal-task-check ${task.completed ? 'checked' : ''}`}>
                    {task.completed ? '✓' : '○'}
                  </span>
                  <span>{task.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="quest-cal-no-tasks">No tasks scheduled for this day.</p>
          )}
        </div>
      )}
    </div>
  )
}
