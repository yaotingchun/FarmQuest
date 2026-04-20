import dotenv from "dotenv";
import path from "path";

// Load .env FIRST — before any module that reads process.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Fix GOOGLE_APPLICATION_CREDENTIALS to absolute path
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path.isAbsolute(credPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
      __dirname,
      "..",
      credPath
    );
  }
}

import express from "express";
import cors from "cors";
import plantsData from "./data/plants.json" with { type: "json" };
import { generatePlantingPlans, generateSetupExplanation, type AIPlan } from "./ai.js";
import { calculateCost } from "./cost.js";
import { ragManager } from "./rag.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── In-memory cache for AI plans ──
const plansCache = new Map<string, AIPlan[]>();
const explanationsCache = new Map<string, string>(); // Key: plantId-planType

const isCompleteExplanation = (text: string): boolean => {
  if (!text || text.length < 420) return false;
  const sentenceCount = (text.match(/[.!?](?=\s|$)/g) || []).length;
  const hasPot = /^\s*Pot:\s+/im.test(text);
  const hasSoil = /^\s*Soil:\s+/im.test(text);
  const hasSeed = /^\s*Seed:\s+/im.test(text);
  const hasNutrition = /^\s*Nutrition:\s+/im.test(text);
  const paragraphCount = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
  return (
    sentenceCount >= 7 &&
    /[.!?]$/.test(text.trim()) &&
    hasPot &&
    hasSoil &&
    hasSeed &&
    hasNutrition &&
    paragraphCount >= 4
  );
};

// ── Helpers ──
const finalizePlansWithCosts = (plans: AIPlan[]): AIPlan[] => {
  // Calculate deterministic costs from prices.json
  for (const plan of plans) {
    plan.cost = calculateCost(plan, plan.plan_type);
    plan.currency = "RM";
  }

  // Guardrail: keep Budget exact, but prevent AI tiers from pricing below it.
  const budget = plans.find((p) => p.plan_type === "Budget");
  const balanced = plans.find((p) => p.plan_type === "Balanced");
  const premium = plans.find((p) => p.plan_type === "Premium");

  if (budget && balanced && typeof budget.cost === "number" && typeof balanced.cost === "number") {
    if (balanced.cost <= budget.cost) {
      balanced.cost = budget.cost + 2;
    }
  }

  if (balanced && premium && typeof balanced.cost === "number" && typeof premium.cost === "number") {
    if (premium.cost <= balanced.cost) {
      premium.cost = balanced.cost + 3;
    }
  }

  return plans;
};

// GET /api/plants — return all plants (summary only)
app.get("/api/plants", (_req, res) => {
  const summaries = (plantsData as any).plants.map((p: any) => ({
    plant_id: p.plant_id,
    name: p.name,
    difficulty: p.difficulty,
    growth_days: p.growth_days,
    emoji: p.emoji,
    description: p.description,
  }));
  res.json(summaries);
});

// GET /api/plants/:plantId — return full plant setup data
app.get("/api/plants/:plantId", (req, res) => {
  const plant = (plantsData as any).plants.find((p: any) => p.plant_id === req.params.plantId);
  if (!plant) {
    res.status(404).json({ error: "Plant not found" });
    return;
  }
  res.json(plant);
});

