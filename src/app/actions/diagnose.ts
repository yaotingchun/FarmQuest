'use server'

import { VertexAI } from '@google-cloud/vertexai';
import path from 'path';
import fs from 'fs';

import { DiagnosisResponse } from '@/types/diagnosis';

const project = process.env.GOOGLE_VERTEX_PROJECT || '';
const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';
const keyFilePath = path.join(process.cwd(), 'credentials', 'google.json');

// Force the environment variable to be an absolute path
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilePath;

const vertexAI = new VertexAI({ project, location });

export async function diagnosePlant(formData: FormData): Promise<DiagnosisResponse> {
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

    const prompt = `
      You are an expert botanist and plant pathologist.
      Analyze the following image of a plant and:
      1. Identify the plant if possible.
      2. Detect health issues (pests, nutrient deficiencies, watering issues).
      3. Provide a clear diagnosis.
      4. Provide 3-5 actionable solution steps.

      Return the result strictly in JSON format as follows:
      {
        "isPlant": boolean,
        "plantName": string,
        "diagnosis": string,
        "solutionSteps": string[],
        "confidence": number,
        "detectedIssues": string[],
        "difficultyLevel": "Easy" | "Medium" | "Hard",
        "potentialImpact": "Low" | "Moderate" | "High",
        "vitalityScore": number (0-100),
        "sunlightScore": number (0-100),
        "hydrationScore": number (0-100),
        "nutrientScore": number (0-100)
      }
    `;

    const request = {
      contents: [
        {
          role: 'user',
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
      throw new Error('No analyst feedback received from Gemini');
    }

    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanedText);

    return { success: true, data };
  } catch (error: any) {
    console.error('Diagnosis Backend Error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during biological analysis' };
  }
}
