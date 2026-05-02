import { ragManager } from "./rag.js";

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
  growth_days: number;
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
  explanation?: string;
  ai_details?: {
    pot_reason?: string;
    soil_reason?: string;
  };
}

type PlanType = "Budget" | "Balanced" | "Premium";

function clonePlantAsPlan(plantData: PlantSetup, planType: PlanType): AIPlan {
  return {
    ...JSON.parse(JSON.stringify(plantData)),
    plan_type: planType,
  } as AIPlan;
}

/**
 * Budget plan must be a strict database mirror.
 * No AI mutation, no derived replacements.
 */
function buildBudgetPlanFromDatabase(plantData: PlantSetup): AIPlan {
  const budget = clonePlantAsPlan(plantData, "Budget");
  budget.explanation = undefined;
  budget.ai_details = undefined;
  return budget;
}

// ── Vertex AI Client ──
import { VertexAI } from "@google-cloud/vertexai";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getProjectConfig = () => ({
  projectId: process.env.GOOGLE_VERTEX_PROJECT || process.env.GCP_PROJECT_ID || 'farmquest-493806',
  location: process.env.GOOGLE_VERTEX_LOCATION || "us-central1"
});

const DEFAULT_TEXT_MODEL = process.env.GOOGLE_VERTEX_TEXT_MODEL || "gemini-2.5-flash";

const TASK_MODEL_CANDIDATES = Array.from(
  new Set([DEFAULT_TEXT_MODEL, "gemini-2.5-flash", "gemini-1.5-flash-002"])
);

