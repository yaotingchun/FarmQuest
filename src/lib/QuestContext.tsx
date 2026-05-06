'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db } from './firebase'
import { useAuth } from '@/context/AuthContext'
import type { UserPlant, QuestPlantData, QuestTask, CalendarEntry, DayStatus, PlantSourceCategory } from '@/types/quest'
import { XP_VALUES } from '@/types/quest'
import { derivePlantStatus, getTasksDueOnDate, getGrowthStage } from './ruleEngine'
import { getQuestPlant, QUEST_PLANTS } from '@/data/quest-plants'
import { createCalendarEvent, deleteCalendarEvent, syncDailyTasksToGoogle } from '@/lib/googleCalendar'

interface QuestContextValue {
  userPlants: UserPlant[]
  activePlantId: string | null
  loading: boolean
  isGeneratingTasks: boolean
  availablePlants: QuestPlantData[]

  setActivePlant: (plantId: string | null) => void
  addPlant: (
    staticPlantId: string,
    planType?: "Budget" | "Balanced" | "Premium",
    sourceCategory?: PlantSourceCategory,
    options?: { sharedProgressKey?: string }
  ) => Promise<string | undefined>
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

  const getDailyTasksForPlant = useCallback((plant: UserPlant, targetDate: Date = new Date()): QuestTask[] => {
    const plantData = getQuestPlant(plant.plant_id)
    if (!plantData || plant.status === 'dead') return []

    const now = new Date()
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const targetKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`
    const isFuture = targetDate.getTime() > now.getTime() && targetKey !== todayKey

    const aiMainCount = plant.ai_tasks?.main?.length || 0
    const aiSetupDone = aiMainCount > 0 && Array.from({ length: aiMainCount }).every((_, i) => !!plant.task_state?.[`main-${i}`])
    const fallbackSetupDone = !!plant.task_state?.intro && !!plant.task_state?.['intro-2'] && !!plant.task_state?.['intro-3']
    const isDailyUnlocked = aiMainCount > 0 ? aiSetupDone : fallbackSetupDone

    if (isDailyUnlocked && (plant.ai_tasks?.daily?.length || 0) > 0) {
      return plant.ai_tasks!.daily.map((label: string, i: number) => {
        // For future dates, daily AI tasks are always pending
        const isCompleted = isFuture ? false : !!plant.task_state?.[`daily-${i}`]
        return {
          id: `daily-${i}`,
          label,
          completed: isCompleted,
          category: 'care',
          xp_reward: 10,
        }
      })
    }

    return getTasksDueOnDate(plant, plantData, targetDate)
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
      const targetDate = new Date(year, month, day)
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isToday = dateKey === todayKey
      const isFuture = targetDate.getTime() > now.getTime() && !isToday

      const tasks: QuestTask[] = []

      // 1. Add completed tasks from log
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

      // 2. Add predicted tasks for Today or Future
      if (isToday || isFuture) {
        const scheduledTasks: QuestTask[] = userPlants.flatMap((plant) =>
          getDailyTasksForPlant(plant, targetDate).map((task) => ({
            ...task,
            plant_id: plant.plant_id,
            plant_name: plant.plant_name,
          }))
        )

        // Merge with existing tasks (avoid duplicates if task was already completed today)
        for (const sTask of scheduledTasks) {
          if (!tasks.some(t => t.plant_name === sTask.plant_name && t.label === sTask.label)) {
            tasks.push(sTask)
          }
        }
      }

      // 3. Determine statuses
      const statuses: DayStatus[] = []
      let milestoneLabel = ''

      const anyMilestone = tasks.some(t => t.id.includes('t_seed') || t.id.includes('t_sprout') || t.id.includes('t_mature'))
      const anyCompleted = tasks.some(t => t.completed)
      const anyPending = tasks.some(t => !t.completed)

      if (anyMilestone) {
        statuses.push('milestone')
        milestoneLabel = tasks.find(t => t.id.includes('t_'))?.label || ''
      }
      if (anyCompleted) statuses.push('completed')
      if (anyPending) statuses.push('pending')

      entries.push({
        date: dateKey,
        tasks: tasks,
        statuses,
        milestone_label: milestoneLabel || undefined
      })

      // Background sync to Google Calendar (Today only)
      if (isToday && isGoogleUser && accessToken) {
        syncDailyTasksToGoogle(accessToken, dateKey, tasks).catch(console.error)
      }
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
          source_category: data.source_category || 'chosen_plant',
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

        if (!prev && plants.length > 0) {
          // If it was previously empty, then it's fine to pick the first one
          return plants[0].id
        }
        
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
  const inFlightAddsRef = useRef<Map<string, Promise<string | undefined>>>(new Map())

  const addPlant = useCallback(async (
    staticPlantId: string,
    planType: "Budget" | "Balanced" | "Premium" = "Budget",
    sourceCategory: PlantSourceCategory = 'chosen_plant',
    options?: { sharedProgressKey?: string; is_accepted?: boolean }
  ): Promise<string | undefined> => {
    if (!user) return undefined

    // ── Prevent Duplicates for Shared Orders ──
    if (options?.sharedProgressKey) {
      const existing = userPlants.find(p => p.shared_progress_key === options.sharedProgressKey)
      if (existing) return existing.id
      
      const inFlight = inFlightAddsRef.current.get(options.sharedProgressKey)
      if (inFlight) return inFlight
    }

    const staticData = getQuestPlant(staticPlantId)
    if (!staticData) return undefined

    const performAdd = async (): Promise<string | undefined> => {
      try {
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
          source_category: sourceCategory,
          is_accepted: options?.is_accepted ?? (sourceCategory !== 'posted_order'),
          ...(options?.sharedProgressKey ? { shared_progress_key: options.sharedProgressKey } : {}),
          state: {
            growthStage: 0,
            health: 100,
            hydration: 70,
            xp: 0
          },
          task_state: {}
        }

        // Try to pre-load tasks from shared order if applicable
        let existingAiTasks = null
        let API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        if (!API_URL && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          API_URL = 'http://localhost:3001'
        }

        if (options?.sharedProgressKey?.startsWith('marketplace-order-')) {
          try {
            const orderId = options.sharedProgressKey.replace('marketplace-order-', '')
            const orderRes = await fetch(`${API_URL}/api/marketplace/orders/${orderId}`)
            if (orderRes.ok) {
              const order = await orderRes.json()
              if (order.ai_tasks) {
                existingAiTasks = order.ai_tasks
                newPlant.ai_tasks = existingAiTasks
              }
            }
          } catch (e) {
            console.warn("[QuestContext] Failed to pre-fetch shared tasks:", e)
          }
        }

        // ── 1. Check if this plant already exists in Firestore (Final Safety Check) ──
        if (options?.sharedProgressKey) {
           const existing = userPlants.find(p => p.shared_progress_key === options.sharedProgressKey)
           if (existing) return existing.id
        }

        const docRef = doc(db, 'users', user.uid, 'user_plants', instanceId)
        pendingActivePlantIdRef.current = instanceId
        setActivePlantId(instanceId) 
        await setDoc(docRef, newPlant)

        // ── Google Calendar Integration ──
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
              description: `🌱 Starting my ${staticData.name} quest in FarmQuest!`,
              startDate,
              endDate
            })

            if (eventId) {
              await updateDoc(docRef, { google_calendar_event_id: eventId })
            }
          } catch (err) {
            console.error("Failed to sync with Google Calendar:", err)
          }
        }

        // ── Initial AI Task Generation ──
        // CRITICAL: Requesters (posted_order) should NEVER trigger AI generation.
        // They must wait for the Farmer to accept and generate the tasks.
        if (!existingAiTasks && sourceCategory !== 'posted_order') {
          try {
            // 1. Get Plan Detail
            const planRes = await fetch(`${API_URL}/api/plants/${staticData.plant_id}/ai-plans`)
            if (planRes.ok) {
              const plans = await planRes.json()
              const plan = plans.find((p: any) => p.plan_type === planType) || plans[0]

              // 2. Get AI Explanation
              const expRes = await fetch(`${API_URL}/api/plants/${staticData.plant_id}/explain`, {
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
                    plantId: staticData.plant_id,
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

                  // Sync tasks to order if applicable
                  if (options?.sharedProgressKey?.startsWith('marketplace-order-')) {
                    const oId = options.sharedProgressKey.replace('marketplace-order-', '')
                    await fetch(`${API_URL}/api/marketplace/orders/${oId}/shared-progress`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        plant_id: staticData.plant_id,
                        state: newPlant.state,
                        task_state: newPlant.task_state,
                        ai_tasks: aiTasks
                      })
                    })
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error in AI task generation flow:', error)
          }
        }

        return instanceId
      } finally {
        setIsGeneratingTasks(false)
        if (options?.sharedProgressKey) {
          inFlightAddsRef.current.delete(options.sharedProgressKey)
        }
      }
    }

    if (options?.sharedProgressKey) {
      const promise = performAdd()
      inFlightAddsRef.current.set(options.sharedProgressKey, promise)
      return promise
    }

    return performAdd()
  }, [user, userPlants, isGoogleUser, accessToken, createCalendarEvent])

  // ── Marketplace Order Sync ──
  const syncedOrdersRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!user || authLoading || loading) return

    const syncMarketplaceOrders = async () => {
      try {
        let API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        // Fallback for local development if not set
        if (!API_URL && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          API_URL = 'http://localhost:3001'
        }

        console.log(`[QuestContext] Syncing marketplace orders for ${user.uid} via ${API_URL}...`)
        const res = await fetch(`${API_URL}/api/marketplace/my-orders?uid=${user.uid}`)
        if (!res.ok) {
           console.warn(`[QuestContext] Sync failed: ${res.status} ${res.statusText}`)
           return
        }
        
        const { as_requester, as_farmer } = (await res.json()) as { as_requester: any[], as_farmer: any[] }
        const allOrders = [...(as_requester || []), ...(as_farmer || [])]
        console.log(`[QuestContext] Found ${allOrders.length} potential orders to sync.`)
        
        for (const order of allOrders) {
          // If order is accepted/in-progress, ensure it's in the garden for tracking
          if (['accepted', 'in_progress', 'pending_review'].includes(order.status)) {
            const sharedKey = `marketplace-order-${order.id}`
            const existingPlant = userPlants.find(p => p.shared_progress_key === sharedKey)
            
            if (existingPlant) {
              // If the plant exists but is hidden (is_accepted is false), make it visible
              if (!existingPlant.is_accepted) {
                console.log(`[QuestContext] Order ${order.id} is now accepted, revealing in garden...`)
                const plantRef = doc(db, 'users', user.uid, 'user_plants', existingPlant.id)
                updateDoc(plantRef, { is_accepted: true, updated_at: serverTimestamp() })
              }
            } else if (!syncedOrdersRef.current.has(order.id)) {
              syncedOrdersRef.current.add(order.id)
              console.log(`[QuestContext] Auto-syncing active order to garden: ${order.id} (${order.plant_name})`)
              
              const isRequester = order.requester_uid === user.uid
              const sourceCategory = isRequester ? 'posted_order' : 'accepted_order'
              
              // addPlant is non-blocking and handles its own state updates
              addPlant(order.plant_id, order.plan_type || 'Budget', sourceCategory, { 
                sharedProgressKey: sharedKey,
                is_accepted: true 
              })
                .then(id => console.log(`[QuestContext] Successfully synced ${order.id} as plant ${id}`))
                .catch(e => console.error(`[QuestContext] Failed to sync order ${order.id}:`, e))
            }
          }
        }
      } catch (e) {
        console.error("[QuestContext] Marketplace sync error:", e)
      }
    }

    syncMarketplaceOrders()
  }, [user, authLoading, userPlants, addPlant])

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

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${API_URL}/api/users/${user.uid}/plants/${instanceId}`, { method: 'DELETE' })
      
      if (!res.ok) {
        console.warn("[QuestContext] Server delete failed, performing direct Firestore deletion fallback.")
        await deleteDoc(docRef)
      }
    } catch (err) {
      console.error("[QuestContext] Server delete error, performing direct Firestore deletion fallback:", err)
      await deleteDoc(docRef)
    }