// GET /api/plants/:plantId/ai-plans — return 1 DB budget + 2 AI plans with costs
app.get("/api/plants/:plantId/ai-plans", async (req, res) => {
  const plantId = req.params.plantId;
  const refresh = req.query.refresh === "true";
  const plant = (plantsData as any).plants.find((p: any) => p.plant_id === plantId);

  if (!plant) {
    res.status(404).json({ error: "Plant not found" });
    return;
  }

  // Check cache first (unless refreshing)
  if (!refresh && plansCache.has(plantId)) {
    console.log(`[Cache] Returning cached plans for ${plantId}`);
    res.json(plansCache.get(plantId));
    return;
  }

  try {
    // Disable browser caching for these results
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    console.log(`[AI] Generating plans for ${plantId} (refresh=${refresh})...`);
    const { plans: rawPlans, isFallback } = await generatePlantingPlans(plant as any);

    if (isFallback) {
      console.warn(`[AI] SERVER FALLBACK: AI generation failed for ${plantId}. Check your Vertex AI credentials and API enablement.`);
    }

    const plans = finalizePlansWithCosts(rawPlans);

    // Cache the result ONLY if it's NOT a fallback
    if (!isFallback) {
      plansCache.set(plantId, plans);
      console.log(`[AI] SUCCESS: Plans generated and cached for ${plantId}`);
    } else {
      console.log(`[AI] DEGRADED: Returning smart fallback plans for ${plantId}`);
    }

    res.json(plans);
  } catch (err) {
    console.error(`[AI] Error generating plans for ${plantId}:`, err);

    // Fallback: return base plant as 3 deterministic plans
    const fallbackPlans: AIPlan[] = (["Budget", "Balanced", "Premium"] as const).map(
      (type) => {
        const plan: AIPlan = JSON.parse(JSON.stringify(plant)); // Deep clone
        plan.plan_type = type;

        return plan;
      }
    );

    res.json(finalizePlansWithCosts(fallbackPlans));
  }
});

// Clear cache on boot to ensure fresh logic applies immediately
plansCache.clear();
explanationsCache.clear();
console.log("[Server] Ready - Plans cache cleared.");

// POST /api/plants/:plantId/explain — generate AI explanation for a setup
app.post("/api/plants/:plantId/explain", async (req, res) => {
  const { plantId } = req.params;
  const { plan } = req.body;

  if (!plan) {
    res.status(400).json({ error: "Plan data is required" });
    return;
  }

  const cacheKey = `${plantId}-${plan.plan_type}`;
  if (explanationsCache.has(cacheKey)) {
    const cached = explanationsCache.get(cacheKey) || "";
    // Return only high-quality complete explanations from cache.
    if (isCompleteExplanation(cached)) {
      console.log(`[Cache] Returning cached explanation for ${cacheKey}`);
      res.json({ explanation: cached });
      return;
    }
    explanationsCache.delete(cacheKey);
  }

  const plant = (plantsData as any).plants.find((p: any) => p.plant_id === plantId);
  if (!plant) {
    res.status(404).json({ error: "Plant not found" });
    return;
  }

  try {
    const explanation = await generateSetupExplanation(plant as any, plan);
    explanationsCache.set(cacheKey, explanation);
    res.json({ explanation });
  } catch (err) {
    console.error("[AI] Explanation API error:", err);
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

app.listen(PORT, async () => {
  console.log(`🌱 FarmQuest API running on http://localhost:${PORT}`);
  
  // Initialize RAG Knowledge Base
  try {
    await ragManager.initialize();
  } catch (err) {
    console.error("[RAG] Initialization failed:", err);
  }

/* 
  // Pre-warm the cache in the background
  console.log("[Cache] Starting background pre-warming of AI plans...");
  (async () => {
    for (const plant of (plantsData as any).plants) {
      if (!plansCache.has(plant.plant_id)) {
        try {
          console.log(`[Cache Pre-warm] Generating plans for ${plant.plant_id}...`);
          const { plans: rawPlans, isFallback } = await generatePlantingPlans(plant as any);
          if (rawPlans && !isFallback) {
            const plans = finalizePlansWithCosts(rawPlans);
            plansCache.set(plant.plant_id, plans);
            console.log(`[Cache Pre-warm] Success for ${plant.plant_id}`);
          } else if (isFallback) {
            console.log(`[Cache Pre-warm] Skipping cache for fallback result (${plant.plant_id})`);
          }
        } catch (err) {
          console.error(`[Cache Pre-warm] Failed for ${plant.plant_id}:`, err);
        }
      }
    }
    console.log("[Cache] Pre-warming complete!");
  })();
*/
});
