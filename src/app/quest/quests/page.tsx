'use client'

import { useState, useEffect, useRef } from 'react'
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

export default function QuestsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userPlants, activePlantId, completeTask, deletePlant, setActivePlant, availablePlants, addPlant, calendarData, refreshCalendar } = useQuest()
  const [activeTab, setActiveTab ] = useState<'main' | 'daily'>('main')
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(activePlantId ? 'detail' : 'list')
  const isAddingRef = useRef(false)
  const selectedPlantId = searchParams.get('plant')


  // Handle auto-activation from search params (e.g. after adding a plant)
  useEffect(() => {
    if (activePlantId && viewMode === 'list') {
      setViewMode('detail')
    }
  }, [activePlantId, viewMode])

  useEffect(() => {
    const plantToAdd = searchParams.get('plant')
    if (plantToAdd && !isAddingRef.current) {
        const planToAdd = searchParams.get('plan') as any || 'Budget'
        isAddingRef.current = true
        addPlant(plantToAdd, planToAdd).then(newId => {
            if (newId) {
                setActivePlant(newId)
                setViewMode('detail')
            }
        }).finally(() => {
            isAddingRef.current = false
        })
    }
  }, [searchParams, addPlant, setActivePlant])

  const activePlant = userPlants.find(p => p.id === activePlantId)


  const MainContent = () => {
    // ── VIEW: PLANT LIST (HUB) ──
    if (viewMode === 'list' || !activePlant) {
      const allTasksWrapped = getAllTasksDueToday(userPlants, getQuestPlant)

      return (
        <div className="quest-main-content">
          <div className="quest-hub-header" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="quest-hub-title" style={{ fontSize: '1.85rem' }}>My Garden Hub</h1>
                <p className="quest-hub-sub">Select a plant to view specialized quests</p>
              </div>
              <Link href="/" style={{ 
                textDecoration: 'none', 
                color: 'var(--text-muted)', 
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '8px 12px',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px'
              }}>
                Back to Site
              </Link>
            </div>
          </div>

          {/* Daily Tasks Section */}
          {userPlants.length > 0 && allTasksWrapped.length > 0 && (
            <div className="quest-hub-tasks-section" style={{ marginBottom: '2.5rem' }}>
              <div className="quest-hub-tasks-header" style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>⚡ Today&apos;s Actions Needed</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {allTasksWrapped.map(({ plant, task, plantData }) => (
                   <div 
                      key={task.id} 
                      className={`quest-task-item ${task.completed ? 'completed' : ''}`}
                      onClick={() => !task.completed && completeTask(plant.id, task.id)}
                      style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
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
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

          <div className="quest-section-header" style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>🌱 My Plants</h2>
          </div>

          {userPlants.length === 0 ? (
            <div className="quest-hub-no-tasks" style={{ padding: '4rem 1rem' }}>
              <span>🌱</span>
              <p>Your garden is currently empty.</p>
              <button className="btn-primary" onClick={() => router.push('/recommendations')} style={{ marginTop: '1.5rem' }}>
                Start Planting
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {userPlants.map(plant => {
                const pData = getQuestPlant(plant.plant_id)
                if (!pData) return null
                return (
                  <div 
                    key={plant.id} 
                    onClick={() => {
                      setActivePlant(plant.id)
                      setViewMode('detail')
                    }}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    <PlantStatusCard
                      plantName={plant.plant_name}
                      plantEmoji={pData.emoji}
                      stage={plant.state.growthStage as any}
                      streak={0}
                      sunlight={pData.sunlight_type}
                      waterFrequency={pData.water_frequency_days}
                      startMethod={pData.startMethod}
                    />
                    <div style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      View Quests →
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    // ── VIEW: PLANT DETAIL (QUESTS) ──
    const plantData = getQuestPlant(activePlant.plant_id)
    if (!plantData) return null
    const isDead = activePlant.status === 'dead'
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
            tasks: [{ id: taskKey, label: q.task_label, completed: !!activePlant.task_state?.[taskKey], category: 'growth', xp_reward: q.xp }],
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
          tasks: [{ id: 'intro-t1', label: 'Prepared area', completed: !!activePlant.task_state?.intro, category: 'growth', xp_reward: 30 }],
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
      <div className="quest-main-content">
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

        {isDead ? (
          <div className="quest-daily-locked">
            <h3>Plant Withered</h3>
            <button className="quest-delete-btn" onClick={() => { deletePlant(activePlant.id); setViewMode('list'); }}>Remove Plant</button>
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
                     <QuestCard key={q.id} quest={q} index={idx} onComplete={(quest) => completeTask(activePlant.id, quest.id)} />
                   ))}
                 </div>
              ) : (
                 <div className="quest-daily-view">
                   {isDailyUnlocked ? (
                     <TaskList tasks={dailyTasks} onComplete={(taskId) => completeTask(activePlant.id, taskId)} />
                   ) : (
                     <div className="quest-daily-locked">🔒 Complete Main Quests first</div>
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
      paddingTop: '3rem',
      paddingBottom: '4rem'
    }}>
      <div style={{ width: '100%', maxWidth: '840px', margin: '0 auto' }}>
        <MainContent />
      </div>
    </div>
  )
}
