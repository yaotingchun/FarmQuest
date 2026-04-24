import { Timestamp } from 'firebase/firestore'
import type {
  UserPlant,
  QuestPlantData,
  QuestTask,
  GrowthStage,
  UserPlantState
} from '@/types/quest'
import { XP_VALUES } from '@/types/quest'

// ── Time & Date Helpers ──

/**
 * Calculates absolute full days since a Firestore Timestamp,
 * ignoring timezones and local clock drift.
 */
export function daysSince(timestamp: any): number {
  if (!timestamp) return 999 // Large number defaults to "needs attention immediately"
  
  let then: number
  if (typeof timestamp.toDate === 'function') {
    then = timestamp.toDate().getTime()
  } else if (timestamp instanceof Date) {
    then = timestamp.getTime()
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    then = new Date(timestamp).getTime()
  } else if (timestamp._seconds) {
    // Handle plain object serialization of Timestamp
    then = timestamp._seconds * 1000
  } else {
    return 999
  }

  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

// ── Deterministic Growth Stages ──

export function getGrowthStage(xp: number): GrowthStage {
  if (xp >= 300) return 3 // Harvest
  if (xp >= 150) return 2 // Mature
  if (xp >= 50) return 1  // Sprout
  return 0                // Seed
}

export function calculateLevel(totalXP: number): number {
  let level = 1
  let threshold = 0
  while (threshold + level * 100 <= totalXP) {
    threshold += level * 100
    level++
  }
  return level
}

export function xpForNextLevel(totalXP: number): { current: number; needed: number; progress: number } {
  let level = 1
  let threshold = 0
  while (threshold + level * 100 <= totalXP) {
    threshold += level * 100
    level++
  }
  const current = totalXP - threshold
  const needed = level * 100
  return { current, needed, progress: Math.min(100, Math.max(0, Math.round((current / needed) * 100))) }
}

// ── Lifecycle Decay & Status Derivation ──

const HEALTH_DECAY_RATE = 5 // Base health drop per neglected day

export interface DecayResult {
  hasUpdates: boolean
  updatedState?: UserPlantState
  newCheckedAt?: Timestamp
  status?: "healthy" | "dead"
}

/**
 * Derives the new health and hydration based on exact days elapsed since last check.
 * This is Idempotent: multiple calls on the same day return hasUpdates=false.
 */
export function derivePlantStatus(plant: UserPlant, plantData: QuestPlantData): DecayResult {
  if (plant.status === "dead") {
    return { hasUpdates: false }
  }

  const daysElapsed = daysSince(plant.last_checked_at)
  
  if (daysElapsed < 1) {
    // Stage update check (in case XP changed during a task but stage was missed)
    const expectedStage = getGrowthStage(plant.state.xp)
    if (expectedStage !== plant.state.growthStage) {
      return {
        hasUpdates: true,
        updatedState: { ...plant.state, growthStage: expectedStage }
      }
    }
    return { hasUpdates: false }
  }

  // Hydration decay is proportional to watering frequency
  // "medium" water=3 days -> drops ~33.3% per day -> dead in 3 days without water
  const hydrationDecayPerDay = 100 / plantData.water_frequency_days
  const totalHydrationDecay = daysElapsed * hydrationDecayPerDay
  
  const totalHealthDecay = daysElapsed * HEALTH_DECAY_RATE

  const newHydration = Math.max(0, plant.state.hydration - totalHydrationDecay)
  
  // Health only heavily decays if hydration is 0
  let actualHealthDecay = totalHealthDecay
  if (newHydration <= 0) {
    actualHealthDecay += (daysElapsed * 15) // Severe penalty for being completely dry
  }

  const newHealth = Math.max(0, plant.state.health - actualHealthDecay)

  const newState: UserPlantState = {
    ...plant.state,
    health: newHealth,
    hydration: newHydration,
    growthStage: getGrowthStage(plant.state.xp)
  }

  return {
    hasUpdates: true,
    updatedState: newState,
    newCheckedAt: Timestamp.now(),
    status: newHealth <= 0 ? "dead" : "healthy",
  }
}

// ── Task Generation ──

/**
 * Dynamically infers tasks due today based on static intervals and dynamic timestamps.
 * NEVER stored in Firestore.
 */
export function getTasksDueToday(plant: UserPlant, plantData: QuestPlantData): QuestTask[] {
  if (plant.status === "dead") return []

  const tasks: QuestTask[] = []
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  
  // Helper to check if task was done today via completion_log
  const completionLog = (plant.task_state?.completion_log || {}) as Record<string, Array<{ id: string; label?: string }>>
  const doneToday = (taskId: string) => (completionLog[todayKey] || []).some(item => item.id === taskId || item.id.startsWith(taskId + '-'))

  // Water Task
  const daysSinceWater = daysSince(plant.task_state.lastWateredAt)
  const isWaterDone = doneToday('water')
  if (daysSinceWater >= plantData.water_frequency_days || isWaterDone) {
    tasks.push({
      id: `water-${plant.id}`,
      label: `Water your ${plantData.name}`,
      completed: isWaterDone,
      category: 'care',
      xp_reward: XP_VALUES.WATER,
    })
  }

  const stage = plant.state.growthStage

  // Fertilize Task
  if (stage >= 1) { // Sprout or higher
    const daysSinceFertilize = daysSince(plant.task_state.lastFertilizedAt)
    const isFertilizeDone = doneToday('fertilize')
    if (daysSinceFertilize >= plantData.fertilize_interval_days || isFertilizeDone) {
      tasks.push({
        id: `fertilize-${plant.id}`,
        label: `Fertilize your ${plantData.name}`,
        completed: isFertilizeDone,
        category: 'growth',
        xp_reward: XP_VALUES.FERTILIZE,
      })
    }
  }

  // Prune/Maintenance (Using prune_interval_days)
  if (stage >= 2) { 
    const isPruneDone = doneToday('prune')
    // Tie to fertilize interval for now if lastPrunedAt missing, or check log
    if (daysSince(plant.task_state.lastFertilizedAt) >= plantData.prune_interval_days || isPruneDone) {
        tasks.push({
            id: `prune-${plant.id}`,
            label: `Prune and maintain ${plantData.name}`,
            completed: isPruneDone,
            category: 'care',
            xp_reward: XP_VALUES.PRUNE,
        })
    }
  }

  // Daily Observation Task
  const isObserveDone = doneToday('observe')
  tasks.push({
    id: `observe-${plant.id}`,
    label: `Check ${plantData.name} leaves & soil`,
    completed: isObserveDone,
    category: 'observation',
    xp_reward: XP_VALUES.OBSERVE,
  })

  return tasks
}

export function getAllTasksDueToday(userPlants: UserPlant[], getPlantData: (id: string) => QuestPlantData | undefined) {
    const allTasks: { plant: UserPlant, task: QuestTask, plantData: QuestPlantData }[] = []
    
    for (const plant of userPlants) {
        const data = getPlantData(plant.plant_id)
        if (data && plant.status !== "dead") {
            const tasks = getTasksDueToday(plant, data)
            tasks.forEach(t => allTasks.push({ plant, task: t, plantData: data }))
        }
    }
    
    return allTasks
}
