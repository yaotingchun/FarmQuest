import type { LLMQuestContent, PlantState, QuestPlantData, GrowthStage } from '@/types/quest'
import { fillTemplate, getRecoveryTemplate, getMainQuestTemplates, MILESTONE_TEMPLATES, DAILY_TEMPLATES } from './staticTemplates'
import { calculateGrowthStage } from './ruleEngine'

const CACHE_KEY = 'fq_quest_llm_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  content: LLMQuestContent
  timestamp: number
  key: string
}

/**
 * Check if we have a valid cached LLM response.
 */
function getCached(cacheKey: string): LLMQuestContent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entries: CacheEntry[] = JSON.parse(raw)
    const entry = entries.find(e => e.key === cacheKey)
    if (!entry) return null
    if (Date.now() - entry.timestamp > CACHE_TTL) return null
    return entry.content
  } catch {
    return null
  }
}

/**
 * Store an LLM response in cache.
 */
function setCache(cacheKey: string, content: LLMQuestContent): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const entries: CacheEntry[] = raw ? JSON.parse(raw) : []
    const filtered = entries.filter(e => e.key !== cacheKey)
    filtered.push({ key: cacheKey, content, timestamp: Date.now() })
    // Keep max 20 entries
    if (filtered.length > 20) filtered.shift()
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered))
  } catch {
    // Silent fail — cache is optional
  }
}

/**
 * Call the LLM server action to generate quest content.
 * Falls back to static template on any failure.
 */
async function callLLM(
  plantState: PlantState,
  plant: QuestPlantData,
  taskLabels: string[],
  type: 'daily' | 'recovery' | 'milestone'
): Promise<LLMQuestContent | null> {
  try {
    const { generateQuestContent } = await import('@/app/actions/questAI')
    const result = await generateQuestContent({
      plant_name: plant.name,
      growth_stage: plantState.current_stage,
      water_frequency: plant.water_frequency_days,
      sunlight: plant.sunlight_type,
      hydration: plantState.hydration,
      health: plantState.health,
      tasks_due: taskLabels,
      streak: plantState.streak_count,
      type,
    })
    if (result && result.title && result.description && Array.isArray(result.tasks)) {
      return result
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get formatted daily quest content — tries LLM with cache, falls back to static.
 */
export async function getDailyQuestContent(
  state: PlantState,
  plant: QuestPlantData,
  taskLabels: string[]
): Promise<LLMQuestContent> {
  const todayStr = new Date().toISOString().split('T')[0]
  const cacheKey = `daily-${plant.plant_id}-${todayStr}`

  // 1. Check cache
  const cached = getCached(cacheKey)
  if (cached) return cached

  // 2. Try LLM
  const llmResult = await callLLM(state, plant, taskLabels, 'daily')
  if (llmResult) {
    setCache(cacheKey, llmResult)
    return llmResult
  }

  // 3. Fall back to static template
  const stage = calculateGrowthStage(state, plant)
  const templates = DAILY_TEMPLATES[stage]
  return {
    title: `Daily Care for ${plant.name}`,
    description: `Your ${plant.name} needs attention today. Complete these tasks to keep it healthy and growing.`,
    tasks: [
      ...templates.care.slice(0, 2),
      ...templates.observation.slice(0, 1),
    ].map(t => t.replace(/\{plant_name\}/g, plant.name)),
  }
}

/**
 * Get formatted recovery quest content.
 */
export async function getRecoveryQuestContent(
  state: PlantState,
  plant: QuestPlantData
): Promise<LLMQuestContent> {
  const cacheKey = `recovery-${plant.plant_id}-${Date.now()}`

  const llmResult = await callLLM(state, plant, [], 'recovery')
  if (llmResult) {
    setCache(cacheKey, llmResult)
    return llmResult
  }

  return getRecoveryTemplate(plant.name)
}

/**
 * Get formatted milestone content.
 */
export async function getMilestoneContent(
  plant: QuestPlantData,
  stage: GrowthStage
): Promise<LLMQuestContent> {
  const cacheKey = `milestone-${plant.plant_id}-${stage}`

  const cached = getCached(cacheKey)
  if (cached) return cached

  // For milestones, just use static templates (they're celebratory and don't need LLM variety)
  const content = fillTemplate(MILESTONE_TEMPLATES[stage], plant.name)
  setCache(cacheKey, content)
  return content
}

/**
 * Get main quest content (always static — these are standard setup steps).
 */
export function getMainQuestContent(plantName: string): LLMQuestContent[] {
  return getMainQuestTemplates(plantName)
}
