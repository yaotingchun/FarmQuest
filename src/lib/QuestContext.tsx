'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { PlantState, QuestTask, CalendarEntry, Badge, Quest, QuestPlantData, GrowthStage } from '@/types/quest'
import { calculateLevel, xpForNextLevel, XP_VALUES } from '@/types/quest'
import {
  createInitialPlantState, getTasksDueToday, calculateGrowthStage,
  shouldTriggerRecovery, generateCalendarMonth, checkBadges,
  calculateStreak, updateHealth, updateHydration, awardXP
} from './ruleEngine'
import { getMainQuestContent } from './orchestrator'
import { getQuestPlant, QUEST_PLANTS } from '@/data/quest-plants'

const STORAGE_KEY = 'fq_plant_state'
const TASKS_KEY = 'fq_today_tasks'

interface QuestContextValue {
  // State
  plantState: PlantState | null
  plantData: QuestPlantData | null
  todayTasks: QuestTask[]
  calendarData: CalendarEntry[]
  badges: Badge[]
  mainQuests: Quest[]
  hasActivePlant: boolean

  // Actions
  selectPlant: (plantId: string) => void
  completeTask: (taskId: string) => void
  completeMainQuestStep: (stepIndex: number) => void
  completeAllDailyTasks: () => void
  refreshCalendar: (year: number, month: number) => void
  resetQuest: () => void

  // Derived
  xpInfo: { current: number; needed: number; progress: number }
  currentStage: GrowthStage
  streakCount: number
  isRecoveryNeeded: boolean
  availablePlants: QuestPlantData[]
}

const QuestContext = createContext<QuestContextValue | null>(null)

export function useQuest() {
  const ctx = useContext(QuestContext)
  if (!ctx) throw new Error('useQuest must be used within QuestProvider')
  return ctx
}

function loadState(): PlantState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveState(state: PlantState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function loadTasks(): QuestTask[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    const todayStr = new Date().toISOString().split('T')[0]
    if (data.date !== todayStr) return [] // stale tasks
    return data.tasks
  } catch { return [] }
}

function saveTasks(tasks: QuestTask[]) {
  if (typeof window === 'undefined') return
  const todayStr = new Date().toISOString().split('T')[0]
  localStorage.setItem(TASKS_KEY, JSON.stringify({ date: todayStr, tasks }))
}

