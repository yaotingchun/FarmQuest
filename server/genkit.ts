/**
 * Genkit Orchestrator — Shared AI Instance
 * 
 * This file initializes the Firebase Genkit runtime with the Vertex AI plugin.
 * All flows and tools across the server import the `ai` instance from here.
 */
import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [
    vertexAI({
      location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
      projectId: process.env.GOOGLE_VERTEX_PROJECT || process.env.GCP_PROJECT_ID || 'farmquest-493806',
    }),
  ],
});

console.log('[Genkit] Orchestrator initialized with Vertex AI plugin.');
