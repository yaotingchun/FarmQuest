/**
 * Genkit Flow — Plant Diagnosis (Multimodal Vision)
 *
 * Wraps the existing plant diagnosis logic into a Genkit Flow with
 * granular ai.run sub-steps for full observability in the Dev UI.
 */
import { z } from 'genkit';
import { ai } from './genkit.js';

// ── Diagnosis Flow ──
export const diagnoseFlow = ai.defineFlow(
  {
    name: 'diagnoseFlow',
    inputSchema: z.object({
      base64: z.string().describe('Base64-encoded image data'),
      mimeType: z.string().describe('MIME type of the image (e.g. image/jpeg)'),
    }),
    outputSchema: z.any(),
  },
  async ({ base64, mimeType }) => {
    // Step 1: Receive and validate image input
    const imageData = await ai.run('receive-image', async () => {
      if (!base64 || !mimeType) {
        throw new Error('Missing image data or MIME type');
      }
      console.log(`[Diagnose] Received image: ${mimeType}, size: ${Math.round(base64.length / 1024)}KB`);
      return { base64, mimeType, sizeKB: Math.round(base64.length / 1024) };
    });

    // Step 2: Call Gemini multimodal to analyze the image
    const visionResult = await ai.run('analyze-vision', async () => {
      const prompt = `You are an expert botanist and plant pathologist.
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
}`;

      const { text } = await ai.generate({
        model: 'vertexai/gemini-2.5-flash',
        prompt: [
          { text: prompt },
          {
            media: {
              url: `data:${imageData.mimeType};base64,${imageData.base64}`,
              contentType: imageData.mimeType,
            },
          },
        ],
      });

      return text;
    });

    // Step 3: Extract disease/pest identification from the raw response
    const parsedData = await ai.run('identify-disease', async () => {
      if (!visionResult) {
        throw new Error('No response received from vision model');
      }

      const cleanedText = visionResult.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(cleanedText);

      console.log(`[Diagnose] Identified: ${data.plantName || 'Unknown'}, Issues: ${(data.detectedIssues || []).join(', ') || 'None'}`);
      return data;
    });

    // Step 4: Generate actionable farming recommendations
    const recommendation = await ai.run('generate-recommendation', async () => {
      return {
        isPlant: parsedData.isPlant,
        plantName: parsedData.plantName,
        diagnosis: parsedData.diagnosis,
        solutionSteps: parsedData.solutionSteps || [],
        confidence: parsedData.confidence,
        detectedIssues: parsedData.detectedIssues || [],
        difficultyLevel: parsedData.difficultyLevel || 'Medium',
        potentialImpact: parsedData.potentialImpact || 'Moderate',
        vitalityScore: parsedData.vitalityScore ?? 50,
        sunlightScore: parsedData.sunlightScore ?? 50,
        hydrationScore: parsedData.hydrationScore ?? 50,
        nutrientScore: parsedData.nutrientScore ?? 50,
      };
    });

    return recommendation;
  }
);

console.log('[Genkit] Flow registered: diagnoseFlow');
