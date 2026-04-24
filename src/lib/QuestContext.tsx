'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db } from './firebase'
import { useAuth } from '@/context/AuthContext'
import type { UserPlant, QuestPlantData, QuestTask, CalendarEntry, DayStatus } from '@/types/quest'
import { XP_VALUES } from '@/types/quest'
import { derivePlantStatus, getTasksDueToday, getGrowthStage } from './ruleEngine'
import { getQuestPlant, QUEST_PLANTS } from '@/data/quest-plants'
import { createCalendarEvent, deleteCalendarEvent, syncDailyTasksToGoogle } from '@/lib/googleCalendar'

interface QuestContextValue {
  userPlants: UserPlant[]
  activePlantId: string | null
  loading: boolean
  isGeneratingTasks: boolean
  availablePlants: QuestPlantData[]

  setActivePlant: (plantId: string | null) => void
  addPlant: (staticPlantId: string, planType?: "Budget" | "Balanced" | "Premium") => Promise<string | undefined>
  deletePlant: (instanceId: string) => Promise<void>
  completeTask: (instanceId: string, taskType: string) => Promise<void>
  
  // Calendar (Placeholder for now)
  calendarData: any[]
  refreshCalendar: (year: number, month: number) => void
  hasActivePlant: boolean
}

const QuestContext = createContext<QuestContextValue | null>(null)

export function useQuest() {
  const ctx = useContext(QuestContext)
  if (!ctx) throw new Error('useQuest must be used within QuestProvider')
  return ctx
}

