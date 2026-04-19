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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── In-memory cache for AI plans ──
const plansCache = new Map<string, AIPlan[]>();
const explanationsCache = new Map<string, string>(); // Key: plantId-planType

// ── Helpers ──
const finalizePlansWithCosts = (plans: AIPlan[]): AIPlan[] => {
  // 1. Calculate base deterministic costs
  for (const plan of plans) {
    plan.cost = calculateCost(plan, plan.plan_type);
    plan.currency = "RM";
  }

  // 2. Minimal Safety Check: Ensure Budget < Balanced < Premium
  const budget = plans.find((p) => p.plan_type === "Budget");
  const balanced = plans.find((p) => p.plan_type === "Balanced");
  const premium = plans.find((p) => p.plan_type === "Premium");

  if (budget && balanced && premium) {
    budget.cost = Math.max(20, budget.cost!);
    if (balanced.cost! <= budget.cost!) balanced.cost = budget.cost! + 2;
    if (premium.cost! <= balanced.cost!) premium.cost = balanced.cost! + 3;
  }
  return plans;
};

// GET /api/plants — return all plants (summary only)
app.get("/api/plants", (_req, res) => {
  const summaries = plantsData.map((p) => ({
    plant_id: p.plant_id,
    name: p.name,
    difficulty: p.difficulty,
    growth_time_days: p.growth_time_days,
    emoji: p.emoji,
    description: p.description,
  }));
  res.json(summaries);
});

// GET /api/plants/:plantId — return full plant setup data
app.get("/api/plants/:plantId", (req, res) => {
  const plant = plantsData.find((p) => p.plant_id === req.params.plantId);
  if (!plant) {
    res.status(404).json({ error: "Plant not found" });
    return;
  }
  res.json(plant);
});

// GET /api/plants/:plantId/ai-plans — return 3 AI-generated plans with costs
app.get("/api/plants/:plantId/ai-plans", async (req, res) => {
  const plantId = req.params.plantId;
  const refresh = req.query.refresh === "true";
  const plant = plantsData.find((p) => p.plant_id === plantId);

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

    const plans = finalizePlansWithCosts(rawPlans);

    // Cache the result ONLY if it's NOT a fallback
    if (!isFallback) {
      plansCache.set(plantId, plans);
      console.log(`[AI] Plans generated and cached for ${plantId}`);
    } else {
      console.log(`[AI] Plans generated but NOT cached (fallback) for ${plantId}`);
    }

    res.json(plans);
  } catch (err) {
    console.error(`[AI] Error generating plans for ${plantId}:`, err);

    // Fallback: return base plant as 3 plans, but smartly tiered
    const fallbackPlans: AIPlan[] = (["Budget", "Balanced", "Premium"] as const).map(
      (type) => {
        const plan: AIPlan = JSON.parse(JSON.stringify(plant)); // Deep clone
        plan.plan_type = type;

        // Smart Tiering for Fallbacks
        if (type === "Budget") {
          if (plan.pot.material.length > 1) plan.pot.material = [plan.pot.material[0]];
          if (plan.soil.mix.length > 1) {
            plan.soil.mix = [{ component: plan.soil.mix[0].component, percentage: 100 }];
          }
        } else if (type === "Premium") {
          // Add a premium material if possible
          if (!plan.pot.material.includes("terracotta") && !plan.pot.material.includes("fabric")) {
            plan.pot.material.push("terracotta");
          }
        }

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
    console.log(`[Cache] Returning cached explanation for ${cacheKey}`);
    res.json({ explanation: explanationsCache.get(cacheKey) });
    return;
  }

  const plant = plantsData.find((p) => p.plant_id === plantId);
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

app.listen(PORT, () => {
  console.log(`🌱 FarmQuest API running on http://localhost:${PORT}`);
  
  // Pre-warm the cache in the background
  console.log("[Cache] Starting background pre-warming of AI plans...");
  (async () => {
    for (const plant of plantsData) {
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
});
