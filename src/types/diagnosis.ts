export interface DiagnosisResult {
  isPlant: boolean;
  plantName: string;
  diagnosis: string;
  solutionSteps: string[];
  confidence: number;
  detectedIssues: string[];
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
  potentialImpact: 'Low' | 'Moderate' | 'High';
  vitalityScore: number;
  sunlightScore: number;
  hydrationScore: number;
  nutrientScore: number;
}

export interface DiagnosisResponse {
  success: boolean;
  data?: DiagnosisResult;
  error?: string;
}

// ── Plant Health Report (Quest Integration) ──

export interface TreatmentStep {
  step: string;
  day: number;
  duration: string;
  category: 'soil' | 'water' | 'pesticide' | 'nutrient' | 'pruning' | 'environment' | 'other';
}

export interface SuggestedProduct {
  name: string;
  type: string;
  estimatedCost: string;
  supplier: string;
  notes?: string;
}

export interface PlantHealthReport {
  healthScore: number; // 0-100
  diseaseDetected: boolean;
  diseaseName: string;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  diagnosis: string;
  detectedIssues: string[];

  // Growth state
  growthState: {
    currentStage: string; // e.g. "Seedling", "Vegetative", "Flowering", "Fruiting"
    estimatedAge: string; // e.g. "2-3 weeks"
    growthRate: 'slow' | 'normal' | 'fast';
    overallVigor: number; // 0-100
  };

  // Vitals
  vitalityScore: number;
  sunlightScore: number;
  hydrationScore: number;
  nutrientScore: number;

  // Treatment (only when disease detected)
  treatmentSteps: TreatmentStep[];
  suggestedProducts: SuggestedProduct[];
  estimatedTreatmentCost: {
    min: number;
    max: number;
    currency: string;
  };

  // Expected benefits after treatment
  expectedBenefits: {
    yieldSavedPercent: number; // e.g. 85 means "85% yield saved"
    recoveryTimeDays: number;
    healthImprovement: number; // expected health score after treatment
    description: string;
  };
}

export interface PlantHealthResponse {
  success: boolean;
  data?: PlantHealthReport;
  error?: string;
}