export function QuestProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, accessToken, isGoogleUser } = useAuth()
  const [userPlants, setUserPlants] = useState<UserPlant[]>([])
  const [activePlantId, setActivePlantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false)
  const [calendarData, setCalendarData] = useState<CalendarEntry[]>([])
  const pendingActivePlantIdRef = React.useRef<string | null>(null)

  const getDailyTasksForPlant = useCallback((plant: UserPlant): QuestTask[] => {
    const plantData = getQuestPlant(plant.plant_id)
    if (!plantData || plant.status === 'dead') return []

    const aiMainCount = plant.ai_tasks?.main?.length || 0
    const aiSetupDone = aiMainCount > 0 && Array.from({ length: aiMainCount }).every((_, i) => !!plant.task_state?.[`main-${i}`])
    const fallbackSetupDone = !!plant.task_state?.intro && !!plant.task_state?.['intro-2'] && !!plant.task_state?.['intro-3']
    const isDailyUnlocked = aiMainCount > 0 ? aiSetupDone : fallbackSetupDone

    if (isDailyUnlocked && (plant.ai_tasks?.daily?.length || 0) > 0) {
      return plant.ai_tasks!.daily.map((label: string, i: number) => ({
        id: `daily-${i}`,
        label,
        completed: !!plant.task_state?.[`daily-${i}`],
        category: 'care',
        xp_reward: 10,
      }))
    }

    return getTasksDueToday(plant, plantData)
  }, [])

  const resolveTaskLabel = useCallback((plant: UserPlant, taskId: string): string => {
    const liveTask = getDailyTasksForPlant(plant).find((t) => t.id === taskId)
    if (liveTask) return liveTask.label

    if (taskId === 'intro') return 'Prepared area'
    if (taskId === 'intro-2') return 'Mixed soil'
    if (taskId === 'intro-3') return 'Sown seeds'

    if (taskId.startsWith('main-')) {
      const idx = parseInt(taskId.split('-')[1] || '0', 10)
      return plant.ai_tasks?.main?.[idx]?.title || `Main quest ${idx + 1}`
    }

    if (taskId.startsWith('daily-')) {
      const idx = parseInt(taskId.split('-')[1] || '0', 10)
      return plant.ai_tasks?.daily?.[idx] || `Daily task ${idx + 1}`
    }

    return taskId
  }, [getDailyTasksForPlant])

  const refreshCalendar = useCallback((year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const now = new Date()
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const entries: CalendarEntry[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isToday = dateKey === todayKey

      const tasks: QuestTask[] = []

      // 1. Add completed tasks from log for ALL days
      for (const plant of userPlants) {
        const completionLog = (plant.task_state?.completion_log || {}) as Record<string, Array<{ id: string; label?: string }>>
        const dayLog = completionLog[dateKey] || []
        for (const item of dayLog) {
          tasks.push({
            id: `${plant.id}-${item.id}`,
            label: item.label || resolveTaskLabel(plant, item.id),
            completed: true,
            category: 'care',
            xp_reward: 0,
            plant_id: plant.plant_id,
            plant_name: plant.plant_name,
          })
        }
      }

      // 3. Determine all applicable statuses for the day
      const statuses: DayStatus[] = []
      let milestoneLabel = ''

      // Milestone check
      const milestoneTask = tasks.find(t => t.id.includes('t_seed') || t.id.includes('t_sprout') || t.id.includes('t_mature'))
      if (milestoneTask) {
        statuses.push('milestone')
        milestoneLabel = milestoneTask.label
      }

      // Completion status check (for past days, tasks only contains completed ones)
      if (tasks.length > 0) {
        statuses.push('completed')
      }

      if (isToday) {
        const todayTasks: QuestTask[] = userPlants.flatMap((plant) =>
          getDailyTasksForPlant(plant).map((task) => ({
            ...task,
            plant_id: plant.plant_id,
            plant_name: plant.plant_name,
          }))
        )

        const todayStatuses: DayStatus[] = []
        const anyMilestone = todayTasks.some(t => t.id.includes('t_seed') || t.id.includes('t_sprout') || t.id.includes('t_mature'))
        const anyCompleted = todayTasks.some(t => t.completed)
        const anyPending = todayTasks.some(t => !t.completed)

        if (anyMilestone) todayStatuses.push('milestone')
        if (anyCompleted) todayStatuses.push('completed')
        if (anyPending) todayStatuses.push('pending')
        
        entries.push({
          date: dateKey,
          tasks: todayTasks,
          statuses: todayStatuses,
          milestone_label: milestoneLabel || (anyMilestone ? todayTasks.find(t => t.id.includes('t_'))?.label : undefined)
        })

        // Background sync to Google Calendar
        if (isGoogleUser && accessToken && (todayTasks.length > 0 || anyCompleted)) {
          syncDailyTasksToGoogle(accessToken, dateKey, todayTasks).catch(console.error)
        }

        continue
      }

      entries.push({
        date: dateKey,
        tasks: tasks,
        statuses,
        milestone_label: milestoneLabel || undefined
      })
    }

    setCalendarData(entries)
  }, [userPlants, getDailyTasksForPlant, resolveTaskLabel, isGoogleUser, accessToken])

  // ── Firestore Real-time Sync & Initialization ──
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setUserPlants([])
      setLoading(false)
      setActivePlantId(null)
      return
    }

    const plantsRef = collection(db, 'users', user.uid, 'user_plants')
    const unsubscribe = onSnapshot(plantsRef, (snapshot) => {
      const plants: UserPlant[] = []
      let requiresDecaySave = false

      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Omit<UserPlant, 'created_at' | 'updated_at' | 'last_checked_at'> & {
          created_at: any
          updated_at: any
          last_checked_at: any
        }

        // Parse plant doc
        const plant: UserPlant = {
          ...data,
          // Handle cases where serverTimestamp might be pending
          created_at: data.created_at?.toDate ? data.created_at : Timestamp.now(),
          updated_at: data.updated_at?.toDate ? data.updated_at : Timestamp.now(),
          last_checked_at: data.last_checked_at?.toDate ? data.last_checked_at : Timestamp.now(),
        }

        const staticData = getQuestPlant(plant.plant_id)
        if (staticData) {
          // Perform deterministic decay check immediately
          const decayResult = derivePlantStatus(plant, staticData)
          if (decayResult.hasUpdates && decayResult.updatedState) {
            plant.state = decayResult.updatedState
            plant.status = decayResult.status || plant.status
            if (decayResult.newCheckedAt) {
               plant.last_checked_at = decayResult.newCheckedAt
            }
            requiresDecaySave = true
            // Save decay asynchronously, we still apply local derived state instantly
            updateDoc(docSnap.ref, {
               state: plant.state,
               status: plant.status,
               last_checked_at: plant.last_checked_at,
               updated_at: serverTimestamp(),
            }).catch(e => console.error("Decay sync error:", e))
          }
          plants.push(plant)
        }
      })

      setUserPlants(plants)
      
      setActivePlantId((prev) => {
        if (plants.length === 0) return null
        const pendingId = pendingActivePlantIdRef.current

        if (pendingId) {
          const pendingExists = plants.some((p) => p.id === pendingId)
          if (pendingExists) {
            pendingActivePlantIdRef.current = null
            return pendingId
          }
          return pendingId
        }

        if (!prev) return plants[0].id
        
        // Ensure the active plant actually still exists in the list (e.g. not deleted)
        const activeExists = plants.some(p => p.id === prev)
        return activeExists ? prev : plants[0].id
      })
      
      setLoading(false)
    }, (error) => {
      console.error("Error fetching quest plants:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, authLoading]) // activePlantId intentionally omitted

  // ── Methods ──

  const addPlant = useCallback(async (staticPlantId: string, planType: "Budget" | "Balanced" | "Premium" = "Budget"): Promise<string | undefined> => {
    if (!user) return undefined
    const staticData = getQuestPlant(staticPlantId)
    if (!staticData) return undefined

    setIsGeneratingTasks(true)
    const instanceId = uuidv4()
    const newPlant: UserPlant = {
      id: instanceId,
      plant_id: staticData.plant_id,
      plant_name: staticData.name,
      status: 'healthy',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      last_checked_at: Timestamp.now(),
      selected_plan_type: planType,
      state: {
        growthStage: 0,
        health: 100,
        hydration: 70,
        xp: 0
      },
      task_state: {}
    }

    const docRef = doc(db, 'users', user.uid, 'user_plants', instanceId)
    pendingActivePlantIdRef.current = instanceId
    await setDoc(docRef, {
      ...newPlant,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      last_checked_at: serverTimestamp(),
    })

    // ── Google Calendar Integration ──
    let calendarEventId: string | undefined = undefined
    if (isGoogleUser && accessToken) {
      try {
        const totalDurationDays = (staticData.growth_stages.seed.duration_days || 7) +
                                  (staticData.growth_stages.sprout.duration_days || 14) +
                                  (staticData.growth_stages.mature.duration_days || 30)
        
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(startDate.getDate() + totalDurationDays)

        const eventId = await createCalendarEvent({
          accessToken,
          plantName: staticData.name,
          description: `🌱 Starting my ${staticData.name} quest in FarmQuest! Track my progress: https://farmquest.app`,
          startDate,
          endDate
        })

        if (eventId) {
          calendarEventId = eventId
          // Update the Firestore doc with the event ID
          await updateDoc(docRef, {
            google_calendar_event_id: eventId
          })
        }
      } catch (err) {
        console.error("Failed to sync with Google Calendar:", err)
      }
    }

    // Optimistic local state so UI can open selected plant immediately.
    setUserPlants((prev) => {
      const exists = prev.some((p) => p.id === instanceId)
      const plantWithEvent = calendarEventId ? { ...newPlant, google_calendar_event_id: calendarEventId } : newPlant
      return exists ? prev : [plantWithEvent, ...prev]
    })
    setActivePlantId(instanceId)

    // Generate AI quests in background (non-blocking for navigation).
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    ;(async () => {
      try {
        // 1. Get Plan Detail
        const planRes = await fetch(`${API_URL}/api/plants/${staticPlantId}/ai-plans`)
        if (planRes.ok) {
          const plans = await planRes.json()
          const plan = plans.find((p: any) => p.plan_type === planType) || plans[0]

          // 2. Get AI Explanation
          const expRes = await fetch(`${API_URL}/api/plants/${staticPlantId}/explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan })
          })
          if (expRes.ok) {
            const { explanation } = await expRes.json()

            // 3. Generate Tasks
            const taskRes = await fetch(`${API_URL}/api/generate-ai-tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                plantId: staticPlantId,
                plantName: staticData.name,
                planType: planType,
                explanation: explanation
              })
            })
            
            if (taskRes.ok) {
              const aiTasks = await taskRes.json()
              await updateDoc(docRef, {
                ai_tasks: aiTasks,
                updated_at: serverTimestamp()
              })
              console.log(`[QuestContext] AI tasks ready for ${instanceId}`)
            }
          }
        }
      } catch (err) {
        console.error("Failed to generate AI tasks during creation:", err)
      } finally {
        setIsGeneratingTasks(false)
      }
    })()

    pendingActivePlantIdRef.current = null
    return instanceId
  }, [user])

  const deletePlant = useCallback(async (instanceId: string) => {
    if (!user) return
    const plant = userPlants.find(p => p.id === instanceId)
    const docRef = doc(db, 'users', user.uid, 'user_plants', instanceId)
    
    // ── Google Calendar Integration (Delete Event) ──
    if (isGoogleUser && accessToken && plant?.google_calendar_event_id) {
      deleteCalendarEvent(accessToken, plant.google_calendar_event_id).catch(e => 
        console.error("Failed to delete calendar event:", e)
      )
    }

    await deleteDoc(docRef)
    if (activePlantId === instanceId) {
       setActivePlantId(null)
    }
  }, [user, activePlantId, userPlants, isGoogleUser, accessToken])

  const completeTask = useCallback(async (instanceId: string, taskId: string) => {
    if (!user) return
    const plant = userPlants.find(p => p.id === instanceId)
    if (!plant || plant.status === 'dead') return

    // Handle both prefix-based tasks (water-123), exact milestones, and dynamic AI main quests (main-0).
    const taskPrefix = taskId.split('-')[0]
    const taskType =
      taskId === 'intro' ||
      taskId === 'intro-2' ||
      taskId === 'intro-3' ||
      taskPrefix === 'main'
        ? taskId
        : taskPrefix
    
    // We update fields deterministically
    let { ...newState } = plant.state
    let { ...newTaskState } = plant.task_state

    const now = new Date()
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const nowTimestamp = Timestamp.now()
    
    if (taskType.startsWith('main-')) {
      const mainIndex = parseInt(taskType.split('-')[1] || '0', 10)
      const mainQuest = plant.ai_tasks?.main?.[mainIndex]
      newState.xp += typeof mainQuest?.xp_reward === 'number' ? mainQuest.xp_reward : XP_VALUES.MAIN_QUEST_STEP
      newTaskState[taskId] = true
    } else switch (taskType) {
      case 'water':
        newTaskState.lastWateredAt = nowTimestamp
        newState.hydration = Math.min(100, newState.hydration + 30) // +30 hydration
        newState.health = Math.min(100, newState.health + 5) // small health bump
        newState.xp += XP_VALUES.WATER
        break
      case 'fertilize':
        newTaskState.lastFertilizedAt = nowTimestamp
        newState.health = Math.min(100, newState.health + 10)
        newState.xp += XP_VALUES.FERTILIZE
        break
      case 'observe':
        // No timestamp needed, just XP
        newState.xp += XP_VALUES.OBSERVE
        break
      case 'prune':
        // Assuming prune gives XP and bump health loosely
        newState.health = Math.min(100, newState.health + 5)
        newState.xp += XP_VALUES.PRUNE
        break
      case 'intro':
        newState.health = 100
        newState.hydration = 100
        newState.xp += XP_VALUES.MAIN_QUEST_STEP // +30
        newTaskState.intro = true
        break
      case 'intro-2':
        // Reach exactly 80 (30 + 50) to unlock Quest 3
        newState.xp += 50
        newTaskState['intro-2'] = true
        break
      case 'intro-3':
        // Reach exactly 100 (80 + 20) to stay in Sprout stage
        newState.xp += 20
        newTaskState['intro-3'] = true
        break
      case 't_seed':
        newState.xp += 100 // Seed Phase completion
        break
      case 't_sprout':
        newState.xp += 200 // Sprout Phase completion
        break
      case 't_mature':
        newState.xp += 300 // Mature Phase completion
        break
      case 'daily':
        newTaskState[taskId] = true
        newState.xp += 10
        break
      default:
        console.warn(`Unknown task type: ${taskType}`)
    }

    // Persist completion log for calendar history.
    const completionLog = { ...(newTaskState.completion_log || {}) } as Record<string, Array<{ id: string; label?: string }>>
    const dayLog = [...(completionLog[dateKey] || [])]
    if (!dayLog.some((item) => item.id === taskId)) {
      dayLog.push({ id: taskId, label: resolveTaskLabel(plant, taskId) })
    }
    completionLog[dateKey] = dayLog
    newTaskState.completion_log = completionLog

    // Apply deterministic growth stage recalculation
    newState.growthStage = getGrowthStage(newState.xp)
    
    const docRef = doc(db, 'users', user.uid, 'user_plants', instanceId)
    
    try {
        await updateDoc(docRef, {
            state: newState,
            task_state: newTaskState,
            updated_at: serverTimestamp(),
        })
    } catch (e) {
        console.error("Failed to complete task:", e)
    }
  }, [user, userPlants])

  return (
    <QuestContext.Provider value={{
      userPlants,
      activePlantId,
      loading: loading || authLoading,
      isGeneratingTasks,
      availablePlants: QUEST_PLANTS,
      setActivePlant: setActivePlantId,
      addPlant,
      deletePlant,
      completeTask,
      calendarData,
      refreshCalendar,
      hasActivePlant: userPlants.length > 0,
    }}>
      {children}
    </QuestContext.Provider>
  )
}
