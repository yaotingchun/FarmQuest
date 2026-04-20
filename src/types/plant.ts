// ── Plant Data Types ──

export type Difficulty = "easy" | "medium" | "hard" | "Easy" | "Medium" | "Hard";

export interface SoilComponent {
  component: string;
  percentage: number;
}

export interface NutritionStage {
  stage: string;
  npk: string;
  type: string;
  frequency: string;
}

export interface AIPlan extends PlantSetup {
  plan_type: "Budget" | "Balanced" | "Premium";
  cost?: number;
  currency?: string;
  explanation?: string;
  ai_details?: {
    pot_reason?: string;
    soil_reason?: string;
  };
}

export interface PlantSetup {
  plant_id: string;
  name: string;
  scientific_name: string;
  sunlight: string;
  water: string;
  temp_min: number;
  temp_max: number;
  humidity_min: number;
  humidity_max: number;
  difficulty: Difficulty;
  growth_days: number;
  type: string;
  space: string[];
  description: string;
  care_tips: string;
  weekly_time_minutes: number;
  pot: {
    material: string[];
    min_diameter_cm: number;
    depth_cm: number;
    drainage_required: boolean;
  };
  soil: {
    mix: SoilComponent[];
    ph_range: string;
    moisture: string;
  };
  seed: {
    method: string;
    germination_days: string;
    planting_depth_cm: number;
  };
  nutrition: {
    stages: NutritionStage[];
  };
  emoji?: string;
  // added for RAG results
  explanation?: string;
  ai_details?: {
    pot_reason?: string;
    soil_reason?: string;
  };
}

export interface PlantSummary {
  plant_id: string;
  name: string;
  difficulty: Difficulty;
  growth_days: number;
  emoji: string;
  description: string;
}

// ── Shopping List Types ──

export interface ShoppingItem {
  id: string;
  category: "pot" | "soil" | "seed" | "fertilizer";
  name: string;
  detail?: string;
  checked: boolean;
}
