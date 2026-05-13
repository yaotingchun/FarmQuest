export interface CompletionMessage {
  title: string
  body: string
}

export const MESSAGES = {
  watering: [
    { title: "Quenching Thirst!", body: "Your plant feels refreshed and revitalized. You can almost see the leaves perking up!" },
    { title: "Liquid Love", body: "Every drop counts. Your plant is soaking up the hydration it needs to grow strong." },
    { title: "Hydration Hero", body: "Nature's best fuel! Your plant is grateful for the drink." },
  ],
  pest_check: [
    { title: "Guardian of the Garden", body: "Your watchful eye keeps the garden safe. No pests are getting past you today!" },
    { title: "All Clear!", body: "Clean leaves and a healthy plant. You're doing a great job monitoring its health." },
    { title: "Leaf Inspector", body: "Spotless and strong! Your plant is lucky to have such a careful caretaker." },
  ],
  fertilizing: [
    { title: "Supercharged Growth!", body: "A boost of nutrients to help your plant reach new heights. Watch it thrive!" },
    { title: "Nutrient Boost", body: "The secret ingredient for a flourishing plant. You're providing the perfect fuel." },
    { title: "Feast for the Flora", body: "Your plant is eating well tonight! Expect some vigorous growth soon." },
  ],
  general: [
    { title: "Great Work!", body: "Your plant is thriving thanks to your consistent care and attention." },
    { title: "Green Thumb in Action", body: "Every small action makes a big difference. Keep nurturing your green friends!" },
    { title: "Plant Parent Goals", body: "You're building a beautiful bond with your plant. It shows in how healthy it looks!" },
  ],
}

export const STREAK_MILESTONES: Record<number, CompletionMessage> = {
  3: { title: "3-Day Streak!", body: "You're getting into a rhythm! Consistency is the key to a beautiful garden." },
  7: { title: "Week-Long Commitment!", body: "A full week of dedicated care! Your garden is really starting to reflect your effort." },
  14: { title: "Fortnight of Flora!", body: "Two weeks of perfect care. You're becoming a true master of the garden!" },
  30: { title: "Monthly Master!", body: "Thirty days! You've officially formed a deep bond with your plants. Amazing dedication!" },
}

export function pickMessage(taskLabel: string, streak: number): CompletionMessage {
  // 1. Check for streak milestone first
  if (STREAK_MILESTONES[streak]) {
    return STREAK_MILESTONES[streak]
  }

  // 2. Match task type by keyword
  const label = taskLabel.toLowerCase()
  let pool = MESSAGES.general

  if (label.includes('water')) {
    pool = MESSAGES.watering
  } else if (label.includes('pest') || label.includes('check') || label.includes('inspect')) {
    pool = MESSAGES.pest_check
  } else if (label.includes('fertiliz')) {
    pool = MESSAGES.fertilizing
  }

  // 3. Random message from pool
  const randomIndex = Math.floor(Math.random() * pool.length)
  return pool[randomIndex]
}
