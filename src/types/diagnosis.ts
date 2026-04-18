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
