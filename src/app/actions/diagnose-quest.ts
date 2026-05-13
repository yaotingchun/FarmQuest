'use server'

import { VertexAI } from '@google-cloud/vertexai';
import path from 'path';
import fs from 'fs';

import { PlantHealthResponse } from '@/types/diagnosis';

export async function diagnoseQuestPlant(
  formData: FormData,
  plantName?: string,
  plantId?: string
): Promise<PlantHealthResponse> {
  const project = process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'farmquest-493806';
  const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';

  console.log(`[QuestDiagnosis] Analyzing ${plantName || 'plant'} health via Vertex AI`);

  const keyFilePath = path.join(process.cwd(), 'credentials', 'google.json');
  if (fs.existsSync(keyFilePath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilePath;
  }

  const vertexAI = new VertexAI({ project, location });

  try {
    const file = formData.get('image') as File;
    if (!file) {
      throw new Error('No image provided');
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const plantContext = plantName ? `The plant being analyzed is: ${plantName}.` : '';

    const prompt = `
      You are an expert botanist, plant pathologist, and agricultural advisor.
      ${plantContext}
      Analyze the following image of a plant and provide a comprehensive health report.

      You MUST return the result strictly in JSON format with the following structure:
      {
        "healthScore": number (0-100, overall plant health),
        "diseaseDetected": boolean,
        "diseaseName": string (name of disease or "None" if healthy),
        "severity": "none" | "mild" | "moderate" | "severe",
        "diagnosis": string (detailed markdown-formatted diagnosis description),
        "detectedIssues": string[] (list of detected problems, empty if healthy),

        "growthState": {
          "currentStage": string (e.g. "Seedling", "Vegetative", "Flowering", "Fruiting", "Mature"),
          "estimatedAge": string (e.g. "2-3 weeks", "1-2 months"),
          "growthRate": "slow" | "normal" | "fast",
          "overallVigor": number (0-100, how vigorous the growth appears)
        },

        "vitalityScore": number (0-100),
        "sunlightScore": number (0-100, estimated sunlight adequacy),
        "hydrationScore": number (0-100, estimated water adequacy),
        "nutrientScore": number (0-100, estimated nutrient adequacy),

        "treatmentSteps": [
          {
            "step": string (clear actionable instruction),
            "day": number (which day to perform this, starting from 1),
            "duration": string (e.g. "1 day", "3 days", "ongoing"),
            "category": "soil" | "water" | "pesticide" | "nutrient" | "pruning" | "environment" | "other"
          }
        ] (provide 3-7 steps if disease detected, empty array if healthy),

        "suggestedProducts": [
          {
            "name": string (product name),
            "type": string (e.g. "Fungicide", "Fertilizer", "Insecticide"),
            "estimatedCost": string (e.g. "$5-10", "RM15-25"),
            "supplier": string (e.g. "Local garden center", "Online retailers"),
            "notes": string (optional usage notes)
          }
        ] (provide 2-4 products if disease detected, empty array if healthy),

        "estimatedTreatmentCost": {
          "min": number (minimum cost in local currency units),
          "max": number (maximum cost in local currency units),
          "currency": "MYR"
        },

        "expectedBenefits": {
          "yieldSavedPercent": number (0-100, estimated yield that can be saved with treatment),
          "recoveryTimeDays": number (estimated days to full recovery),
          "healthImprovement": number (expected health score after treatment, 0-100),
          "description": string (1-2 sentence summary of expected outcome)
        }
      }

      IMPORTANT RULES:
      - If the plant is healthy, set diseaseDetected to false, treatmentSteps to empty array, and suggestedProducts to empty array.
      - If disease IS detected, provide detailed, practical treatment steps that a home gardener or small farmer can follow.
      - Each treatment step should be a specific daily action that becomes a quest task.
      - For suggestedProducts, use realistic product names and price ranges.
      - The expectedBenefits should realistically estimate the outcome if treatment is followed.
      - Be specific about what soil changes, watering adjustments, or environmental modifications are needed.
      - growthState should reflect what you observe in the image.
    `;

    const request = {
      contents: [
        {
          role: 'user' as const,
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type,
                data: base64,
              },
            },
          ],
        },
      ],
    };

    const result = await generativeModel.generateContent(request);
    const text = result.response.candidates?.[0].content.parts[0].text;

    if (!text) {
      throw new Error('No analysis feedback received from AI');
    }

    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanedText);

    return { success: true, data };
  } catch (error: any) {
    console.error('[QuestDiagnosis] Error:', error);
    return { success: false, error: error.message || 'Plant health analysis failed' };
  }
}
