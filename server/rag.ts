import { VertexAI } from "@google-cloud/vertexai";
import plantsData from "./data/plants.json" with { type: "json" };
import priceData from "./data/prices.json" with { type: "json" };
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const getProjectConfig = () => ({
  projectId: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION || "us-central1"
});

// Normalize credentials path if relative
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, "..", process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

interface PlantEmbedding {
  plant_id: string;
  name: string;
  vector: number[];
  text: string;
}

class RAGManager {
  private vertexAI ?: VertexAI;
  private plantEmbeddings: PlantEmbedding[] = [];
  private isInitialized = false;

  constructor() {
    // Initialized on demand to avoid ESM hoisting issues
  }

  private getVertexAI(): VertexAI {
    if (!this.vertexAI) {
      const config = getProjectConfig();
      this.vertexAI = new VertexAI({
        project: config.projectId!,
        location: config.location,
      });
    }
    return this.vertexAI;
  }

  /**
   * Initializes the knowledge base by generating embeddings for all plants.
   * This grounds the "Inspiration" block of the prompt.
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log("[RAG] Indexing plants for similar-plant retrieval...");
    const project = process.env.GOOGLE_VERTEX_PROJECT;
    const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';

    for (const plant of (plantsData as any).plants) {
      try {
        const text = `${plant.name}: ${plant.description}. Difficulty: ${plant.difficulty}. Harvest in ${plant.growth_days} days.`;
        
        // Raw REST call to Vertex AI Embedding API
        const ai = this.getVertexAI();
        const token = await (ai.preview.getGenerativeModel({ model: 'gemini-1.5-flash' }) as any)['fetchToken']();
        const config = getProjectConfig();
        const url = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/text-embedding-004:predict`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{ content: text }],
          }),
        });

        if (!response.ok) {
          throw new Error(`Embedding API error: ${response.statusText}`);
        }

        const result = await response.json() as any;
        const vector = result.predictions[0].embeddings.values;
        
        this.plantEmbeddings.push({
          plant_id: plant.plant_id,
          name: plant.name,
          vector,
          text
        });
      } catch (err) {
        console.error(`[RAG] Failed to embed ${plant.name}:`, err);
      }
    }

    this.isInitialized = true;
    console.log(`[RAG] Indexed ${this.plantEmbeddings.length} plants.`);
  }

  /**
   * Returns a string summary of the target plant from our core DB.
   */
  getTargetPlantContext(plantId: string): string {
    const plant = (plantsData as any).plants.find((p: any) => p.plant_id === plantId);
    if (!plant) return "Target plant not found in database.";
    return JSON.stringify(plant, null, 2);
  }

  /**
   * Retrieves the top K similar plants based on vector similarity.
   */
  async getSimilarPlantsContext(targetPlantId: string, limit: number = 2): Promise<string> {
    const target = this.plantEmbeddings.find(p => p.plant_id === targetPlantId);
    if (!target || this.plantEmbeddings.length < 2) return "No similar plant data available.";

    // Simple Cosine Similarity
    const similarities = this.plantEmbeddings
      .filter(p => p.plant_id !== targetPlantId)
      .map(p => ({
        name: p.name,
        text: p.text,
        score: this.cosineSimilarity(target.vector, p.vector)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return similarities.map(s => `- ${s.name}: ${s.text}`).join("\n");
  }

  /**
   * Formats prices.json into a human-readable text block for the AI.
   */
  getPriceContext(): string {
    let context = "ITEM | MIN PRICE | MAX PRICE\n----------------------------\n";
    for (const [item, range] of Object.entries(priceData)) {
      context += `${item} | RM${(range as any).min} | RM${(range as any).max}\n`;
    }
    return context;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magA * magB);
  }
}

export const ragManager = new RAGManager();