export function QuestProvider({ children }: { children: ReactNode }) {
  const [plantState, setPlantState] = useState<PlantState | null>(null)
  const [todayTasks, setTodayTasks] = useState<QuestTask[]>([])
  const [calendarData, setCalendarData] = useState<CalendarEntry[]>([])
  const [mounted, setMounted] = useState(false)

  const plantData = plantState ? getQuestPlant(plantState.plant_id) ?? null : null

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      setPlantState(saved)
      const savedTasks = loadTasks()
      if (savedTasks.length > 0) {
        setTodayTasks(savedTasks)
      } else if (saved.daily_unlocked) {
        const plant = getQuestPlant(saved.plant_id)
        if (plant) {
          const tasks = getTasksDueToday(saved, plant)
          setTodayTasks(tasks)
          saveTasks(tasks)
        }
      }
    }
    setMounted(true)
  }, [])

  // Auto-save state changes
  useEffect(() => {
    if (mounted && plantState) {
      saveState(plantState)
    }
  }, [plantState, mounted])

  // ── Select a new plant and start quest ──
  const selectPlant = useCallback((plantId: string) => {
    const plant = getQuestPlant(plantId)
    if (!plant) return
    const state = createInitialPlantState(plantId, plant.name)
    setPlantState(state)
    setTodayTasks([])
    setCalendarData([])
    saveState(state)
  }, [])

  // ── Complete a daily task ──
  const completeTask = useCallback((taskId: string) => {
    setTodayTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, completed: true } : t)
      saveTasks(updated)

      // Award XP
      const task = prev.find(t => t.id === taskId)
      if (task && !task.completed && plantState) {
        setPlantState(ps => {
          if (!ps) return ps
          let newXP = ps.total_xp + task.xp_reward
          let newState = { ...ps, total_xp: newXP, current_level: calculateLevel(newXP) }

          // Update water/fertilize/prune tracking
          if (taskId.startsWith('water-')) {
            newState.last_watered = new Date().toISOString().split('T')[0]
            newState.hydration = Math.min(100, ps.hydration + 30)
          }
          if (taskId.startsWith('fertilize-')) {
            newState.last_fertilized = new Date().toISOString().split('T')[0]
          }
          if (taskId.startsWith('prune-')) {
            newState.last_pruned = new Date().toISOString().split('T')[0]
          }

          // Check if all tasks done
          const allDone = updated.every(t => t.completed)
          if (allDone) {
            const todayStr = new Date().toISOString().split('T')[0]
            if (!newState.completed_dates.includes(todayStr)) {
              newState.completed_dates = [...newState.completed_dates, todayStr]
              newState.total_xp += XP_VALUES.ALL_DAILY_COMPLETE
              newState.current_level = calculateLevel(newState.total_xp)
            }
            const streak = calculateStreak(newState.completed_dates)
            newState.streak_count = streak
            if (streak > newState.longest_streak) {
              newState.longest_streak = streak
              if (streak === 7) {
                newState.total_xp += XP_VALUES.STREAK_7
                newState.current_level = calculateLevel(newState.total_xp)
              }
            }
            newState.health = updateHealth(newState, true)
            if (newState.recovery_active) {
              newState.recovery_active = false
              newState.total_xp += XP_VALUES.RECOVERY_COMPLETE
              newState.current_level = calculateLevel(newState.total_xp)
            }
          }

          // Check growth stage transition
          if (plantData) {
            const newStage = calculateGrowthStage(newState, plantData)
            if (newStage !== newState.current_stage) {
              newState.current_stage = newStage
              newState.stage_transitions = [
                ...newState.stage_transitions,
                { stage: newStage, date: new Date().toISOString().split('T')[0] }
              ]
              newState.total_xp += XP_VALUES.GROWTH_MILESTONE
              newState.current_level = calculateLevel(newState.total_xp)
            }
            newState.hydration = updateHydration(newState, plantData)
          }

          // Update health log
          const todayStr = new Date().toISOString().split('T')[0]
          const existing = newState.daily_health_log.find(d => d.date === todayStr)
          if (!existing) {
            newState.daily_health_log = [
              ...newState.daily_health_log,
              { date: todayStr, health: newState.health }
            ]
          }

          return newState
        })
      }

      return updated
    })
  }, [plantState, plantData])

  // ── Complete a Main Quest step ──
  const completeMainQuestStep = useCallback((stepIndex: number) => {
    setPlantState(ps => {
      if (!ps) return ps
      if (stepIndex !== ps.main_quest_step) return ps // must complete in order

      const newStep = stepIndex + 1
      let newXP = ps.total_xp + XP_VALUES.MAIN_QUEST_STEP
      const newState: PlantState = {
        ...ps,
        main_quest_step: newStep,
        total_xp: newXP,
        current_level: calculateLevel(newXP),
      }

      // After step 3 (index 2), unlock daily quests
      if (newStep >= 3) {
        newState.daily_unlocked = true
        // Generate initial daily tasks
        if (plantData) {
          const tasks = getTasksDueToday(newState, plantData)
          setTodayTasks(tasks)
          saveTasks(tasks)
        }
      }

      return newState
    })
  }, [plantData])

  // ── Complete all daily tasks at once ──
  const completeAllDailyTasks = useCallback(() => {
    todayTasks.forEach(t => {
      if (!t.completed) completeTask(t.id)
    })
  }, [todayTasks, completeTask])

  // ── Refresh calendar for a month ──
  const refreshCalendar = useCallback((year: number, month: number) => {
    if (!plantState || !plantData) return
    const entries = generateCalendarMonth(plantState, plantData, year, month)
    setCalendarData(entries)
  }, [plantState, plantData])

  // ── Reset quest ──
  const resetQuest = useCallback(() => {
    setPlantState(null)
    setTodayTasks([])
    setCalendarData([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(TASKS_KEY)
    }
  }, [])

  // ── Derived values ──
  const currentStage: GrowthStage = plantState && plantData
    ? calculateGrowthStage(plantState, plantData)
    : 'seed'

  const badges = plantState ? checkBadges(plantState) : []
  const xpInfo = plantState ? xpForNextLevel(plantState.total_xp) : { current: 0, needed: 100, progress: 0 }
  const streakCount = plantState ? plantState.streak_count : 0
  const isRecoveryNeeded = plantState ? shouldTriggerRecovery(plantState) : false

  // Build main quests from current state
  const mainQuests: Quest[] = plantState ? (() => {
    const templates = getMainQuestContent(plantState.plant_name)
    return templates.map((t, i) => ({
      id: `main-${i}`,
      type: 'main' as const,
      title: t.title,
      description: t.description,
      tasks: t.tasks.map((label, j) => ({
        id: `main-${i}-task-${j}`,
        label,
        completed: plantState.main_quest_step > i,
        due_date: plantState.quest_started_at,
        category: 'care' as const,
        xp_reward: 10,
      })),
      xp_reward: XP_VALUES.MAIN_QUEST_STEP,
      status: (plantState.main_quest_step > i ? 'completed' :
        plantState.main_quest_step === i ? 'active' : 'locked') as 'completed' | 'active' | 'locked',
    }))
  })() : []

  return (
    <QuestContext.Provider value={{
      plantState,
      plantData,
      todayTasks,
      calendarData,
      badges,
      mainQuests,
      hasActivePlant: !!plantState,
      selectPlant,
      completeTask,
      completeMainQuestStep,
      completeAllDailyTasks,
      refreshCalendar,
      resetQuest,
      xpInfo,
      currentStage,
      streakCount,
      isRecoveryNeeded,
      availablePlants: QUEST_PLANTS,
    }}>
      {children}
    </QuestContext.Provider>
  )
}
