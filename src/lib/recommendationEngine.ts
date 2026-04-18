import db from '@/data/plants.json';

// --- Types ---
export interface UserPreference {
  sunlight: string;
  time_commitment: 'low' | 'medium' | 'high';
  goal: string;
  temperature: number;
  humidity: number;          // relative humidity %
  rainfall: number;          // mm/day
  sunlight_hours: number;    // hours of sunshine per day
}

export interface RecommendationResult {
  plant_id: string;
  name: string;
  difficulty: string;
  estimated_growth_days: number;
  match_score: number;       // 0–100
}

// --- Hardcoded User Preferences ---
export const MOCK_USER_PREFERENCE: UserPreference = {
  sunlight: "full_sun",
  time_commitment: "low",
  goal: "food",
  temperature: 30,
  humidity: 70,
  rainfall: 3,
  sunlight_hours: 8
};

// --- Helper Functions ---
function checkTimeCommitment(commitment: 'low' | 'medium' | 'high', plantMinutes: number): boolean {
  if (commitment === 'low') return plantMinutes <= 15;
  if (commitment === 'medium') return plantMinutes <= 30;
  return true; // 'high' can accommodate any time
}

/** Map daily rainfall (mm) to plant water-need level */
function rainfallToWaterLevel(mm: number): string {
  if (mm >= 5)  return 'high';
  if (mm >= 1)  return 'medium';
  return 'low';
}

/** Map daily sunshine hours to a sunlight category */
function sunHoursToCategory(hours: number): string {
  if (hours >= 6) return 'full_sun';
  if (hours >= 3) return 'partial';
  return 'low_light';
}

// --- Scoring Engine ---
// Max possible score = 100
//   Temperature fit   : 25
//   Humidity fit       : 15
//   Sunlight match    : 15
//   Sunlight-hours    :  5  (bonus when live data confirms the user's pick)
//   Goal match        : 15
//   Rainfall/water    : 15
//   Time commitment   : 10
export function rankPlantsByPreferences(userPrefs: UserPreference): RecommendationResult[] {
  const plants = db.plants;

  const derivedWater = rainfallToWaterLevel(userPrefs.rainfall);
  const derivedSunlight = sunHoursToCategory(userPrefs.sunlight_hours);

  const scoredPlants = plants.map((plant) => {
    let score = 0;

    // 1. Temperature (25 pts) — core survival factor
    if (userPrefs.temperature >= plant.temp_min && userPrefs.temperature <= plant.temp_max) {
      score += 25;
    }

    // 2. Humidity (15 pts) — within plant's ideal range
    if (userPrefs.humidity >= plant.humidity_min && userPrefs.humidity <= plant.humidity_max) {
      score += 15;
    }

    // 3. Sunlight match (15 pts) — user-declared preference
    if (userPrefs.sunlight === plant.sunlight) {
      score += 15;
    }

    // 4. Sunlight-hours bonus (5 pts) — live data confirms the pick
    if (derivedSunlight === plant.sunlight) {
      score += 5;
    }

    // 5. Goal match (15 pts)
    if (plant.goals.includes(userPrefs.goal) || plant.type === userPrefs.goal) {
      score += 15;
    }

    // 6. Rainfall / Water alignment (15 pts)
    if (derivedWater === plant.water) {
      score += 15;
    }

    // 7. Time commitment (10 pts)
    if (checkTimeCommitment(userPrefs.time_commitment, plant.weekly_time_minutes)) {
      score += 10;
    }

    return {
      plant_id: plant.plant_id,
      name: plant.name,
      difficulty: plant.difficulty,
      estimated_growth_days: plant.growth_days,
      match_score: score,
    };
  });

  // Sort descending by score
  scoredPlants.sort((a, b) => b.match_score - a.match_score);

  return scoredPlants;
}

// Note: A simple test/console.log could be executed to verify the output.
// console.log(rankPlantsByPreferences(MOCK_USER_PREFERENCE));
