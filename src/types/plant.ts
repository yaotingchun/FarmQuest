// ── Plant Data Types ──

export type Difficulty = "Easy" | "Medium" | "Hard";

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

export interface PlantSetup {
  plant_id: string;
  name: string;
  difficulty: Difficulty;
  growth_time_days: number;
  emoji: string;
  description: string;
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
}

export interface PlantSummary {
  plant_id: string;
  name: string;
  difficulty: Difficulty;
  growth_time_days: number;
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
