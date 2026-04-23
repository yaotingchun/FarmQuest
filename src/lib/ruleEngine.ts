import type {
  PlantState, QuestTask, CalendarEntry, GrowthStage, DayStatus, Badge,
  QuestPlantData, XP_VALUES
} from '@/types/quest'
import { calculateLevel, XP_VALUES as XP } from '@/types/quest'

// ── Helpers ──
function today(): string {
  return new Date().toISOString().split('T')[0]
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ── Growth Stage Calculation ──
export function calculateGrowthStage(
  state: PlantState,
  plant: QuestPlantData
): GrowthStage {
  if (!state.daily_unlocked) return 'seed'

  const elapsed = daysBetween(state.quest_started_at, today())
  const completionRate = getCompletionRate(state)
  // Faster growth if completion rate is high (up to 20% faster)
  const speedBonus = 1 - (completionRate * 0.2)

  const seedEnd = Math.round(plant.growth_stages.seed.duration_days * speedBonus)
  const sproutEnd = seedEnd + Math.round(plant.growth_stages.sprout.duration_days * speedBonus)
  const matureEnd = sproutEnd + Math.round(plant.growth_stages.mature.duration_days * speedBonus)

  if (elapsed < seedEnd) return 'seed'
  if (elapsed < sproutEnd) return 'sprout'
  if (elapsed < matureEnd) return 'mature'
  return 'harvest'
}

function getCompletionRate(state: PlantState): number {
  const total = state.completed_dates.length + state.missed_dates.length
  if (total === 0) return 1
  return state.completed_dates.length / total
}

// ── Tasks Due Today ──
export function getTasksDueToday(
  state: PlantState,
  plant: QuestPlantData,
  date: string = today()
): QuestTask[] {
  if (!state.daily_unlocked) return []

  const tasks: QuestTask[] = []
  const stage = calculateGrowthStage(state, plant)

  // Care tasks
  const daysSinceWater = state.last_watered ? daysBetween(state.last_watered, date) : 999
  if (daysSinceWater >= plant.water_frequency_days) {
    tasks.push({
      id: `water-${date}`,
      label: `Water your ${plant.name}`,
      completed: false,
      due_date: date,
      category: 'care',
      xp_reward: XP.WATER,
    })
  }

  // Mist leaves (for humidity-loving plants, every 2 days)
  if (plant.risk_factors.includes('fungal growth') && daysSinceWater % 2 === 0) {
    tasks.push({
      id: `mist-${date}`,
      label: `Mist leaves for humidity`,
      completed: false,
      due_date: date,
      category: 'care',
      xp_reward: 5,
    })
  }

  // Rotate pot (every 3 days)
  const daysSinceStart = daysBetween(state.quest_started_at, date)
  if (daysSinceStart > 0 && daysSinceStart % 3 === 0) {
    tasks.push({
      id: `rotate-${date}`,
      label: `Rotate pot for even sunlight`,
      completed: false,
      due_date: date,
      category: 'care',
      xp_reward: 5,
    })
  }

  // Growth tasks
  if (stage !== 'seed') {
    const daysSinceFertilize = state.last_fertilized
      ? daysBetween(state.last_fertilized, date) : 999
    if (daysSinceFertilize >= plant.fertilize_interval_days) {
      tasks.push({
        id: `fertilize-${date}`,
        label: `Fertilize your ${plant.name}`,
        completed: false,
        due_date: date,
        category: 'growth',
        xp_reward: XP.FERTILIZE,
      })
    }
  }

  if (stage === 'mature' || stage === 'harvest') {
    const daysSincePrune = state.last_pruned
      ? daysBetween(state.last_pruned, date) : 999
    if (daysSincePrune >= plant.prune_interval_days) {
      tasks.push({
        id: `prune-${date}`,
        label: `Prune dead or overgrown leaves`,
        completed: false,
        due_date: date,
        category: 'growth',
        xp_reward: XP.PRUNE,
      })
    }
  }

  // Observation tasks (daily)
  tasks.push({
    id: `check-soil-${date}`,
    label: `Check soil moisture level`,
    completed: false,
    due_date: date,
    category: 'observation',
    xp_reward: XP.OBSERVE,
  })

  tasks.push({
    id: `inspect-${date}`,
    label: `Inspect leaves and soil for pests`,
    completed: false,
    due_date: date,
    category: 'observation',
    xp_reward: XP.OBSERVE,
  })

  tasks.push({
    id: `log-${date}`,
    label: `Log plant height or notable changes`,
    completed: false,
    due_date: date,
    category: 'observation',
    xp_reward: XP.OBSERVE,
  })

  return tasks
}

// ── Recovery Quest Check ──
export function shouldTriggerRecovery(state: PlantState): boolean {
  if (state.recovery_active) return false

  // Check consecutive missed days
  const sortedMissed = [...state.missed_dates].sort()
  if (sortedMissed.length >= 2) {
    const last = sortedMissed[sortedMissed.length - 1]
    const secondLast = sortedMissed[sortedMissed.length - 2]
    if (daysBetween(secondLast, last) === 1) return true
  }

  // Health below threshold
  if (state.health < 40) return true

  return false
}

// ── Calendar Schedule Generation ──
export function generateCalendarMonth(
  state: PlantState,
  plant: QuestPlantData,
  year: number,
  month: number
): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = today()

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // Only generate tasks for dates after quest started
    if (dateStr < state.quest_started_at || !state.daily_unlocked) {
      entries.push({ date: dateStr, tasks: [], day_status: 'pending' })
      continue
    }

    const tasks = getTasksDueToday(state, plant, dateStr)

    // For past dates, check completion
    let dayStatus: DayStatus = 'pending'
    if (dateStr < todayStr) {
      if (state.completed_dates.includes(dateStr)) {
        dayStatus = 'completed'
        tasks.forEach(t => t.completed = true)
      } else if (state.missed_dates.includes(dateStr)) {
        dayStatus = 'missed'
      }
    }

    // Check for milestone
    let milestoneLabel: string | undefined
    const transition = state.stage_transitions.find(t => t.date === dateStr)
    if (transition) {
      dayStatus = 'milestone'
      const labels: Record<GrowthStage, string> = {
        seed: 'Planted!',
        sprout: 'First Sprout! 🌱',
        mature: 'Fully Grown! 🌿',
        harvest: 'Harvest Day! 🎉',
      }
      milestoneLabel = labels[transition.stage]
    }

    // Check for critical (2+ missed in a row)
    if (dayStatus === 'missed') {
      const prevDate = addDays(dateStr, -1)
      if (state.missed_dates.includes(prevDate)) {
        dayStatus = 'critical'
      }
    }

    entries.push({ date: dateStr, tasks, day_status: dayStatus, milestone_label: milestoneLabel })
  }

  return entries
}

