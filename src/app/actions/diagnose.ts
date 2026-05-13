'use server'

import { DiagnosisResponse } from '@/types/diagnosis';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function diagnosePlant(formData: FormData): Promise<DiagnosisResponse> {
  console.log(`[Diagnosis] Routing request to Genkit Orchestrator at ${API_URL}`);

  try {
    const file = formData.get('image') as File;
    if (!file) {
      throw new Error('No image provided');
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type;

    const response = await fetch(`${API_URL}/api/diagnose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64, mimeType }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Diagnosis Action Error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during biological analysis' };
  }
}
