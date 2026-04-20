import type { LLMQuestContent, GrowthStage } from '@/types/quest'

/**
 * Static fallback templates used when LLM is unavailable.
 * All templates use {plant_name} placeholder for simple substitution.
 */

// ── Main Quest Templates ──
export const MAIN_QUEST_TEMPLATES = [
  {
    title: 'Prepare Your Pot',
    description: 'Get the perfect home ready for your {plant_name}. The right pot makes all the difference!',
    tasks: [
      'Choose the correct pot size for your {plant_name}',
      'Confirm drainage holes exist at the bottom',
      'Add a base layer of gravel or broken pottery for drainage',
    ],
  },
  {
    title: 'Plant Your Seed',
    description: 'Time to give your {plant_name} its new beginning. Follow these steps carefully!',
    tasks: [
      'Fill the pot with nutrient-appropriate soil',
      'Insert seed or seedling at the correct depth',
      'Cover gently and pat the soil down',
    ],
  },
  {
    title: 'First Care',
    description: 'Your {plant_name} is planted! Now give it the first dose of love and care.',
    tasks: [
      'Water gently until soil is moist (not soaked)',
      'Place in the correct sunlight position',
      'Log your {plant_name} in the app to begin tracking',
    ],
  },
]

// ── Daily Quest Templates by Category & Stage ──
export const DAILY_TEMPLATES: Record<GrowthStage, { care: string[]; growth: string[]; observation: string[] }> = {
  seed: {
    care: [
      'Lightly water your {plant_name} — keep soil moist but not soggy',
      'Ensure your {plant_name} is in a warm spot',
      'Mist the soil surface gently',
    ],
    growth: [
      'Check if seedling has broken through the soil',
    ],
    observation: [
      'Check soil moisture level by touch',
      'Inspect the soil surface for mold or dryness',
      'Note any signs of germination',
    ],
  },
  sprout: {
    care: [
      'Water your {plant_name} according to schedule',
      'Rotate pot quarter-turn for even light exposure',
      'Mist leaves if the air feels dry',
    ],
    growth: [
      'Apply a light dose of fertilizer',
      'Check if your {plant_name} needs a support stake',
    ],
    observation: [
      'Check soil moisture level',
      'Inspect new leaves for pest damage',
      'Measure and log current plant height',
    ],
  },
  mature: {
    care: [
      'Water your {plant_name} thoroughly',
      'Rotate pot for balanced growth',
      'Clean dust from leaves with a damp cloth',
    ],
    growth: [
      'Fertilize with appropriate nutrients',
      'Prune any dead or yellowing leaves',
      'Check if repotting is needed',
    ],
    observation: [
      'Check soil moisture and drainage',
      'Inspect all leaves and stems for pests',
      'Log notable growth changes',
    ],
  },
  harvest: {
    care: [
      'Give your {plant_name} a final thorough watering',
      'Ensure maximum sunlight for ripening',
    ],
    growth: [
      'Check harvest readiness',
      'Prepare harvest tools and containers',
    ],
    observation: [
      'Inspect for harvest-ready indicators',
      'Document your {plant_name}\'s final stage with a photo',
      'Celebrate your successful harvest! 🎉',
    ],
  },
}

// ── Recovery Quest Templates ──
export const RECOVERY_TEMPLATES: LLMQuestContent[] = [
  {
    title: 'Your {plant_name} misses you — let\'s bring it back together',
    description: 'It\'s been a while since your last care session. Let\'s get {plant_name} back on track with some extra love.',
    tasks: [
      'Check soil moisture and water if dry',
      'Inspect for any signs of stress or wilting',
      'Remove any dead leaves or debris',
      'Move to optimal sunlight position',
      'Log current plant condition',
    ],
  },
  {
    title: 'Recovery Mission: Save your {plant_name}!',
    description: 'Your {plant_name} needs some emergency care. Follow these steps to nurse it back to health.',
    tasks: [
      'Deeply water the soil until moisture appears at drainage holes',
      'Trim any yellowed or damaged leaves',
      'Check for root rot and pests',
      'Apply a gentle nutrient boost',
      'Set a reminder for tomorrow\'s check-in',
    ],
  },
]

// ── Milestone Templates ──
export const MILESTONE_TEMPLATES: Record<GrowthStage, LLMQuestContent> = {
  seed: {
    title: '🌱 The Journey Begins!',
    description: 'You\'ve planted your {plant_name}! The first step in an amazing growing journey.',
    tasks: ['Take a photo of your freshly planted {plant_name}'],
  },
  sprout: {
    title: '🌿 First Sprout! Your {plant_name} is alive!',
    description: 'Amazing — your {plant_name} has sprouted! The first green leaves are showing.',
    tasks: ['Celebrate your first sprout!', 'Take a photo to mark this milestone'],
  },
  mature: {
    title: '🌳 Fully Grown! {plant_name} is thriving!',
    description: 'Your {plant_name} has reached full maturity. You\'re officially a skilled grower!',
    tasks: ['Admire your fully grown {plant_name}', 'Share your progress with the community'],
  },
  harvest: {
    title: '🎉 Harvest Day! Time to reap the rewards!',
    description: 'The moment you\'ve been waiting for — your {plant_name} is ready to harvest!',
    tasks: ['Harvest your {plant_name}', 'Take a celebratory photo', 'Log your harvest weight'],
  },
}

/**
 * Replace {plant_name} placeholders in a template.
 */
export function fillTemplate(content: LLMQuestContent, plantName: string): LLMQuestContent {
  return {
    title: content.title.replace(/\{plant_name\}/g, plantName),
    description: content.description.replace(/\{plant_name\}/g, plantName),
    tasks: content.tasks.map(t => t.replace(/\{plant_name\}/g, plantName)),
  }
}

/**
 * Get a random recovery template, filled with plant name.
 */
export function getRecoveryTemplate(plantName: string): LLMQuestContent {
  const template = RECOVERY_TEMPLATES[Math.floor(Math.random() * RECOVERY_TEMPLATES.length)]
  return fillTemplate(template, plantName)
}

/**
 * Get main quest templates, filled with plant name.
 */
export function getMainQuestTemplates(plantName: string): LLMQuestContent[] {
  return MAIN_QUEST_TEMPLATES.map(t => fillTemplate(t, plantName))
}
