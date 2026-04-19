import {
  VertexAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google-cloud/vertexai";
import dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Fix GOOGLE_APPLICATION_CREDENTIALS to absolute path (relative to project root)
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

// ── Types ──
interface SoilComponent {
  component: string;
  percentage: number;
}

interface NutritionStage {
  stage: string;
  npk: string;
  type: string;
  frequency: string;
}

interface PlantSetup {
  plant_id: string;
  name: string;
  difficulty: string;
  growth_time_days: number;
  emoji: string;
  description: string;
  pot: {
    material: string[];
    min_diameter_cm: number;
    depth_cm: number;
    drainage_required: boolean;
  };
  soil: {
    mix: SoilComponent[];
    ph_range: string;
    moisture: string;
  };
  seed: {
    method: string;
    germination_days: string;
    planting_depth_cm: number;
  };
  nutrition: {
    stages: NutritionStage[];
  };
}

export interface AIPlan extends PlantSetup {
  plan_type: "Budget" | "Balanced" | "Premium";
  cost?: number;
  currency?: string;
}

// ── Vertex AI Client ──
const PROJECT_ID = process.env.GOOGLE_VERTEX_PROJECT;
const LOCATION = process.env.GOOGLE_VERTEX_LOCATION || "us-central1";

let vertexAI: VertexAI | null = null;

function getVertexAI(): VertexAI {
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: PROJECT_ID!,
      location: LOCATION,
    });
  }
  return vertexAI;
}


// ── Normalization (MANDATORY — AI output drifts) ──
function normalizePlan(
  raw: Partial<PlantSetup>,
  fallback: PlantSetup,
  planType: "Budget" | "Balanced" | "Premium"
): AIPlan {
  return {
    plant_id: fallback.plant_id,
    name: fallback.name,
    difficulty: fallback.difficulty,
    growth_time_days: fallback.growth_time_days,
    emoji: fallback.emoji,
    description: fallback.description,
    pot: raw.pot &&
      raw.pot.material &&
      Array.isArray(raw.pot.material) &&
      typeof raw.pot.min_diameter_cm === "number" &&
      typeof raw.pot.depth_cm === "number"
      ? {
        material: raw.pot.material,
        min_diameter_cm: raw.pot.min_diameter_cm,
        depth_cm: raw.pot.depth_cm,
        drainage_required: raw.pot.drainage_required ?? fallback.pot.drainage_required,
      }
      : fallback.pot,
    soil: raw.soil &&
      raw.soil.mix &&
      Array.isArray(raw.soil.mix) &&
      raw.soil.mix.length > 0
      ? {
        mix: raw.soil.mix.map((m: SoilComponent) => ({
          component: m.component || "potting mix",
          percentage: typeof m.percentage === "number" ? m.percentage : 50,
        })),
        ph_range: raw.soil.ph_range || fallback.soil.ph_range,
        moisture: raw.soil.moisture || fallback.soil.moisture,
      }
      : fallback.soil,
    seed: raw.seed &&
      raw.seed.method &&
      raw.seed.germination_days
      ? {
        method: raw.seed.method,
        germination_days: raw.seed.germination_days,
        planting_depth_cm:
          typeof raw.seed.planting_depth_cm === "number"
            ? raw.seed.planting_depth_cm
            : fallback.seed.planting_depth_cm,
      }
      : fallback.seed,
    nutrition: raw.nutrition &&
      raw.nutrition.stages &&
      Array.isArray(raw.nutrition.stages) &&
      raw.nutrition.stages.length > 0
      ? {
        stages: raw.nutrition.stages.map((s: NutritionStage) => ({
          stage: s.stage || "vegetative",
          npk: s.npk || "10-10-10",
          type: s.type || "liquid fertilizer",
          frequency: s.frequency || "weekly",
        })),
      }
      : fallback.nutrition,
    plan_type: planType,
  };
}

