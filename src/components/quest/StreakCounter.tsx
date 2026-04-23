'use client'

interface StreakCounterProps {
  count: number
  best: number
}

export function StreakCounter({ count, best }: StreakCounterProps) {
  return (
    <div className="quest-streak">
      <div className="quest-streak-fire">
        <span className="quest-streak-emoji">🔥</span>
        <span className="quest-streak-count">{count}</span>
      </div>
      <div className="quest-streak-labels">
        <span className="quest-streak-label">Day Streak</span>
        <span className="quest-streak-best">Best: {best}</span>
      </div>
    </div>
  )
}