// ── Day Status Calculation ──
export function calculateDayStatus(entry: CalendarEntry): DayStatus {
  if (entry.milestone_label) return 'milestone'
  if (entry.tasks.length === 0) return 'pending'
  const allDone = entry.tasks.every(t => t.completed)
  if (allDone) return 'completed'
  return 'pending'
}

// ── XP Award ──
export function awardXP(action: keyof typeof XP): number {
  return XP[action]
}

// ── Streak Calculation ──
export function calculateStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0
  const sorted = [...completedDates].sort().reverse()
  const todayStr = today()
  let streak = 0

  for (let i = 0; i < sorted.length; i++) {
    const expected = addDays(todayStr, -i)
    if (sorted[i] === expected) {
      streak++
    } else if (i === 0 && sorted[i] === addDays(todayStr, -1)) {
      // Allow today to be incomplete (it's still ongoing)
      streak++
    } else {
      break
    }
  }

  return streak
}

// ── Badge Checks ──
export function checkBadges(state: PlantState): Badge[] {
  const badges: Badge[] = [
    {
      id: 'first_sprout',
      label: 'First Sprout',
      description: 'Your seed transitions to sprout stage',
      icon: '🌱',
      color: '#5ec482',
      unlocked: state.stage_transitions.some(t => t.stage === 'sprout'),
      unlocked_date: state.stage_transitions.find(t => t.stage === 'sprout')?.date,
    },
    {
      id: 'first_bloom',
      label: 'First Bloom',
      description: 'Reach the mature growth stage',
      icon: '🌸',
      color: '#a78bfa',
      unlocked: state.stage_transitions.some(t => t.stage === 'mature'),
      unlocked_date: state.stage_transitions.find(t => t.stage === 'mature')?.date,
    },
    {
      id: 'harvest_day',
      label: 'Harvest Day',
      description: 'Reach the final harvest stage',
      icon: '🌾',
      color: '#facc15',
      unlocked: state.stage_transitions.some(t => t.stage === 'harvest'),
      unlocked_date: state.stage_transitions.find(t => t.stage === 'harvest')?.date,
    },
    {
      id: 'streak_7',
      label: '7-Day Streak',
      description: 'Complete all tasks for 7 consecutive days',
      icon: '🔥',
      color: '#f97316',
      unlocked: state.longest_streak >= 7,
    },
    {
      id: 'plant_saved',
      label: 'Plant Saved',
      description: 'Complete a recovery quest successfully',
      icon: '💚',
      color: '#34d399',
      unlocked: state.recovery_active === false && state.missed_dates.length > 2
        && state.health > 60,
    },
    {
      id: 'green_thumb',
      label: 'Green Thumb',
      description: 'Maintain health above 80 for 14 days',
      icon: '👍',
      color: '#4ade80',
      unlocked: state.daily_health_log.filter(d => d.health >= 80).length >= 14,
    },
    {
      id: 'dedicated',
      label: 'Dedicated',
      description: 'Earn 500 total XP',
      icon: '⭐',
      color: '#60a5fa',
      unlocked: state.total_xp >= 500,
    },
    {
      id: 'expert',
      label: 'Expert Grower',
      description: 'Reach Level 10',
      icon: '🏆',
      color: '#fbbf24',
      unlocked: state.current_level >= 10,
    },
  ]

  return badges
}

