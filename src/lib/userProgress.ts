import { db } from './firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export async function completeQuest(userId: string, questId: string, xpGained: number) {
  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)

  let oldXP = 0
  let oldStreak = 0
  let lastActiveDate: any = null

  if (userSnap.exists()) {
    const data = userSnap.data()
    oldXP = data.xp || 0
    oldStreak = data.streak || 0
    lastActiveDate = data.lastActiveDate?.toDate() || null
  }

  const oldLevel = Math.floor(oldXP / 500) + 1

  // Streak logic
  let newStreak = 1
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (lastActiveDate) {
    const lastDate = new Date(lastActiveDate)
    lastDate.setHours(0, 0, 0, 0)

    const diffTime = today.getTime() - lastDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Already active today
      newStreak = oldStreak || 1
    } else if (diffDays === 1) {
      // Consecutive day
      newStreak = (oldStreak || 0) + 1
    } else {
      // Streak broken
      newStreak = 1
    }
  } else {
    newStreak = 1
  }

  const newXP = oldXP + xpGained
  const newLevel = Math.floor(newXP / 500) + 1
  const leveledUp = newLevel > oldLevel

  await setDoc(userRef, {
    xp: newXP,
    streak: newStreak,
    lastActiveDate: serverTimestamp(),
    level: newLevel
  }, { merge: true })

  return {
    newXP,
    newStreak,
    leveledUp,
    newLevel
  }
}
