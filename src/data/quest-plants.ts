import type { QuestPlantData } from '@/types/quest'
import plantsJson from './plants.json'

/**
 * Maps the water level string from plants.json to a numeric frequency in days.
 */
function waterToDays(w: string): number {
  if (w === 'high') return 1
  if (w === 'medium') return 3
  return 7 // low
}

/**
 * Derives growth stage durations from total growth_days.
 * Seed = 15%, Sprout = 30%, Mature = 40%, Harvest = 15%
 */
function deriveStages(totalDays: number) {
  const seed = Math.max(3, Math.round(totalDays * 0.15))
  const sprout = Math.max(5, Math.round(totalDays * 0.30))
  const mature = Math.max(7, Math.round(totalDays * 0.40))
  const harvest = Math.max(3, Math.round(totalDays * 0.15))
  return {
    seed: { duration_days: seed, description: 'Keep warm and lightly moist. Observe daily for first signs of life.' },
    sprout: { duration_days: sprout, description: 'Regular watering begins. Introduce light fertilizer. Watch for pests.' },
    mature: { duration_days: mature, description: 'Full care schedule active. Prune, rotate, and fertilize regularly.' },
    harvest: { duration_days: harvest, description: 'Your plant is ready! Complete special harvest quests.' },
  }
}

/**
 * Derives risk factors from plant characteristics.
 */
function deriveRisks(plant: typeof plantsJson.plants[0]): string[] {
  const risks: string[] = []
  if (plant.water === 'high') risks.push('overwatering')
  if (plant.water === 'low') risks.push('underwatering')
  if (plant.humidity_max > 75) risks.push('fungal growth')
  if (plant.temp_max > 35) risks.push('heat stress')
  if (plant.temp_min < 15) risks.push('cold sensitivity')
  risks.push('pests')
  return risks
}

/**
 * Derives pot size from plant type and growth days.
 */
function derivePotSize(plant: typeof plantsJson.plants[0]): string {
  if (plant.growth_days <= 30) return 'Small (15–20cm diameter)'
  if (plant.growth_days <= 90) return 'Medium (20–30cm diameter)'
  return 'Large (30–40cm diameter)'
}

/**
 * Maps emoji based on plant type.
 */
const TYPE_EMOJI: Record<string, string> = {
  food: '🌱',
  herb: '🌿',
  flower: '🌸',
  air_purifying: '🍃',
  decorative: '🪴',
  medicinal: '🌵',
}

/**
 * Build the extended quest plant knowledge base from existing plants.json.
 * This is the single source of truth for all care rules.
 */
export const QUEST_PLANTS: QuestPlantData[] = plantsJson.plants.map((p) => ({
  plant_id: p.plant_id,
  name: p.name,
  emoji: TYPE_EMOJI[p.type] || '🌱',
  water_frequency_days: waterToDays(p.water),
  sunlight_type: p.sunlight,
  fertilize_interval_days: p.growth_days <= 30 ? 14 : 10,
  prune_interval_days: p.growth_days <= 45 ? 30 : 21,
  risk_factors: deriveRisks(p),
  growth_stages: deriveStages(p.growth_days),
  pot_size: derivePotSize(p),
  seed_depth_cm: p.type === 'herb' ? 0.5 : p.type === 'food' ? 2 : 1,
  soil_type: p.water === 'low' ? 'Well-draining sandy mix' : p.water === 'high' ? 'Rich moisture-retaining mix' : 'Balanced potting mix',
}))

/**
 * Lookup a quest plant by ID.
 */
export function getQuestPlant(plantId: string): QuestPlantData | undefined {
  return QUEST_PLANTS.find((p) => p.plant_id === plantId)
}