// ── AI Plan Generation ──
export async function generatePlantingPlans(
  plantData: PlantSetup
): Promise<{ plans: AIPlan[]; isFallback: boolean }> {
  try {
    const ai = getVertexAI();
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",

      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an expert urban farming advisor. Create 3 planting plans for the plant below. 

PLANT: ${plantData.name}
DATA: ${JSON.stringify(plantData, null, 2)}

PLAN TIERS:
1. "Budget" - Cheapest (plastic, standard soil).
2. "Balanced" - Moderate (mix of quality/price).
3. "Premium" - High-end (terracotta/fabric, organic blends).

JSON FORMAT (Strictly exactly 3 objects in an array):
{
  "pot": { "material": ["string"], "min_diameter_cm": number, "depth_cm": number, "drainage_required": boolean },
  "soil": { "mix": [{"component": "string", "percentage": number}], "ph_range": "string", "moisture": "string" },
  "seed": { "method": "string", "germination_days": "string", "planting_depth_cm": number },
  "nutrition": { "stages": [{"stage": "string", "npk": "string", "type": "string", "frequency": "string"}] }
}

RULES:
- Respond ONLY with the JSON array.
- No commentary or price fields.
- Use materials consistent with the tier.`;

    console.log("[AI] Sending prompt to Vertex AI...");
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    console.log("[AI] Raw response length:", text.length);

    let parsed: Partial<PlantSetup>[];
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[AI] Failed to parse AI response JSON");
      return { plans: buildFallbackPlans(plantData), isFallback: true };
    }

    if (!Array.isArray(parsed) || parsed.length !== 3) {
      console.error("[AI] AI returned invalid plan count:", parsed?.length);
      return { plans: buildFallbackPlans(plantData), isFallback: true };
    }

    const planTypes: Array<"Budget" | "Balanced" | "Premium"> = [
      "Budget",
      "Balanced",
      "Premium",
    ];

    console.log("[AI] Successfully parsed 3 plans. Normalizing...");
    const plans = parsed.map((raw, i) => normalizePlan(raw, plantData, planTypes[i]));
    return { plans, isFallback: false };
  } catch (err) {
    console.error("[AI] Vertex AI generation failed:", err);
    return { plans: buildFallbackPlans(plantData), isFallback: true };
  }
}

// ── Fallback: repeat base plant as 3 plans ──
function buildFallbackPlans(plantData: PlantSetup): AIPlan[] {
  const planTypes: Array<"Budget" | "Balanced" | "Premium"> = [
    "Budget",
    "Balanced",
    "Premium",
  ];
  return planTypes.map((type) => ({
    ...JSON.parse(JSON.stringify(plantData)), // Deep clone
    plan_type: type,
  }));
}
// ── AI Setup Explanation ──
export async function generateSetupExplanation(
  plantData: PlantSetup,
  plan: AIPlan
): Promise<string> {
  try {
    const ai = getVertexAI();
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",

      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const prompt = `You are an expert urban farming advisor. A user is looking at a "${plan.plan_type}" planting setup for their "${plantData.name}".

PLANT DATA:
${JSON.stringify(plantData, null, 2)}

SELECTED PLAN (${plan.plan_type}):
${JSON.stringify(plan, null, 2)}

TASK:
Explain in 3-4 concise paragraphs why this specific combination of pot material, soil mix, and nutrition plan was chosen. 
- Explain how the pot choice affects moisture/roots for this specific plant.
- Explain how the soil mix ph and components support its growth.
- Explain why the nutrition frequency is correct for its growth cycle.
- Frame the explanation based on the "${plan.plan_type}" context (e.g., if Budget, explain how we achieve success with low-cost items; if Premium, explain the superior performance of the high-end choices).

Keep the tone encouragement and professional. Avoid lists; use natural paragraphs. Max 150 words.`;

    console.log(`[AI] Generating explanation for ${plantData.name} (${plan.plan_type})...`);
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate an explanation at this time.";
  } catch (err) {
    console.error("[AI] Explanation generation failed:", err);
    return "The AI is currently unavailable to explain this setup, but these recommendations are based on standard horticultural best practices for urban farming.";
  }
}
