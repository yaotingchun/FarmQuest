'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuest } from '@/lib/QuestContext'
import { getQuestPlant } from '@/data/quest-plants'
import { PlantStatusCard } from '@/components/quest/PlantStatusCard'
import { getAllTasksDueToday } from '@/lib/ruleEngine'
import { Trash2, AlertCircle, CheckCircle2, X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

import { ThemedModal } from '@/components/ui/ThemedModal'
import { PhotoUploadModal } from '@/components/quest/PhotoUploadModal'
import { completeQuest } from '@/lib/userProgress'
import { CompletionModal } from '@/components/quest/CompletionModal'

import { CalendarGrid } from '@/components/quest/CalendarGrid'

function MultiPlantDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const { userPlants, availablePlants, addPlant, setActivePlant, completeTask, deletePlant, calendarData, refreshCalendar, loading } = useQuest()
  const isAddingRef = useRef(false)
  const processedQueryRef = useRef<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [plantToDelete, setPlantToDelete] = useState<{ id: string, name: string } | null>(null)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'chosen_plant' | 'posted_order' | 'accepted_order'>('all')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchStatuses = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const statuses: Record<string, string> = {}
      for (const plant of userPlants) {
        if (plant.shared_progress_key?.startsWith('marketplace-order-')) {
          const orderId = plant.shared_progress_key.replace('marketplace-order-', '')
          try {
            const res = await fetch(`${API_URL}/api/marketplace/orders/${orderId}`)
            if (res.ok) {
              const order = await res.json()
              statuses[plant.id] = order.status
            }
          } catch (e) {
            console.error(e)
          }
        }
      }
      setOrderStatuses(statuses)
    }
    if (userPlants.length > 0) {
      fetchStatuses()
    }
  }, [userPlants])
  const [uploadTask, setUploadTask] = useState<{ plantId: string, taskId: string, taskName: string, xpGained: number, plant: any } | null>(null)
  const [completionModalOpen, setCompletionModalOpen] = useState(false)
  const [modalData, setModalData] = useState<any>(null)

  const onQuestSuccess = async (taskId: string, taskName: string, xpGained: number, plant: any) => {
    if (!user) return
    const result = await completeQuest(user.uid, taskId, xpGained)

    setModalData({
      taskLabel: taskName,
      xpGained,
      newXP: result.newXP,
      newStreak: result.newStreak,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      plantGrowthPercent: Math.min(100, (plant.state.xp / 1000) * 100),
    })

    // Only show modal for care tasks (daily/recurring)
    const isCareTask = taskId.startsWith('daily-') ||
      taskId.startsWith('fertilize-') ||
      taskId.startsWith('prune-')

    if (isCareTask) {
      setCompletionModalOpen(true)
    }
  }

  const handleTaskComplete = async (plant: any, taskId: string, requiresPhoto: boolean | undefined, taskName: string, xpGained: number = 10) => {
    if (requiresPhoto) {
      setUploadTask({ plantId: plant.id, taskId, taskName, xpGained, plant })
    } else {
      await completeTask(plant.id, taskId)
      await onQuestSuccess(taskId, taskName, xpGained, plant)
    }
  }

  const handleUploadSuccess = async (photoUrl: string) => {
    if (uploadTask) {
      await completeTask(uploadTask.plantId, uploadTask.taskId, photoUrl)
      await onQuestSuccess(uploadTask.taskId, uploadTask.taskName, uploadTask.xpGained, uploadTask.plant)
    }
    setUploadTask(null)
  }

  // Calendar State
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  useEffect(() => {
    refreshCalendar(year, month)
  }, [year, month, refreshCalendar, userPlants])

  const handleMonthChange = (y: number, m: number) => {
    setYear(y)
    setMonth(m)
  }

  const filteredPlants = useMemo(() => {
    return userPlants.filter((plant) => {
      const category = plant.source_category || 'chosen_plant'
      if (category === 'posted_order' && !plant.is_accepted) return false
      return sourceFilter === 'all' ? true : category === sourceFilter
    })
  }, [userPlants, sourceFilter])

  const sortedPlants = useMemo(() => {
    return [...filteredPlants].sort((a, b) => {
      const aStatus = orderStatuses[a.id]
      const bStatus = orderStatuses[b.id]
      const aCompleted = aStatus === 'COMPLETED' || aStatus === 'completed' || a.state.growthStage === 3
      const bCompleted = bStatus === 'COMPLETED' || bStatus === 'completed' || b.state.growthStage === 3
      if (aCompleted && !bCompleted) return 1
      if (!aCompleted && bCompleted) return -1
      return 0
    })
  }, [filteredPlants, orderStatuses])

  const sourceCounts = useMemo(() => {
    return {
      all: userPlants.filter(p => (p.source_category !== 'posted_order' || p.is_accepted)).length,
      chosen_plant: userPlants.filter((p) => (p.source_category || 'chosen_plant') === 'chosen_plant').length,
      posted_order: userPlants.filter((p) => p.source_category === 'posted_order' && p.is_accepted).length,
      accepted_order: userPlants.filter((p) => p.source_category === 'accepted_order').length,
    }
  }, [userPlants])

  const normalizePlanType = (value: string | null): "Budget" | "Balanced" | "Premium" => {
    if (value === "Balanced" || value === "Premium" || value === "Budget") return value
    return "Budget"
  }

  const normalizeSourceCategory = (value: string | null): 'chosen_plant' | 'posted_order' | 'accepted_order' => {
    if (value === 'posted_order' || value === 'accepted_order' || value === 'chosen_plant') return value
    return 'chosen_plant'
  }

  const [isProcessingQuery, setIsProcessingQuery] = useState(false)

  useEffect(() => {
    // CRITICAL: Wait for user data and plant list to load before deciding to add a new plant!
    if (loading) return

    const plantToAdd = searchParams.get('plant')
    const planToAdd = normalizePlanType(searchParams.get('plan'))
    const sourceCategory = normalizeSourceCategory(searchParams.get('source'))
    const orderId = searchParams.get('order')
    const sharedProgressKey = orderId ? `marketplace-order-${orderId}` : undefined

    if (!plantToAdd) {
      setIsProcessingQuery(false)
      return
    }

    setIsProcessingQuery(true)
    const queryKey = `${plantToAdd}|${planToAdd}|${sourceCategory}|${orderId || ''}`
    if (processedQueryRef.current === queryKey) return
    processedQueryRef.current = queryKey

    const matchingPlant = userPlants.find(
      (p) =>
        p.plant_id === plantToAdd &&
        (p.source_category || 'chosen_plant') === sourceCategory &&
        (sharedProgressKey ? p.shared_progress_key === sharedProgressKey : true)
    )

    if (matchingPlant) {
      setActivePlant(matchingPlant.id)
      router.replace('/quest/quests')
      return
    }

    const isValid = availablePlants.some((p) => p.plant_id === plantToAdd)
    if (!isValid) {
      setIsProcessingQuery(false)
      router.replace('/quest')
      return
    }

    isAddingRef.current = true
    addPlant(plantToAdd, planToAdd, sourceCategory, { sharedProgressKey }).then((newId) => {
      if (newId) {
        setActivePlant(newId)
        router.replace('/quest/quests')
      } else {
        setIsProcessingQuery(false)
        router.replace('/quest')
      }
    }).finally(() => {
      isAddingRef.current = false
    })
  }, [searchParams, availablePlants, addPlant, router, setActivePlant, userPlants])

  // Handle deletion notification
  useEffect(() => {
    if (searchParams.get('deleted') === 'true') {
      setSuccessMessage('Plant has been successfully removed from your garden.')
      setShowSuccessModal(true)
      // Clear the query param
      const params = new URLSearchParams(searchParams.toString())
      params.delete('deleted')
      router.replace(`/quest${params.toString() ? `?${params.toString()}` : ''}`)
    }
  }, [searchParams, router])

  const handleGoToDetail = (instanceId: string) => {
    setActivePlant(instanceId)
    router.push('/quest/quests')
  }

  const canEditPlant = (_plant: { source_category?: 'chosen_plant' | 'posted_order' | 'accepted_order' }) => {
    return true // Allow removing any plant from the garden view
  }

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 4

  const totalPages = Math.ceil(filteredPlants.length / itemsPerPage)
  const paginatedPlants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedPlants.slice(start, start + itemsPerPage)
  }, [sortedPlants, currentPage])

  // Reset to page 1 if filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [sourceFilter])

  // Unified task list across plants ON THE CURRENT PAGE
  const allTasksWrapped = useMemo(() => {
    return getAllTasksDueToday(paginatedPlants, getQuestPlant)
  }, [paginatedPlants])

  const calendarCompletedCount = useMemo(() => calendarData.reduce((total: number, day: any) => total + (day.tasks || []).filter((t: any) => t.completed).length, 0), [calendarData])
  const calendarPendingCount = useMemo(() => calendarData.reduce((total: number, day: any) => total + (day.tasks || []).filter((t: any) => !t.completed).length, 0), [calendarData])

  if (isProcessingQuery) {
    return (
      <div className="quest-page" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="quest-hub-no-tasks" style={{ padding: '3rem 1rem', width: '100%' }}>
          <div className="mp-badge-dot" style={{ margin: '0 auto 16px', width: 12, height: 12 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Initializing Quest...</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Preparing your garden for the new plant.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="quest-page" style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '1rem',
      paddingBottom: '4rem'
    }}>
      <div style={{ width: '100%', maxWidth: '1240px', margin: '0 auto' }}>
        <div className="quest-hub-layout">
          <div className="quest-main-content">
            <div className="quest-hub-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h1 className="quest-hub-title" style={{ fontSize: '2rem' }}>My Garden</h1>
                <p className="quest-hub-sub">Track all your plants and daily care in one place</p>
              </div>
            </div>

            {userPlants.length === 0 ? (
              <div className="quest-hub-no-tasks" style={{ padding: '4rem 1rem' }}>
                <span>🌱</span>
                <p>Your garden is empty.</p>
                <button
                  className="btn-primary"
                  onClick={() => router.push('/recommendations')}
                  style={{ marginTop: '1.5rem' }}
                >
                  Add Your First Plant
                </button>
              </div>
            ) : (
              <>
                {/* Active Plants Grid */}
                <div className="quest-section-header" style={{ marginBottom: '1.5rem' }}>
                  <div className="quest-source-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {([
                      ['all', 'All'],
                      ['chosen_plant', '🌱 Self Planted'],
                      ['posted_order', '📤 Posted Order'],
                      ['accepted_order', '🚜 Accepted Order'],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        className={`quest-source-tab ${sourceFilter === key ? 'active' : ''}`}
                        onClick={() => setSourceFilter(key)}
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        {label}
                        <span className="quest-source-tab-count">{sourceCounts[key]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1rem', minHeight: 'auto' }}>
                  {sortedPlants.length === 0 ? (
                    <div className="quest-hub-no-tasks" style={{ padding: '2.5rem 1rem' }}>
                      <span>🌿</span>
                      <p>No plants in this category yet.</p>
                    </div>
                  ) : paginatedPlants.map(plant => {
                    const pData = getQuestPlant(plant.plant_id)
                    if (!pData) return null
                    const isEditable = canEditPlant(plant)
                    const orderStatus = orderStatuses[plant.id]
                    const isCompleted = orderStatus === 'COMPLETED' || orderStatus === 'completed' || plant.state.growthStage === 3
                    return (
                      <div key={plant.id} style={{ position: 'relative' }}>
                        <div style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleGoToDetail(plant.id)}>
                          <PlantStatusCard
                              plantName={plant.plant_name}
                              plantEmoji={pData.emoji}
                              stage={plant.state.growthStage as any}
                              streak={0} 
                              sourceCategory={plant.source_category || 'chosen_plant'}
                              sunlight={pData.sunlight_type}
                              waterFrequency={pData.water_frequency_days}
                              startMethod={pData.startMethod}
                              status={isCompleted ? 'completed' : 'in_progress'}
                          />
                          <div style={{ position: 'absolute', bottom: '20px', right: '24px', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 800, opacity: 0.6 }}>
                            View Quests →
                          </div>
                        </div>
                        {isEditable && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlantToDelete({ id: plant.id, name: plant.plant_name });
                              setShowDeleteModal(true);
                            }}
                            style={{
                              position: 'absolute',
                              top: '58px',
                              right: '16px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--glass-border)',
                              color: 'var(--text-muted)',
                              padding: '8px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              zIndex: 10
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.color = 'var(--text-muted)';
                              e.currentTarget.style.borderColor = 'var(--glass-border)';
                            }}
                            title="Remove Plant"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '0.75rem', marginBottom: '3.5rem' }}>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="quest-page-btn"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--glass-border)',
                          padding: '10px',
                          borderRadius: '50%',
                          color: currentPage === 1 ? 'rgba(255, 255, 255, 0.1)' : 'var(--text-primary)',
                          cursor: currentPage === 1 ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: currentPage === 1 ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '6px 20px',
                        borderRadius: '50px',
                        border: '1px solid var(--glass-border)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: 'var(--text-secondary)'
                      }}>
                        <span style={{ color: 'var(--accent)' }}>{currentPage}</span>
                        <span style={{ opacity: 0.3 }}>/</span>
                        <span>{totalPages}</span>
                      </div>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="quest-page-btn"
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--glass-border)',
                          padding: '10px',
                          borderRadius: '50%',
                          color: currentPage === totalPages ? 'rgba(255, 255, 255, 0.1)' : 'var(--text-primary)',
                          cursor: currentPage === totalPages ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: currentPage === totalPages ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Unified Daily Tasks */}
                <div className="quest-hub-tasks-section">
                  <div className="quest-hub-tasks-header" style={{ marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>⚡ Today&apos;s Actions Needed</h2>
                  </div>

                  {allTasksWrapped.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {allTasksWrapped.map(({ plant, task, plantData }) => {
                        const isEditable = canEditPlant(plant)
                        return (
                          <div
                            key={task.id}
                            className={`quest-task-item ${task.completed ? 'completed' : ''}`}
                            onClick={() => !task.completed && isEditable && handleTaskComplete(plant, task.id, task.requires_photo, task.label, task.xp_reward || 10)}
                            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', cursor: task.completed || !isEditable ? 'default' : 'pointer', opacity: !isEditable && !task.completed ? 0.78 : 1 }}
                          >
                            <div className={`quest-task-check ${task.completed ? 'checked' : ''}`}>
                              {task.completed && <span>✓</span>}
                            </div>
                            <div className="quest-task-content">
                              <span className="quest-task-label" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.2em' }}>{plantData.emoji}</span> {task.label}
                              </span>
                              <div className="quest-task-meta">
                                <span className="quest-task-cat-badge">{task.category}</span>
                                <span className="quest-task-xp">+{task.xp_reward} XP</span>
                                {!isEditable && <span className="quest-task-cat-badge" style={{ background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' }}>View only</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="quest-hub-no-tasks" style={{ padding: '3rem 1rem' }}>
                      <span>🌟</span>
                      <p>All clear! Your garden is thriving today.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sidebar Calendar - Aligned with 'My Active Plants' header */}
          <div className="quest-sidebar-content" style={{ marginTop: '7.5rem' }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Care Calendar</h3>
              <div className="quest-cal-header-counts">
                <span className="quest-cal-header-pill completed">Completed {calendarCompletedCount}</span>
                <span className="quest-cal-header-pill pending">Pending {calendarPendingCount}</span>
              </div>
            </div>
            <CalendarGrid
              entries={calendarData}
              year={year}
              month={month}
              onMonthChange={handleMonthChange}
            />
          </div>
        </div>
      </div>

      <ThemedModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          if (plantToDelete) {
            deletePlant(plantToDelete.id)
            setPlantToDelete(null)
          }
        }}
        type="danger"
        title="Remove Plant?"
        message={`Are you sure you want to remove your ${plantToDelete?.name}? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Keep Plant"
      />

      <ThemedModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onConfirm={() => setShowSuccessModal(false)}
        type="success"
        title="Plant Removed"
        message={successMessage}
        confirmText="Got it"
      />

      {user && (
        <PhotoUploadModal
          isOpen={!!uploadTask}
          onClose={() => setUploadTask(null)}
          onUploadSuccess={handleUploadSuccess}
          userId={user.uid}
          taskName={uploadTask?.taskName}
        />
      )}

      {modalData && (
        <CompletionModal
          isOpen={completionModalOpen}
          onClose={() => setCompletionModalOpen(false)}
          {...modalData}
        />
      )}
    </div>
  )
}

import { Suspense } from 'react'

export default function QuestDashboardPage() {
  return (
    <Suspense fallback={
      <div className="quest-page" style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="quest-hub-no-tasks"><span>🌿</span><p>Loading your garden dashboard...</p></div>
      </div>
    }>
      <MultiPlantDashboard />
    </Suspense>
  )
}
