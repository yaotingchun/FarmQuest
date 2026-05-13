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

function QuestsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userPlants, activePlantId, completeTask, deletePlant, setActivePlant, availablePlants, addPlant, calendarData, refreshCalendar, isGeneratingTasks } = useQuest()
  const [activeTab, setActiveTab ] = useState<'main' | 'daily'>('main')
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(activePlantId ? 'detail' : 'list')
  const isAddingRef = useRef(false)
  const [isResolvingDirectOpen, setIsResolvingDirectOpen] = useState(!!searchParams.get('plant'))
  const selectedPlanType = searchParams.get('plan') as 'Budget' | 'Balanced' | 'Premium' | null
  const selectedSource = searchParams.get('source') as 'chosen_plant' | 'posted_order' | 'accepted_order' | null
  const selectedOrderId = searchParams.get('order')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'chosen_plant' | 'posted_order' | 'accepted_order'>('all')

  const { user } = useAuth()
  const [uploadTask, setUploadTask] = useState<{ id: string, name: string } | null>(null)

  const handleTaskComplete = (taskId: string, requiresPhoto: boolean | undefined, taskName: string) => {
    if (requiresPhoto) {
      setUploadTask({ id: taskId, name: taskName })
    } else {
      if (activePlant) completeTask(activePlant.id, taskId)
    }
  }

  const handleUploadSuccess = (photoUrl: string) => {
    if (activePlant && uploadTask) {
      completeTask(activePlant.id, uploadTask.id, photoUrl)
    }
    setUploadTask(null)
  }


  // Handle auto-activation from search params (e.g. after adding a plant)
  useEffect(() => {
    if (activePlantId && viewMode === 'list') {
      setViewMode('detail')
    }
  }, [activePlantId, viewMode])

  useEffect(() => {
    const plantToAdd = searchParams.get('plant')
    if (plantToAdd && !isAddingRef.current) {
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

  const activePlant = userPlants.find(p => p.id === activePlantId)

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
    const plantData = getQuestPlant(activePlant.plant_id)
    if (!plantData) return null
    const isDead = activePlant.status === 'dead'
    const canEditActivePlant = canEditPlant(activePlant)
    const xpInfo = xpForNextLevel(activePlant.state.xp)
    const level = calculateLevel(activePlant.state.xp)
    const rawMainQuests = activePlant.ai_tasks?.main || []
    const isLegacyData = rawMainQuests.some((q: any) => q.title === 'Dashboard Setup' || q.title === 'Seedling Care')
    const mainQuestsFromAI = isLegacyData ? [] : rawMainQuests

    const mainQuests: Quest[] = mainQuestsFromAI.length > 0
      ? mainQuestsFromAI.map((q: any, i: number) => {
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
      : [{
          id: 'intro',
          type: 'main',
          title: 'Workspace Prep',
          description: `Set up your pots for your ${activePlant.plant_name}.`,
          xp_reward: 30,
          status: activePlant.task_state?.intro ? 'completed' : 'active',
          isActionable: true,
          tasks: [{ id: 'intro-t1', label: 'Prepared area', completed: !!activePlant.task_state?.intro, category: 'setup', xp_reward: 30 }],
        }]

    const isDailyUnlocked = mainQuests.every((q) => q.status === 'completed')
    const dailyTasks: any[] = activePlant.ai_tasks?.daily?.map((label: string, i: number) => ({
      id: `daily-${i}`,
      label,
      completed: activePlant.task_state?.[`daily-${i}`] || false,
      category: 'care',
      xp_reward: 10
    })) || getTasksDueToday(activePlant, plantData)

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
          <div className="quest-ai-badge" style={{ fontSize: '0.65rem', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(167, 139, 250, 0.2)', fontWeight: 700 }}>
             ✨ AI OPTIMIZED
          </div>
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
                       onComplete={(quest) => canEditActivePlant && handleTaskComplete(quest.id, quest.tasks[0]?.requires_photo, quest.title)} 
                     />
                   ))}
                 </div>
              ) : (
                 <div className="quest-daily-view">
                   {isDailyUnlocked ? (
                     <TaskList 
                       tasks={dailyTasks} 
                       readOnly={!canEditActivePlant} 
                       onComplete={(taskId) => {
                         const t = dailyTasks.find(dt => dt.id === taskId)
                         canEditActivePlant && handleTaskComplete(taskId, t?.requires_photo, t?.label || 'Task')
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
              )}
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
