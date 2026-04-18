import type { PlantSetup } from "@/types/plant";

/**
 * Placeholder function for future AI-powered explanations.
 * Will generate a natural-language explanation of the planting setup.
 *
 * @param plant — The full plant setup data
 * @returns A placeholder string indicating AI integration is pending
 */
export function generateAIExplanation(plant: PlantSetup): string {
  // TODO: Connect to Gemini API
  // Future implementation:
  //   const response = await fetch("/api/ai/explain", {
  //     method: "POST",
  //     body: JSON.stringify({ plantData: plant }),
  //   });
  //   return response.json().explanation;

  return `AI-powered explanation for "${plant.name}" setup will be generated here. This feature will analyze your soil composition, pot selection, and nutrition plan to provide personalized growing advice powered by Gemini AI.`;
}