// Normalize credentials path if relative
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  const absolutePath = path.resolve(__dirname, "..", process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (fs.existsSync(absolutePath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = absolutePath;
  } else {
    // If it doesn't exist, remove it so it doesn't break Cloud Run
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
}

let vertexAI: VertexAI | null = null;

function getVertexAI(): VertexAI {
  if (!vertexAI) {
    const config = getProjectConfig();
    vertexAI = new VertexAI({
      project: config.projectId!,
      location: config.location,
    });
  }
  return vertexAI;
}

function extractAllText(result: any): string {
  const parts = result?.response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function isCompleteEnglishExplanation(text: string): boolean {
  if (!text || text.length < 420) return false;
  const sentenceCount = (text.match(/[.!?](?=\s|$)/g) || []).length;
  if (sentenceCount < 7) return false;
  if (!/[.!?]$/.test(text)) return false;

  const hasPot = /^\s*Pot:\s+/im.test(text);
  const hasSoil = /^\s*Soil:\s+/im.test(text);
  const hasSeed = /^\s*Seed:\s+/im.test(text);
  const hasNutrition = /^\s*Nutrition:\s+/im.test(text);
  const paragraphCount = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;

  return hasPot && hasSoil && hasSeed && hasNutrition && paragraphCount >= 4;
}

function normalizeSectionLabels(text: string): string {
  return text
    .replace(/^\s*pt\s*:/gim, "Pot:")
    .replace(/^\s*potting\s*:/gim, "Pot:")
    .replace(/^\s*soil\s*:/gim, "Soil:")
    .replace(/^\s*sd\s*:/gim, "Seed:")
    .replace(/^\s*seedling\s*:/gim, "Seed:")
    .replace(/^\s*seed\s*:/gim, "Seed:")
    .replace(/^\s*nutri\w*\s*:/gim, "Nutrition:")
    .replace(/^\s*fertili[sz]er\s*:/gim, "Nutrition:")
    .replace(/^\s*nutrition\s*:/gim, "Nutrition:");
}

function buildDeterministicLongExplanation(plantData: PlantSetup, plan: AIPlan): string {
  const tier = plan.plan_type;
  const primaryPot = plan.pot.material[0] || "container";
  const soilMix = plan.soil.mix
    .map((c) => `${c.component} (${c.percentage}%)`)
    .join(", ");
  const nutritionSummary = plan.nutrition.stages
    .map((s) => `${s.stage}: ${s.npk} (${s.type}, ${s.frequency})`)
    .join("; ");

  const tierTradeoff =
    tier === "Budget"
      ? "This tier prioritizes affordability while still covering the essential conditions for healthy growth."
      : tier === "Balanced"
      ? "This tier balances cost and performance, giving you better consistency without pushing costs to the highest range."
      : "This tier prioritizes performance and stability, with choices that reduce stress risk and improve consistency over the full growth cycle.";

  const potParagraph = [
    `Pot: This ${tier.toLowerCase()} plan for ${plantData.name} uses ${primaryPot} with at least ${plan.pot.min_diameter_cm} cm diameter and ${plan.pot.depth_cm} cm depth to support stable root expansion over the ${plan.growth_days}-day cycle.`,
    plan.pot.drainage_required
      ? "Drainage is required in this setup, which helps keep oxygen available around the roots and lowers the risk of root stress caused by excess water."
      : "Drainage is optional in this setup, so you should monitor moisture carefully to avoid stagnant water around the root zone.",
    tierTradeoff,
  ].join(" ");

  const soilParagraph = [
    `Soil: The mix is ${soilMix}, targeted for a pH range of ${plan.soil.ph_range} with ${plan.soil.moisture} moisture behavior.`,
    "This structure helps balance water retention and aeration so roots can access moisture consistently without staying waterlogged.",
    "Stable pH and airflow in the medium also improve nutrient availability and reduce growth interruptions during active development.",
  ].join(" ");

  const seedParagraph = [
    `Seed: The recommended establishment method is ${plan.seed.method}, with planting depth at ${plan.seed.planting_depth_cm} cm and expected germination in ${plan.seed.germination_days}.`,
    "This depth supports reliable emergence while protecting early roots from rapid drying at the surface.",
    "For best consistency, keep moisture even during germination and avoid overwatering until seedlings are clearly established.",
  ].join(" ");

  const nutritionParagraph = [
    `Nutrition: Feeding is staged as follows: ${nutritionSummary}.`,
    "This sequence aligns nutrient intensity with changing plant demand, supporting steady foliage growth first and stronger structure and yield later.",
    "Success tip: track leaf color and moisture weekly, then correct watering before increasing fertilizer, because stable water management usually delivers the fastest improvement.",
  ].join(" ");

  return [potParagraph, soilParagraph, seedParagraph, nutritionParagraph].join("\n\n");
}


interface PotResult { material: string; reason: string; }
interface SoilResult { components: SoilComponent[]; reason: string; }
interface NutriResult { stages: NutritionStage[] }
interface SeedResult { method: string; depth: number; germination: string; }
interface RagContext {
  targetPlant: string;
  similarPlants: string;
  prices: string;
}

// ── Normalization (MANDATORY — AI output drifts) ──
function normalizePlan(
  segments: { pot: PotResult, soil: SoilResult, nutrition: NutriResult, seed: SeedResult },
  fallback: PlantSetup,
  planType: "Budget" | "Balanced" | "Premium"
): AIPlan {
  // STRICTLY preserve identity from fallback
  return {
    ...fallback,
    plan_type: planType,
    growth_days: fallback.growth_days, // Locked
    emoji: fallback.emoji, // Locked
    difficulty: fallback.difficulty, // Locked
    pot: {
      material: [segments.pot.material || "Plastic Pot"],
      min_diameter_cm: fallback.pot.min_diameter_cm,
      depth_cm: fallback.pot.depth_cm,
      drainage_required: fallback.pot.drainage_required,
    },
    soil: {
      mix: segments.soil.components.length > 0 ? segments.soil.components : fallback.soil.mix,
      ph_range: fallback.soil.ph_range, 
      moisture: fallback.soil.moisture, 
    },
    seed: {
      method: segments.seed.method || fallback.seed.method,
      planting_depth_cm: segments.seed.depth || fallback.seed.planting_depth_cm,
      germination_days: segments.seed.germination || fallback.seed.germination_days
    },
    nutrition: {
      stages: (segments.nutrition?.stages?.length ?? 0) > 0 
        ? segments.nutrition!.stages 
        : (fallback.nutrition?.stages || [])
    },
    ai_details: {
      pot_reason: segments.pot.reason || "Selected for optimal root health.",
      soil_reason: segments.soil.reason || "Balanced for specific plant requirements.",
    }
  };
}

/** ── AI Segment Generation ── **/

async function getModel() {
  const config = getProjectConfig();
  const ai = new VertexAI({ project: config.projectId!, location: config.location });
  return ai.getGenerativeModel({
    model: DEFAULT_TEXT_MODEL,
    generationConfig: { temperature: 0.7, maxOutputTokens: 128 }
  });
}

async function genPot(tier: string, plantName: string, rag: RagContext): Promise<PotResult> {
  const model = await getModel();
  const prompt = `Task: Pick a specific pot for a ${tier} ${plantName} setup.
Use ONLY this grounded context when deciding:
TARGET PLANT:
${rag.targetPlant}

SIMILAR PLANTS:
${rag.similarPlants}

PRICE REFERENCE:
${rag.prices}

Exclude formatting. Return exactly: MATERIAL | REASON (one line, max 80 chars).
Example: Plastic Pot | Lightweight and retains moisture for thirsty plants.`;
  const result = await model.generateContent(prompt);
  const text = (result.response.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  const [material, reason] = text.split("|").map(s => s.trim());
  return { material: material || "Plastic Pot", reason: reason || "Standard choice." };
}

async function genSoil(tier: string, plantName: string, rag: RagContext): Promise<SoilResult> {
  const model = await getModel();
  const prompt = `Task: Create a custom soil composition for a ${tier} ${plantName}.
Use ONLY this grounded context when deciding:
TARGET PLANT:
${rag.targetPlant}

SIMILAR PLANTS:
${rag.similarPlants}

PRICE REFERENCE:
${rag.prices}

Format: COMPONENT(%),COMPONENT(%) | REASON (one line, max 80 chars).
Example: Potting Mix(70),Perlite(30) | Improved aeration for sensitive roots.`;
  const result = await model.generateContent(prompt);
  const text = (result.response.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  const [mixPart, reason] = text.split("|").map(s => s.trim());
  
  const components: SoilComponent[] = (mixPart || "").split(",").map(part => {
    const m = part.match(/([^(]+)\((\d+)\)?/);
    return m ? { component: m[1].trim(), percentage: parseInt(m[2]) } : null;
  }).filter((c): c is SoilComponent => c !== null);

  return { components, reason: reason || "Balanced for specific plant needs." };
}

async function genNutrition(tier: string, plantName: string, fallbackStages: NutritionStage[], rag: RagContext): Promise<NutriResult> {
  const model = await getModel();
  const count = fallbackStages.length;
  const prompt = `OUTPUT ONLY RAW DATA. NO TEXT. NO INTRO. NO EXPLANATION. 
Task: ${count} NPK values for ${plantName} (${tier}).
Use ONLY this grounded context when deciding:
TARGET PLANT:
${rag.targetPlant}

SIMILAR PLANTS:
${rag.similarPlants}

PRICE REFERENCE:
${rag.prices}

Format: X-Y-Z,X-Y-Z,X-Y-Z
Example: 10-10-10,15-5-5,5-5-5`;
  
  const result = await model.generateContent(prompt);
  const text = (result.response.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  
  // SNIPER: Ignore labels like "Seedling:" or "Sure!" and only find patterns like 10-10-10
  const npks = text.match(/\d+-\d+-\d+/g) || [];
  
  const stages: NutritionStage[] = fallbackStages.map((s, i) => {
    const aiNpk = npks[i] || "";
    // Regex already ensures \d+-\d+-\d+ format, so we just check it exists
    const isValid = aiNpk.length > 0;
    
    return {
      stage: s.stage,
      npk: isValid ? aiNpk : s.npk, // Use original if AI is broken or truncated
      type: tier === "Budget" ? "Synthetic Granular" : tier === "Balanced" ? "Liquid Organic" : "Slow-Release Organic",
      frequency: tier === "Premium" ? "Weekly" : "Bi-weekly"
    };
  });

  return { stages };
}

async function genSeed(tier: string, plantName: string, rag: RagContext): Promise<SeedResult> {
  const model = await getModel();
  const prompt = `Task: Provide seed guide for ${tier} ${plantName}.
Use ONLY this grounded context when deciding:
TARGET PLANT:
${rag.targetPlant}

SIMILAR PLANTS:
${rag.similarPlants}

PRICE REFERENCE:
${rag.prices}

Return exactly: METHOD | DEPTH_CM | GERMINATION_DAYS (one line).
Example: direct sow | 0.5 | 7-10`;
  const result = await model.generateContent(prompt);
  const text = (result.response.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  const [method, depth, germ] = text.split("|").map(s => s.trim());
  return { 
    method: method || "direct sow", 
    depth: parseFloat(depth) || 0.5, 
    germination: germ || "7-14 days" 
  };
}

/** ── AI Setup Analysis Segments (Multi-Burst) ── **/

async function expPot(tier: string, plantName: string, material: string): Promise<string> {
  const model = await getModel();
  const prompt = `Task: Provide 2-3 descriptive keywords explaining why ${material} is good for ${tier} ${plantName}.
Example result: moisture retention, breathable, lightweight.
Keywords only.`;
  const result = await model.generateContent(prompt);
  return (result.response.candidates?.[0]?.content?.parts?.[0]?.text || "aeration and durability").trim().toLowerCase().replace(/\.$/, "");
}

async function expSoil(tier: string, plantName: string, mix: string): Promise<string> {
  const model = await getModel();
  const prompt = `Task: Provide 2-3 descriptive keywords explaining the soil benefit (mix: ${mix}) for ${tier} ${plantName}.
Example result: root health, nutrient density, drainage.
Keywords only.`;
  const result = await model.generateContent(prompt);
  return (result.response.candidates?.[0]?.content?.parts?.[0]?.text || "optimal growth conditions").trim().toLowerCase().replace(/\.$/, "");
}

async function expNutri(tier: string, plantName: string): Promise<string> {
  const model = await getModel();
  const prompt = `Task: Provide 2-3 descriptive keywords explaining the nutrition benefit for ${tier} ${plantName}.
Example result: steady growth, yield quality, leaf color.
Keywords only.`;
  const result = await model.generateContent(prompt);
  return (result.response.candidates?.[0]?.content?.parts?.[0]?.text || "consistent nourishment").trim().toLowerCase().replace(/\.$/, "");
}

// ── AI Plan Generation (Total Data-Lock Restoration) ──
export async function generatePlantingPlans(
  plantData: PlantSetup
): Promise<{ plans: AIPlan[]; isFallback: boolean }> {
  try {
    const fallbackStages = plantData.nutrition?.stages || [];
    console.log(`[AI] Generating plans for ${plantData.name} (Budget=DB mirror, Balanced/Premium=AI)...`);

    // 1. Budget Plan: strict mirror from plants.json (no AI logic)
    const bPlan = buildBudgetPlanFromDatabase(plantData);

    // RAG grounding for AI-generated tiers only
    let rag: RagContext = {
      targetPlant: JSON.stringify(plantData, null, 2),
      similarPlants: "No similar plant data available.",
      prices: "No price context available.",
    };

    try {
      await ragManager.initialize();
      rag = {
        targetPlant: ragManager.getTargetPlantContext(plantData.plant_id),
        similarPlants: await ragManager.getSimilarPlantsContext(plantData.plant_id, 2),
        prices: ragManager.getPriceContext(),
      };
    } catch (ragErr) {
      console.warn("[RAG] Grounding unavailable, using local fallback context:", ragErr);
    }

    // 2. Balanced Plan: AI Suggested Optimization
    const [lPot, lSoil, lNutri, lSeed] = await Promise.all([
      genPot("Balanced", plantData.name, rag), 
      genSoil("Balanced", plantData.name, rag), 
      genNutrition("Balanced", plantData.name, fallbackStages, rag), 
      genSeed("Balanced", plantData.name, rag)
    ]);
    const lPlan = normalizePlan({ pot: lPot, soil: lSoil, nutrition: lNutri, seed: lSeed }, plantData, "Balanced");

    // 3. Premium Plan: AI Suggested Optimization
    const [pPot, pSoil, pNutri, pSeed] = await Promise.all([
      genPot("Premium", plantData.name, rag), 
      genSoil("Premium", plantData.name, rag), 
      genNutrition("Premium", plantData.name, fallbackStages, rag), 
      genSeed("Premium", plantData.name, rag)
    ]);
    const pPlan = normalizePlan({ pot: pPot, soil: pSoil, nutrition: pNutri, seed: pSeed }, plantData, "Premium");

    return { plans: [bPlan, lPlan, pPlan], isFallback: false };
  } catch (err) {
    console.error("[AI] Generation failed, using fallback:", err);
    return { plans: buildFallbackPlans(plantData), isFallback: true };
  }
}

// ── Fallback: Budget remains strict DB mirror; non-budget tiers are deterministic defaults ──
function buildFallbackPlans(plantData: PlantSetup): AIPlan[] {
  const budget = buildBudgetPlanFromDatabase(plantData);

  const balanced = clonePlantAsPlan(plantData, "Balanced");
  balanced.explanation = `Balanced fallback setup for ${plantData.name} generated without AI.`;
  balanced.ai_details = {
    pot_reason: "Uses database-compatible materials for stable performance.",
    soil_reason: "Uses plant-specific baseline composition from the database.",
  };

  const premium = clonePlantAsPlan(plantData, "Premium");
  premium.explanation = `Premium fallback setup for ${plantData.name} generated without AI.`;
  premium.ai_details = {
    pot_reason: "Prioritizes durability and root environment stability.",
    soil_reason: "Keeps a high-quality balanced mix for healthy growth.",
  };

  return [budget, balanced, premium];
}
// ── AI Setup Explanation (Meaningful Restored) ──
export async function generateSetupExplanation(
  plantData: PlantSetup,
  plan: AIPlan
): Promise<string> {
  try {
    const ai = getVertexAI();
    const model = ai.getGenerativeModel({
      model: DEFAULT_TEXT_MODEL,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 900,
      },
    });

    const prompt = `You are a professional urban farming consultant.
Write a clear, natural English explanation for this ${plan.plan_type} setup for ${plantData.name}.

Format requirements:
- Exactly 4 paragraphs.
- Use these labels in order: Pot:, Soil:, Seed:, Nutrition:
- Put one blank line between paragraphs.
- Write 2-3 complete sentences per paragraph.
- Explain the practical reason for each part of the setup.
- Mention root health, moisture, establishment, and nutrition progression.
- Use proper English and full sentences.
- Output plain text only.`;

    const result = await model.generateContent(prompt);
    let text = extractAllText(result);

    text = text.replace(/^\s*Tis\b/i, "This").trim();
    text = normalizeSectionLabels(text);

    if (!isCompleteEnglishExplanation(text)) {
      text = buildDeterministicLongExplanation(plantData, plan);
    }

    return text;
  } catch (err) {
    console.error("[AI] Explanation generation failed:", err);
    return buildDeterministicLongExplanation(plantData, plan);
  }
}
// ── AI Quest Task Generation ──
export async function generateQuestTasks(
  plantName: string,
  planType: string,
  explanation: string
): Promise<{ main: any[], daily: string[] }> {
  try {
    const ai = getVertexAI();
    const prompt = `User Plan: ${planType} ${plantName}.
Details: ${explanation}

Task: Generate JSON for quests. 
- "main": 3-4 steps for STAGE 1 (SETUP/PLANTING) ONLY.
- "daily": Include routine care AND 3-5 specific milestones for FUTURE STAGES (Sprout, Mature, Harvest).

Format:
{
  "main": [{"title": "Step", "description": "1 sentence", "task_label": "done msg", "xp": 50}],
  "daily": ["Routine task", "Stage 2 Milestone", "Stage 3 Milestone"]
}
Return ONLY JSON. Ground description in plan specifics.`;

    let text = "";
    let lastErr: unknown = null;

    for (const modelName of TASK_MODEL_CANDIDATES) {
      try {
        console.log(`[AI] Trying task model ${modelName} for ${plantName} (${planType})...`);
        const model = ai.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        });
        const result = await model.generateContent(prompt);
        text = extractAllText(result);
        if (text) {
          console.log(`[AI] Task model success: ${modelName}`);
          break;
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[AI] Task model failed: ${modelName}`, err);
      }
    }

    if (!text) {
      throw lastErr || new Error("No response text from any task model");
    }
    
    // Clean up potential markdown formatting
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Try direct parse first, then fallback to extracting first JSON object block.
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        data = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error("Model returned non-JSON task payload");
      }
    }

    if (!Array.isArray(data?.main) || !Array.isArray(data?.daily)) {
      throw new Error("Task payload missing 'main' or 'daily' arrays");
    }

    console.log(`[AI] Successfully generated ${data.main.length} main quests and ${data.daily.length} daily tasks.`);
    
    return {
      main: data.main,
      daily: data.daily
    };
  } catch (err) {
    console.error("[AI] Quest generation failed:", err);
    // Fallback to generic tasks
    return {
      main: [
        { title: "Workspace Prep", description: "Set up your pots and tools.", task_label: "Prepared area", xp: 30 },
        { title: "Soil Mix", description: "Prepare the nutrient-rich base.", task_label: "Mixed soil", xp: 50 },
        { title: "Planting", description: "Carefully sow your seeds.", task_label: "Sown seeds", xp: 100 }
      ],
      daily: [
        "Check moisture", "Monitor light", "Observe for Sprout (Stage 2)", "Track Growth (Stage 3)", "Prepare for Harvest (Stage 4)"
      ]
    };
  }
}