// ── Create Initial Plant State ──
export function createInitialPlantState(plantId: string, plantName: string): PlantState {
  const todayStr = today()
  return {
    plant_id: plantId,
    plant_name: plantName,
    current_stage: 'seed',
    hydration: 70,
    health: 100,
    last_watered: todayStr,
    streak_count: 0,
    longest_streak: 0,
    total_xp: 0,
    current_level: 1,
    quest_started_at: todayStr,
    daily_unlocked: false,
    main_quest_step: 0,
    completed_dates: [],
    missed_dates: [],
    last_fertilized: '',
    last_pruned: '',
    stage_transitions: [{ stage: 'seed', date: todayStr }],
    recovery_active: false,
    daily_health_log: [{ date: todayStr, health: 100 }],
  }
}

/**
 * Simulate health changes based on care completion.
 * Called at end of day or when checking status.
 */
export function updateHealth(state: PlantState, tasksCompletedToday: boolean): number {
  let health = state.health
  if (tasksCompletedToday) {
    health = Math.min(100, health + 5)
  } else {
    health = Math.max(0, health - 10)
  }
  return health
}

export function updateHydration(state: PlantState, plant: QuestPlantData): number {
  const daysSince = state.last_watered ? daysBetween(state.last_watered, today()) : 999
  const ratio = daysSince / plant.water_frequency_days
  if (ratio <= 1) return Math.max(50, 100 - ratio * 30)
  return Math.max(0, 70 - (ratio - 1) * 25)
}
