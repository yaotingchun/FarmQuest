import db from '@/data/plants.json';

// --- Types ---
export interface UserPreference {
  sunlight: string;
  time_commitment: 'low' | 'medium' | 'high';
  goal: string;
  temperature: number;
}

export interface RecommendationResult {
  plant_id: string;
  name: string;
  difficulty: string;
  estimated_growth_days: number;
  match_score: number;
}

// --- Hardcoded User Preferences ---
export const MOCK_USER_PREFERENCE: UserPreference = {
  sunlight: "full_sun",
  time_commitment: "low",
  goal: "food",
  temperature: 30
};

// --- Helper Functions ---
function checkTimeCommitment(commitment: 'low' | 'medium' | 'high', plantMinutes: number): boolean {
  if (commitment === 'low') return plantMinutes <= 15;
  if (commitment === 'medium') return plantMinutes <= 30;
  return true; // 'high' can accommodate any time
}

// --- Scoring Engine ---
export function rankPlantsByPreferences(userPrefs: UserPreference): RecommendationResult[] {
  const plants = db.plants;

  const scoredPlants = plants.map((plant) => {
    let score = 0;

    // 1. Temperature Match (Crucial for survival, highest weight)
    if (userPrefs.temperature >= plant.temp_min && userPrefs.temperature <= plant.temp_max) {
      score += 30;
    }

    // 2. Sunlight Match
    if (userPrefs.sunlight === plant.sunlight) {
      score += 20;
    }

    // 3. Goal Match
    // Matches if the goal exists in the plant's goals array, or if it matches the 'type' directly
    if (plant.goals.includes(userPrefs.goal) || plant.type === userPrefs.goal) {
      score += 20;
    }

    // 4. Time Commitment Match
    if (checkTimeCommitment(userPrefs.time_commitment, plant.weekly_time_minutes)) {
      score += 15;
    }

    return {
      plant_id: plant.plant_id,
      name: plant.name,
      difficulty: plant.difficulty,
      estimated_growth_days: plant.growth_days,
      match_score: score
    };
  });

  // Sort descending by score
  scoredPlants.sort((a, b) => b.match_score - a.match_score);

  return scoredPlants;
}

// Note: A simple test/console.log could be executed to verify the output.
// console.log(rankPlantsByPreferences(MOCK_USER_PREFERENCE));
