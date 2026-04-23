// ── Growth Stages ──
export type GrowthStage = 'seed' | 'sprout' | 'mature' | 'harvest'

// ── Task Categories ──
export type TaskCategory = 'care' | 'growth' | 'observation'

// ── Quest Types ──
export type QuestType = 'main' | 'daily'
export type QuestStatus = 'locked' | 'active' | 'completed'

// ── Calendar Day Status ──
export type DayStatus = 'completed' | 'pending' | 'missed' | 'critical' | 'milestone'

// ── Task ──
export interface QuestTask {
  id: string
  label: string
  completed: boolean
  due_date: string          // ISO date string
  category: TaskCategory
  xp_reward: number
}

// ── Quest ──
export interface Quest {
  id: string
  type: QuestType
  title: string
  description: string
  tasks: QuestTask[]
  xp_reward: number         // bonus XP for completing entire quest
  status: QuestStatus
}

// ── Plant State ──
export interface PlantState {
  plant_id: string
  plant_name: string
  current_stage: GrowthStage
  hydration: number          // 0-100
  health: number             // 0-100
  last_watered: string       // ISO date
  streak_count: number
  longest_streak: number
  total_xp: number
  current_level: number
  quest_started_at: string   // ISO date — when Main Quest began
  daily_unlocked: boolean    // true after Main Quest complete
  main_quest_step: number    // 0, 1, 2, or 3 (completed)
  completed_dates: string[]  // ISO dates where all tasks were completed
  missed_dates: string[]     // ISO dates where tasks were missed
  last_fertilized: string    // ISO date
  last_pruned: string        // ISO date
  stage_transitions: { stage: GrowthStage; date: string }[]
  recovery_active: boolean
  daily_health_log: { date: string; health: number }[]
}

// ── Calendar Entry ──
export interface CalendarEntry {
  date: string               // ISO date  YYYY-MM-DD
  tasks: QuestTask[]
  day_status: DayStatus
  milestone_label?: string   // e.g. "First Sprout!", "Harvest Day!"
}

// ── Badge ──
export interface Badge {
  id: string
  label: string
  description: string
  icon: string               // emoji
  color: string
  unlocked: boolean
  unlocked_date?: string
}

// ── Quest Plant Data (knowledge base) ──
export interface QuestPlantData {
  plant_id: string
  name: string
  emoji: string
  water_frequency_days: number
  sunlight_type: string
  fertilize_interval_days: number
  prune_interval_days: number
  risk_factors: string[]
  growth_stages: {
    seed: { duration_days: number; description: string }
    sprout: { duration_days: number; description: string }
    mature: { duration_days: number; description: string }
    harvest: { duration_days: number; description: string }
  }
  pot_size: string
  seed_depth_cm: number
  soil_type: string
}

// ── XP Config ──
export const XP_VALUES = {
  WATER: 10,
  FERTILIZE: 20,
  OBSERVE: 5,
  PRUNE: 15,
  ALL_DAILY_COMPLETE: 50,
  STREAK_7: 75,
  GROWTH_MILESTONE: 100,
  MAIN_QUEST_STEP: 30,
  RECOVERY_COMPLETE: 40,
} as const

// ── Level Thresholds ──
export function calculateLevel(totalXP: number): number {
  // Each level requires more XP: level N needs N*100 XP total
  // Level 1: 0, Level 2: 100, Level 3: 300, Level 4: 600...
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
  return { current, needed, progress: Math.round((current / needed) * 100) }
}

// ── LLM Quest Content (output format) ──
export interface LLMQuestContent {
  title: string
  description: string
  tasks: string[]
}
