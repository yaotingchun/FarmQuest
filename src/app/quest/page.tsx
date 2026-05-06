'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuest } from '@/lib/QuestContext'
import { getQuestPlant } from '@/data/quest-plants'
import { PlantStatusCard } from '@/components/quest/PlantStatusCard'
import { getAllTasksDueToday } from '@/lib/ruleEngine'
import { Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react'

interface ThemedModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'success' | 'info'
}

function ThemedModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info'
}: ThemedModalProps) {
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300)
      document.body.style.overflow = 'unset'
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isRendered && !isOpen) return null

  const typeConfig = {
    danger: {
      icon: <AlertCircle style={{ color: '#ef4444' }} size={32} />,
      confirmBtnStyle: { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' },
      glowStyle: { boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)' }
    },
    success: {
      icon: <CheckCircle2 style={{ color: '#10b981' }} size={32} />,
      confirmBtnStyle: { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' },
      glowStyle: { boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)' }
    },
    info: {
      icon: <AlertCircle style={{ color: '#3b82f6' }} size={32} />,
      confirmBtnStyle: { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' },
      glowStyle: { boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)' }
    }
  }

  const config = typeConfig[type]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: isOpen ? 'auto' : 'none'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          ...config.glowStyle
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ marginBottom: '1rem' }}>
            {config.icon}
          </div>

          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.5rem'
          }}>
            {title}
          </h3>

          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            fontSize: '0.95rem',
            lineHeight: 1.5
          }}>
            {message}
          </p>

          <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid transparent',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...config.confirmBtnStyle
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { CalendarGrid } from '@/components/quest/CalendarGrid'

function MultiPlantDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userPlants, availablePlants, addPlant, setActivePlant, completeTask, deletePlant, calendarData, refreshCalendar } = useQuest()
  const isAddingRef = useRef(false)
  const processedQueryRef = useRef<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [plantToDelete, setPlantToDelete] = useState<{ id: string, name: string } | null>(null)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'chosen_plant' | 'posted_order' | 'accepted_order'>('all')

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
      return sourceFilter === 'all' ? true : category === sourceFilter
    })
  }, [userPlants, sourceFilter])

  const sourceCounts = useMemo(() => {
    return {
      all: userPlants.length,
      chosen_plant: userPlants.filter((p) => (p.source_category || 'chosen_plant') === 'chosen_plant').length,
      posted_order: userPlants.filter((p) => p.source_category === 'posted_order').length,
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

  useEffect(() => {
    const orderId = searchParams.get('order')
    const plantFromUrl = searchParams.get('plant')
    const planFromUrl = normalizePlanType(searchParams.get('plan'))
    const sourceCategory = normalizeSourceCategory(searchParams.get('source'))
    const sharedProgressKey = orderId ? `marketplace-order-${orderId}` : undefined

    // Helper to add the plant and navigate
    const handleAdd = async (pId: string, pType: "Budget" | "Balanced" | "Premium") => {
      const queryKey = `${pId}|${pType}|${sourceCategory}|${orderId || ''}`
      if (processedQueryRef.current === queryKey) return
      processedQueryRef.current = queryKey

      const matchingPlant = userPlants.find(
        (p) =>
          p.plant_id === pId &&
          (p.source_category || 'chosen_plant') === sourceCategory &&
          (sharedProgressKey ? p.shared_progress_key === sharedProgressKey : true)
      )

      if (matchingPlant) {
        setActivePlant(matchingPlant.id)
        router.replace('/quest/quests')
        return
      }

      const isValid = availablePlants.some((p) => p.plant_id === pId)
      if (!isValid) {
        router.replace('/quest')
        return
      }

      isAddingRef.current = true
      addPlant(pId, pType, sourceCategory, { sharedProgressKey }).then((newId) => {
        if (newId) {
          setActivePlant(newId)
          router.replace('/quest/quests')
        } else {
          router.replace('/quest')
        }
      }).finally(() => {
        isAddingRef.current = false
      })
    }

    if (plantFromUrl) {
      handleAdd(plantFromUrl, planFromUrl)
    } else if (orderId) {
      // Direct order access: fetch order to get plant_id
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      fetch(`${API_URL}/api/marketplace/orders/${orderId}`)
        .then(r => r.json())
        .then(order => {
          if (order && order.plant_id) {
            handleAdd(order.plant_id, order.plan_type || 'Budget')
          }
        })
        .catch(err => console.error("Failed to fetch order for routing:", err))
    }
  }, [searchParams, availablePlants, addPlant, router, setActivePlant, userPlants])

  const handleGoToDetail = (instanceId: string) => {
    setActivePlant(instanceId)
    router.push('/quest/quests')
  }

  const canEditPlant = (plant: { source_category?: 'chosen_plant' | 'posted_order' | 'accepted_order' }) => {
    return (plant.source_category || 'chosen_plant') !== 'posted_order'
  }

  // Unified task list across all plants (filtered by selected category)
  const allTasksWrapped = useMemo(() => getAllTasksDueToday(filteredPlants, getQuestPlant), [filteredPlants])

  const filteredCalendarData = useMemo(() => {
    if (sourceFilter === 'all') return calendarData
    const filteredIds = new Set(filteredPlants.map(p => p.id))
    return calendarData.map(day => {
      const filteredTasks = (day.tasks || []).filter((task: any) => filteredIds.has(task.plant_instance_id))
      const statuses: any[] = []
      const anyMilestone = filteredTasks.some((t: any) => t.id.includes('t_seed') || t.id.includes('t_sprout') || t.id.includes('t_mature'))
      const anyCompleted = filteredTasks.some((t: any) => t.completed)
      const anyPending = filteredTasks.some((t: any) => !t.completed)
      if (anyMilestone) statuses.push('milestone')
      if (anyCompleted) statuses.push('completed')
      if (anyPending) statuses.push('pending')
      return { ...day, tasks: filteredTasks, statuses }
    })
  }, [calendarData, filteredPlants, sourceFilter])

  const calendarCompletedCount = useMemo(() => filteredCalendarData.reduce((total: number, day: any) => total + (day.tasks || []).filter((t: any) => t.completed).length, 0), [filteredCalendarData])
  const calendarPendingCount = useMemo(() => filteredCalendarData.reduce((total: number, day: any) => total + (day.tasks || []).filter((t: any) => !t.completed).length, 0), [filteredCalendarData])

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
                <div className="quest-section-header" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>🌱 My Active Plants</h2>
                  <div className="quest-source-tabs">
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
                      >
                        {label}
                        <span className="quest-source-tab-count">{sourceCounts[key]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>
                  {filteredPlants.length === 0 ? (
                    <div className="quest-hub-no-tasks" style={{ padding: '2.5rem 1rem' }}>
                      <span>🌿</span>
                      <p>No plants in this category yet.</p>
                    </div>
                  ) : filteredPlants.map(plant => {
                    const pData = getQuestPlant(plant.plant_id)
                    if (!pData) return null
                    const isEditable = canEditPlant(plant)
                    return (
                      <div key={plant.id} style={{ position: 'relative' }}>
                        <div style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleGoToDetail(plant.id)}>
                          <PlantStatusCard
                            plantName={plant.plant_name}
                            plantEmoji={pData.emoji}
                            stage={plant.state.growthStage as any}
                            streak={0}
                            sourceCategory={plant.source_category || 'chosen_plant'}
                            orderStatus={plant.order_status}
                            sunlight={pData.sunlight_type}
                            waterFrequency={pData.water_frequency_days}
                            startMethod={pData.startMethod}
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
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    )
                  })}
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
                            onClick={() => !task.completed && isEditable && completeTask(plant.id, task.id)}
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
              entries={filteredCalendarData}
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
