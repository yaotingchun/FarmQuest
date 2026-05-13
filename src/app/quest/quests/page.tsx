'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuest } from '@/lib/QuestContext'
import { getQuestPlant } from '@/data/quest-plants'
import { getTasksDueToday, xpForNextLevel, calculateLevel, getAllTasksDueToday } from '@/lib/ruleEngine'
import { PlantStatusCard } from '@/components/quest/PlantStatusCard'
import { TaskList } from '@/components/quest/TaskList'
import { QuestCard } from '@/components/quest/QuestCard'
import { Quest } from '@/types/quest'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'

import { Suspense } from 'react'
import { ThemedModal } from '@/components/ui/ThemedModal'
import { PhotoUploadModal } from '@/components/quest/PhotoUploadModal'
import { useAuth } from '@/context/AuthContext'
import { completeQuest } from '@/lib/userProgress'
import { CompletionModal } from '@/components/quest/CompletionModal'
import { PlantHealthModal } from '@/components/quest/PlantHealthModal'
import { TreatmentQuestCard, TreatmentProgressCard } from '@/components/quest/TreatmentQuestCard'
import { GrowthCurveChart } from '@/components/quest/GrowthCurveChart'
import type { PlantHealthReport } from '@/types/diagnosis'

function QuestsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userPlants, activePlantId, completeTask, deletePlant, setActivePlant, availablePlants, addPlant, calendarData, refreshCalendar, loading, isGeneratingTasks, addTreatmentQuests } = useQuest()
  const [activeTab, setActiveTab ] = useState<'main' | 'daily' | 'treatment'>('main')
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(activePlantId ? 'detail' : 'list')
  const isAddingRef = useRef(false)
  const [isResolvingDirectOpen, setIsResolvingDirectOpen] = useState(!!searchParams.get('plant'))
  const selectedPlanType = searchParams.get('plan') as 'Budget' | 'Balanced' | 'Premium' | null
  const selectedSource = searchParams.get('source') as 'chosen_plant' | 'posted_order' | 'accepted_order' | null
  const selectedOrderId = searchParams.get('order')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'chosen_plant' | 'posted_order' | 'accepted_order'>('all')

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
  const { user } = useAuth()
  const [uploadTask, setUploadTask] = useState<{ id: string, name: string, xpGained: number } | null>(null)
  const [completionModalOpen, setCompletionModalOpen] = useState(false)
  const [modalData, setModalData] = useState<any>(null)
  const [healthReport, setHealthReport] = useState<PlantHealthReport | null>(null)
  const [healthImagePreview, setHealthImagePreview] = useState<string>('')
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [isCreatingTreatment, setIsCreatingTreatment] = useState(false)

  const handleUploadSuccess = async (photoUrl: string) => {
    if (activePlant && uploadTask) {
      await completeTask(activePlant.id, uploadTask.id, photoUrl)
      await onQuestSuccess(uploadTask.id, uploadTask.name, uploadTask.xpGained)
    }
    setUploadTask(null)
  }

  const activePlant = userPlants.find(p => p.id === activePlantId)
  const plantData = activePlant ? getQuestPlant(activePlant.plant_id) : null

  const mainQuests: Quest[] = useMemo(() => {
    if (!activePlant || !plantData) return []
    const rawMainQuests = activePlant.ai_tasks?.main || []
    const isLegacyData = rawMainQuests.some((q: any) => q.title === 'Dashboard Setup' || q.title === 'Seedling Care')
    const mainQuestsFromAI = isLegacyData ? [] : rawMainQuests

    if (mainQuestsFromAI.length > 0) {
      return mainQuestsFromAI.map((q: any, i: number) => {
        const taskKey = `main-${i}`
        const prevCompleted = i === 0 || mainQuestsFromAI.slice(0, i).every((_, prevIndex) => activePlant.task_state?.[`main-${prevIndex}`])
        return {
          id: taskKey,
          type: 'main',
          title: q.title,
          description: q.description,
          xp_reward: q.xp,
          status: activePlant.task_state?.[taskKey] ? 'completed' : (prevCompleted ? 'active' : 'locked'),
          isActionable: true,
          tasks: [{ id: taskKey, label: q.task_label, completed: !!activePlant.task_state?.[taskKey], category: 'setup', xp_reward: q.xp }],
        } as Quest
      })
    } else {
      return [{
        id: 'intro',
        type: 'main',
        title: 'Workspace Prep',
        description: `Set up your pots for your ${activePlant.plant_name}.`,
        xp_reward: 30,
        status: activePlant.task_state?.intro ? 'completed' : 'active',
        isActionable: true,
        tasks: [{ id: 'intro-t1', label: 'Prepared area', completed: !!activePlant.task_state?.intro, category: 'setup', xp_reward: 30 }],
      }]
    }
  }, [activePlant, plantData])

  const dailyTasks: any[] = useMemo(() => {
    if (!activePlant || !plantData) return []
    const aiDailyTasks = activePlant.ai_tasks?.daily?.map((label: string, i: number) => ({
      id: `daily-${i}`,
      label,
      completed: activePlant.task_state?.[`daily-${i}`] || false,
      category: 'care',
      xp_reward: 10
    }))
    
    if (aiDailyTasks && aiDailyTasks.length > 0) {
      // Always include the observation task (photo + AI health check) even with AI daily tasks
      const ruleEngineTasks = getTasksDueToday(activePlant, plantData)
      const observeTask = ruleEngineTasks.find(t => t.id.startsWith('observe'))
      return observeTask ? [...aiDailyTasks, observeTask] : aiDailyTasks
    }
    
    return getTasksDueToday(activePlant, plantData)
  }, [activePlant, plantData])

  const isDead = activePlant?.status === 'dead'
  const canEditActivePlant = activePlant ? (activePlant.source_category || 'chosen_plant') !== 'posted_order' : false
  const xpInfo = activePlant ? xpForNextLevel(activePlant.state.xp) : { current: 0, needed: 500, progress: 0 }
  const level = activePlant ? calculateLevel(activePlant.state.xp) : 1


  const onQuestSuccess = async (taskId: string, taskName: string, xpGained: number) => {
    if (!user || !activePlant) return
    
    const result = await completeQuest(user.uid, taskId, xpGained)
    
    let nextQuestTitle = undefined
    if (activeTab === 'main') {
      const currentIndex = mainQuests.findIndex(q => q.id === taskId)
      if (currentIndex !== -1 && currentIndex < mainQuests.length - 1) {
        nextQuestTitle = mainQuests[currentIndex + 1].title
      }
    } else {
      const currentIndex = dailyTasks.findIndex(t => t.id === taskId)
      if (currentIndex !== -1 && currentIndex < dailyTasks.length - 1) {
        nextQuestTitle = dailyTasks[currentIndex + 1].label
      }
    }

    setModalData({
      taskLabel: taskName,
      xpGained,
      newXP: result.newXP,
      newStreak: result.newStreak,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      plantGrowthPercent: Math.min(100, (activePlant.state.xp / 1000) * 100),
      nextQuestTitle
    })
    
    // Only show modal for daily/treatment tasks
    if (activeTab === 'daily' || activeTab === 'treatment') {
      setCompletionModalOpen(true)
    }
  }

  const handleTaskComplete = async (taskId: string, requiresPhoto: boolean | undefined, taskName: string, xpGained: number = 10) => {
    if (requiresPhoto) {
      setUploadTask({ id: taskId, name: taskName, xpGained })
    } else {
      if (activePlant) {
        await completeTask(activePlant.id, taskId)
        await onQuestSuccess(taskId, taskName, xpGained)
      }
    }
  }

  const handleHealthAnalysisComplete = (report: PlantHealthReport, imagePreview: string) => {
    setHealthReport(report)
    setHealthImagePreview(imagePreview)
    setShowHealthModal(true)
  }

  const handleCreateTreatmentQuests = async () => {
    if (!activePlant || !healthReport || !healthReport.diseaseDetected) return
    setIsCreatingTreatment(true)
    try {
      await addTreatmentQuests(activePlant.id, healthReport.treatmentSteps, healthReport)
      setShowHealthModal(false)
      setActiveTab('treatment')
    } catch (e) {
      console.error('Failed to create treatment quests:', e)
    } finally {
      setIsCreatingTreatment(false)
    }
  }

  const treatmentQuests = useMemo(() => {
    if (!activePlant) return []
    return activePlant.ai_tasks?.treatment || []
  }, [activePlant])

  const latestHealthReport = useMemo(() => {
    if (!activePlant?.health_reports?.length) return null
    return activePlant.health_reports[activePlant.health_reports.length - 1]
  }, [activePlant])



  // Handle auto-activation from search params (e.g. after adding a plant)
  useEffect(() => {
    if (activePlantId && viewMode === 'list') {
      setViewMode('detail')
    }
  }, [activePlantId, viewMode])

  useEffect(() => {
    const plantToAdd = searchParams.get('plant')
    if (plantToAdd && !loading && !isAddingRef.current) {
      const planToAdd = selectedPlanType || 'Budget'
      const sourceCategory = selectedSource || 'chosen_plant'
      const sharedProgressKey = selectedOrderId ? `marketplace-order-${selectedOrderId}` : undefined
      const existingPlant = userPlants.find(
        (plant) =>
          plant.plant_id === plantToAdd &&
          (plant.source_category || 'chosen_plant') === sourceCategory &&
          (sharedProgressKey ? plant.shared_progress_key === sharedProgressKey : true)
      )

      if (existingPlant) {
        setActivePlant(existingPlant.id)
        setViewMode('detail')
        setIsResolvingDirectOpen(false)
        router.replace('/quest/quests')
        return
      }

      isAddingRef.current = true
      setIsResolvingDirectOpen(true)
      addPlant(plantToAdd, planToAdd, sourceCategory, { sharedProgressKey }).then(newId => {
        if (newId) {
          setActivePlant(newId)
          setViewMode('detail')
          router.replace('/quest/quests')
        }
        }).finally(() => {
            isAddingRef.current = false
        })
    }
    }, [searchParams, addPlant, setActivePlant, selectedPlanType, selectedSource, selectedOrderId, router, userPlants])

  useEffect(() => {
    if (!searchParams.get('plant')) {
      setIsResolvingDirectOpen(false)
      return
    }
    if (activePlantId) {
      setIsResolvingDirectOpen(false)
    }
  }, [activePlantId, searchParams])

  useEffect(() => {
    if (activePlant) {
      const isUnacceptedPostedOrder = activePlant.source_category === 'posted_order' && !activePlant.is_accepted
      if (isUnacceptedPostedOrder) {
        router.push('/quest')
      }
    } else if (!activePlantId && !isResolvingDirectOpen && !isAddingRef.current && !isGeneratingTasks) {
      router.push('/quest')
    }
  }, [activePlant, activePlantId, isResolvingDirectOpen, isGeneratingTasks, router])

  const canEditPlant = (plant: { source_category?: 'chosen_plant' | 'posted_order' | 'accepted_order' }) => {
    return (plant.source_category || 'chosen_plant') !== 'posted_order'
  }

  const sortedPlants = useMemo(() => {
    return [...userPlants].sort((a, b) => {
      const aStatus = orderStatuses[a.id]
      const bStatus = orderStatuses[b.id]
      const aCompleted = aStatus === 'COMPLETED' || aStatus === 'completed' || a.state.growthStage === 3
      const bCompleted = bStatus === 'COMPLETED' || bStatus === 'completed' || b.state.growthStage === 3
      if (aCompleted && !bCompleted) return 1
      if (!aCompleted && bCompleted) return -1
      return 0
    })
  }, [userPlants, orderStatuses])


  const isDailyUnlocked = useMemo(() => {
    if (!activePlant) return false
    const rawMainQuests = activePlant.ai_tasks?.main || []
    const isLegacyData = rawMainQuests.some((q: any) => q.title === 'Dashboard Setup' || q.title === 'Seedling Care')
    const mainQuestsFromAI = isLegacyData ? [] : rawMainQuests

    if (mainQuestsFromAI.length > 0) {
      return mainQuestsFromAI.every((_, i) => activePlant.task_state?.[`main-${i}`])
    } else {
      return !!activePlant.task_state?.intro
    }
  }, [activePlant])

  const [showDailyUnlockedModal, setShowDailyUnlockedModal] = useState(false)
  const previousDailyUnlockedRef = useRef<boolean>(isDailyUnlocked)

  useEffect(() => {
    if (activePlant && isDailyUnlocked && !previousDailyUnlockedRef.current) {
      setShowDailyUnlockedModal(true)
    }
    previousDailyUnlockedRef.current = isDailyUnlocked
  }, [isDailyUnlocked, activePlant])

  const MainContent = () => {
    if (isResolvingDirectOpen || !activePlant) {
      return (
        <div className="quest-main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div className="quest-hub-no-tasks" style={{ padding: '3rem 1rem', width: '100%' }}>
            <span>🌿</span>
            <p>Loading your plant quest...</p>
          </div>
        </div>
      )
    }

    const hasNoTasks = !activePlant.ai_tasks || !activePlant.ai_tasks.main || activePlant.ai_tasks.main.length === 0

    if (isGeneratingTasks && hasNoTasks) {
       return (
        <div className="quest-main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div className="quest-hub-no-tasks" style={{ padding: '3rem 1rem', width: '100%' }}>
            <div className="mp-badge-dot" style={{ margin: '0 auto 16px', width: 12, height: 12 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Initializing Quest...</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Preparing your garden for the new plant.</p>
          </div>
        </div>
      )
    }

    // ── VIEW: PLANT DETAIL (QUESTS) ──
    if (!plantData) return null

    return (
      <div className="quest-main-content" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div className="quest-quests-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <button 
            onClick={() => {
              setActivePlant(null as any)
              router.push('/quest')
            }} 
            className="quest-back-btn"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid var(--glass-border)', 
              padding: '8px 16px', 
              borderRadius: '12px', 
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
          >
             <ArrowLeft size={18} /> Back
          </button>
          {activePlant.shared_progress_key?.startsWith('marketplace-order-') && (
            <Link href={`/marketplace/${activePlant.shared_progress_key.replace('marketplace-order-', '')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', background: 'rgba(94, 196, 130, 0.1)', border: '1px solid rgba(94, 196, 130, 0.2)', padding: '6px 12px', borderRadius: '10px' }}>
              <span>💬</span> Tracking & Chat
            </Link>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <PlantStatusCard
              plantName={activePlant.plant_name}
              plantEmoji={plantData.emoji}
              stage={activePlant.state.growthStage as any}
              streak={0}
              sourceCategory={activePlant.source_category || 'chosen_plant'}
              sunlight={plantData.sunlight_type}
              waterFrequency={plantData.water_frequency_days}
              startMethod={plantData.startMethod}
              status={(orderStatuses[activePlant.id] === 'COMPLETED' || orderStatuses[activePlant.id] === 'completed' || activePlant.state.growthStage === 3) ? 'completed' : 'in_progress'}
              trackingLink={activePlant.shared_progress_key?.startsWith('marketplace-order-') ? `/marketplace/${activePlant.shared_progress_key.replace('marketplace-order-', '')}` : undefined}
          />
          <div className="quest-xp-section">
             <div className="quest-xp-header-row">
                <div className="quest-lv-badge">Lv.{level} ⚡</div>
                <div className="quest-xp-counts">{xpInfo.current}/{xpInfo.needed} XP</div>
             </div>
             <div className="quest-xp-bar-track">
                <div className="quest-xp-bar-fill" style={{ width: `${xpInfo.progress}%` }} />
             </div>
          </div>

          {/* Growth Curve Chart */}
          <GrowthCurveChart
            plantData={plantData}
            createdAt={activePlant.created_at}
            currentStage={activePlant.state.growthStage}
            currentXP={activePlant.state.xp}
          />
        </div>

        {!canEditActivePlant && (
          <div style={{ marginBottom: '1.25rem', background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', color: '#fbbf24', borderRadius: '12px', padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700 }}>
            👁️ View only: This is your posted order. The farmer updates task progress.
          </div>
        )}



        {isDead ? (
          <div className="quest-daily-locked" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🥀</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Plant Withered</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
              This plant has reached the end of its journey. You can remove it to start a new quest in your garden.
            </p>
            {canEditActivePlant && (
              <button 
                className="btn-primary" 
                onClick={() => { 
                  deletePlant(activePlant.id); 
                  router.push('/quest?deleted=true'); 
                }}
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 32px' }}
              >
                Remove Plant
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="quest-tabs" style={{ marginBottom: '1.5rem' }}>
              <button className={`quest-tab ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>Main</button>
              <button className={`quest-tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>Daily {!isDailyUnlocked && '🔒'}</button>
              {treatmentQuests.length > 0 && (
                <button className={`quest-tab ${activeTab === 'treatment' ? 'active' : ''}`} onClick={() => setActiveTab('treatment')} style={{ position: 'relative' }}>
                  🩺 Treatment
                  {treatmentQuests.filter(q => !q.completed).length > 0 && (
                    <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  )}
                </button>
              )}
            </div>
            <div className="quest-daily-quest-section">
              {activeTab === 'main' ? (
                 <div className="quest-main-quests">
                    {mainQuests.map((q, idx) => (
                     <QuestCard 
                       key={q.id} 
                       quest={q} 
                       index={idx} 
                       isLast={idx === mainQuests.length - 1} 
                       readOnly={!canEditActivePlant} 
                       onComplete={(quest) => canEditActivePlant && handleTaskComplete(quest.id, quest.tasks[0]?.requires_photo, quest.title, quest.xp_reward || 30)} 
                     />
                   ))}
                 </div>
              ) : activeTab === 'daily' ? (
                 <div className="quest-daily-view">
                   {isDailyUnlocked ? (
                     <TaskList 
                       tasks={dailyTasks} 
                       readOnly={!canEditActivePlant} 
                       onComplete={(taskId) => {
                         const t = dailyTasks.find(dt => dt.id === taskId)
                         canEditActivePlant && handleTaskComplete(taskId, t?.requires_photo, t?.label || 'Task', t?.xp_reward || 10)
                       }} 
                     />
                   ) : (
                     <div className="quest-daily-locked-card">
                       <div className="quest-daily-locked-icon">🔒</div>
                       <h3>Daily Quests Locked</h3>
                       <div className="quest-daily-locked-hint">Finish all main quests to continue.</div>
                     </div>
                   )}
                 </div>
              ) : activeTab === 'treatment' ? (
                <div className="quest-daily-view">
                  {latestHealthReport && (
                    <TreatmentProgressCard
                      quests={treatmentQuests}
                      diseaseName={latestHealthReport.diseaseName}
                      severity={latestHealthReport.severity}
                      expectedBenefits={latestHealthReport.expectedBenefits}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {treatmentQuests.map((tq, i) => (
                      <TreatmentQuestCard
                        key={tq.id}
                        quest={tq}
                        index={i}
                        total={treatmentQuests.length}
                        readOnly={!canEditActivePlant}
                        onComplete={(questId) => {
                          if (activePlant && canEditActivePlant) {
                            completeTask(activePlant.id, questId)
                            onQuestSuccess(questId, tq.step, tq.xp_reward)
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
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
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
        <MainContent />
      </div>

      <ThemedModal
        isOpen={showDailyUnlockedModal}
        onClose={() => setShowDailyUnlockedModal(false)}
        onConfirm={() => {
          setShowDailyUnlockedModal(false)
          setActiveTab('daily')
        }}
        title="Daily Quests Unlocked!"
        message="You have completed all main tasks for this plant. Daily care quests are now available to keep your plant healthy!"
        confirmText="View Daily Quests"
        type="success"
      />

      {user && (
        <PhotoUploadModal
          isOpen={!!uploadTask}
          onClose={() => setUploadTask(null)}
          onUploadSuccess={handleUploadSuccess}
          userId={user.uid}
          taskName={uploadTask?.name}
          plantName={activePlant?.plant_name}
          plantEmoji={plantData?.emoji}
          plantId={activePlant?.plant_id}
          instanceId={activePlant?.id}
          isCareTask={uploadTask?.id?.startsWith('observe') || false}
          onHealthAnalysisComplete={handleHealthAnalysisComplete}
        />
      )}

      <PlantHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        report={healthReport}
        plantName={activePlant?.plant_name || ''}
        plantEmoji={plantData?.emoji || '🌱'}
        imagePreview={healthImagePreview}
        onCreateTreatmentQuests={handleCreateTreatmentQuests}
        isCreatingQuests={isCreatingTreatment}
      />

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

export default function QuestsPage() {
  return (
    <Suspense fallback={
      <div className="quest-page" style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="quest-hub-no-tasks"><span>🌿</span><p>Loading your quests...</p></div>
      </div>
    }>
      <QuestsContent />
    </Suspense>
  )
}