    if (activePlantId === instanceId) {
       setActivePlantId(null)
    }
  }, [user, activePlantId, isGoogleUser, accessToken])

  const completeTask = useCallback(async (instanceId: string, taskId: string) => {
    if (!user) return
    const plant = userPlants.find(p => p.id === instanceId)
    if (!plant || plant.status === 'dead') return
    if ((plant.source_category || 'chosen_plant') === 'posted_order') return

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
      const questXp = typeof (mainQuest as any)?.xp === 'number'
        ? (mainQuest as any).xp
        : typeof (mainQuest as any)?.xp_reward === 'number'
          ? (mainQuest as any).xp_reward
          : XP_VALUES.MAIN_QUEST_STEP
      newState.xp += questXp
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

      const sharedKey = plant.shared_progress_key
      const orderId = sharedKey?.startsWith('marketplace-order-') ? sharedKey.replace('marketplace-order-', '') : null
      if (orderId) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
        await fetch(`${API_URL}/api/marketplace/orders/${encodeURIComponent(orderId)}/shared-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plant_id: plant.plant_id,
            source_category: plant.source_category || 'chosen_plant',
            state: newState,
            task_state: newTaskState,
          }),
        })
      }
    } catch (e) {
        console.error("Failed to complete task:", e)
    }
    }, [user, userPlants, resolveTaskLabel])

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
