// ── Growth Stages ──
export type GrowthStage = 0 | 1 | 2 | 3 // 0=Seed, 1=Sprout, 2=Mature, 3=Harvest

// ── Task Categories ──
export type TaskCategory = 'care' | 'growth' | 'observation'

// ── Quest Types ──
export type QuestType = 'main' | 'daily'
export type QuestStatus = 'locked' | 'active' | 'completed'
export type PlantSourceCategory = 'chosen_plant' | 'posted_order' | 'accepted_order'

// ── Calendar Day Status ──
export type DayStatus = 'completed' | 'pending' | 'milestone'

// ── Task ──
export interface QuestTask {
  id: string
  label: string
  completed: boolean
  category: TaskCategory
  xp_reward: number
  plant_id?: string
  plant_name?: string
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
  isActionable?: boolean
}

import { Timestamp } from 'firebase/firestore';

export interface UserPlantState {
  growthStage: GrowthStage
  health: number             // 0-100
  hydration: number          // 0-100
  xp: number
}

export interface TaskState {
  lastWateredAt?: Timestamp
  lastFertilizedAt?: Timestamp
  [key: string]: any // Support for dynamic AI task completion tracking
}

export interface UserPlant {
  id: string
  plant_id: string
  plant_name: string

  created_at: Timestamp        // when plant was added
  updated_at: Timestamp        // last mutation
  last_checked_at: Timestamp   // last time system evaluated decay
  status: "healthy" | "dead"

  state: UserPlantState
  task_state: TaskState

  selected_plan_type?: "Budget" | "Balanced" | "Premium"
  source_category?: PlantSourceCategory
  shared_progress_key?: string
  ai_tasks?: {
    main: Quest[]
    daily: string[]
  }
  google_calendar_event_id?: string
}


// ── Calendar Entry ──
export interface CalendarEntry {
  date: string               // ISO date  YYYY-MM-DD
  tasks: QuestTask[]
  statuses: DayStatus[]
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
  startMethod: string
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

// ── LLM Quest Content (output format) ──
export interface LLMQuestContent {
  title: string
  description: string
  tasks: string[]
}
