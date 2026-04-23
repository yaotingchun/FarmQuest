'use client'

import { useState, useEffect } from 'react'
import { useQuest } from '@/lib/QuestContext'
import { CalendarGrid } from '@/components/quest/CalendarGrid'
import Link from 'next/link'

export default function CalendarPage() {
  const { calendarData, refreshCalendar, hasActivePlant, userPlants } = useQuest()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  useEffect(() => {
    if (hasActivePlant) {
      refreshCalendar(year, month)
    }
  }, [year, month, hasActivePlant, refreshCalendar, userPlants])

  const handleMonthChange = (y: number, m: number) => {
    setYear(y)
    setMonth(m)
  }

  if (!hasActivePlant) {
    return (
      <div className="quest-page quest-empty">
        <div className="quest-empty-icon">📅</div>
        <h2>No Active Quest</h2>
        <p>Select a plant from the <Link href="/quest" className="quest-link">Quest Hub</Link> to see your calendar.</p>
      </div>
    )
  }

  // Calendar stats
  const completedCount = calendarData.filter(d => d.statuses.includes('completed')).length
  const pendingCount = calendarData.filter(d => d.statuses.includes('pending')).length

  return (
    <div className="quest-page quest-calendar-page">
      <div className="quest-calendar-header">
        <h1>Care Calendar</h1>
        <p className="quest-calendar-desc">Track your daily plant care progress</p>
      </div>

      {/* Monthly Stats */}
        <div className="quest-cal-stats">
          <div className="quest-cal-stat">
            <span className="quest-cal-stat-num" style={{ color: 'var(--accent)' }}>{completedCount}</span>
            <span className="quest-cal-stat-label">Completed</span>
          </div>
          <div className="quest-cal-stat">
            <span className="quest-cal-stat-num" style={{ color: '#fbbf24' }}>{pendingCount}</span>
            <span className="quest-cal-stat-label">Pending</span>
          </div>
        </div>

      <CalendarGrid
        entries={calendarData}
        year={year}
        month={month}
        onMonthChange={handleMonthChange}
      />
    </div>
  )
}
