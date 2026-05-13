import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load .env if it exists (mainly for local development)
dotenv.config({ path: path.resolve(__dirname, "../.env"), silent: true } as any);

// Fix GOOGLE_APPLICATION_CREDENTIALS to absolute path
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path.isAbsolute(credPath)) {
    const absolutePath = path.resolve(__dirname, "..", credPath);
    if (fs.existsSync(absolutePath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = absolutePath;
    } else {
      // If it doesn't exist, remove it so it doesn't break Cloud Run
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
  }
}

import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// ── Dynamic Data Loading ──
function getPlantsData() {
  const dataPath = path.resolve(__dirname, "./data/plants.json");
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}
import { generatePlantingPlans, generateSetupExplanation, generateQuestTasks, type AIPlan } from "./ai.js";
// Import Genkit flows and tools — side-effect imports ensure registration with Dev UI
import "./genkit.js";
import "./calendarTools.js";
import { diagnoseFlow } from "./diagnose.js";
import { generatePlantingPlansFlow, generateSetupExplanationFlow, generateQuestTasksFlow } from "./ai.js";
import { calculateCost } from "./cost.js";
import { ragManager } from "./rag.js";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = getFirestore(process.env.FIREBASE_DATABASE_ID || 'farmquest');
db.settings({ ignoreUndefinedProperties: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
  const summaries = (getPlantsData() as any).plants.map((p: any) => ({
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
  const plant = (getPlantsData() as any).plants.find((p: any) => p.plant_id === req.params.plantId);
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
  const plant = (getPlantsData() as any).plants.find((p: any) => p.plant_id === plantId);

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

  const plant = (getPlantsData() as any).plants.find((p: any) => p.plant_id === plantId);
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
// POST /api/generate-ai-tasks — translate plan explanation into specific quests
app.post("/api/generate-ai-tasks", async (req, res) => {
  const { plantId, plantName, planType, explanation } = req.body;

  if (!plantId || !planType || !explanation) {
    res.status(400).json({ error: "Missing required fields for task generation" });
    return;
  }

  try {
    console.log(`[AI] Generating quests for ${plantName} (${planType})...`);
    const tasks = await generateQuestTasks(plantName, planType, explanation);
    res.json(tasks);
  } catch (err) {
    console.error("[AI] Task generation API error:", err);
    res.status(500).json({ error: "Failed to generate AI tasks" });
  }
});

// POST /api/diagnose — Genkit-powered plant health diagnosis (multimodal vision)
app.post("/api/diagnose", async (req, res) => {
  const { base64, mimeType } = req.body;

  if (!base64 || !mimeType) {
    res.status(400).json({ error: "Missing base64 image data or mimeType" });
    return;
  }

  try {
    console.log(`[Genkit] Running diagnoseFlow...`);
    const result = await diagnoseFlow({ base64, mimeType });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[Genkit] Diagnosis API error:", err);
    res.status(500).json({ success: false, error: "Failed to diagnose plant" });
  }
});

// ══════════════════════════════════════════════
// ── MARKETPLACE API ──
// ══════════════════════════════════════════════

// In-memory store for prototype (replace with Firestore later)
interface MarketplaceOrder {
  id: string;
  requester_uid: string;
  requester_name: string;
  requester_avatar: string;
  plant_id: string;
  plant_name: string;
  plant_emoji: string;
  plan_type?: 'Budget' | 'Balanced' | 'Premium';
  quantity_kg: number;
  reward_rm: number; // This is the BASE reward the requester pays
  platform_fee_rm: number; // 5% fee
  total_paid_rm: number; // reward_rm + platform_fee_rm
  farmer_payout_rm: number; // reward_rm (the farmer gets the base reward)
  deadline_days: number;
  location: string;
  latitude: number;
  longitude: number;
  notes: string;
  difficulty: string;
  status: 'open' | 'accepted' | 'planting' | 'growing' | 'harvested' | 'delivering' | 'completed' | 'disputed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'escrow' | 'released' | 'refunded';
  farmer_uid?: string;
  farmer_name?: string;
  farmer_avatar?: string;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
  checkpoints: any[];
  total_votes: number;
  status_history: { status: string; timestamp: string }[];
  ai_tasks?: {
    main: any[];
    daily: string[];
  };
}

interface ChatMessage {
  id: string;
  order_id: string;
  sender_uid: string;
  sender_name: string;
  text: string;
  image_url?: string;
  type: 'text' | 'system' | 'action';
  action_type?: string;
  timestamp: string;
}

interface MarketplaceUpdate {
  id: string;
  order_id: string;
  farmer_uid: string;
  farmer_name: string;
  farmer_avatar: string;
  checkpoint_index: number;
  description: string;
  photo_url?: string;
  timestamp: string;
  votes: number;
  voter_uids: string[];
}

// Firestore Database Reference
const ordersRef = db.collection('marketplace_orders');
const updatesRef = db.collection('marketplace_updates');
const messagesRef = db.collection('marketplace_messages');

// Helper: generate checkpoints based on plant growth data
function generateCheckpoints(plantId: string, deadlineDays: number): any[] {
  const plant = (getPlantsData() as any).plants.find((p: any) => p.plant_id === plantId);
  const totalDays = plant?.growth_days || deadlineDays;

  // Distribute checkpoints across the timeline
  const seedEnd = Math.round(totalDays * 0.15);
  const sproutEnd = Math.round(totalDays * 0.45);
  const matureEnd = Math.round(totalDays * 0.85);

  return [
    {
      index: 0,
      label: 'Seeds Planted',
      description: 'Initial setup complete — soil prepared, seeds planted, first watering done.',
      due_day: 1,
      completed: false,
      votes: 0,
    },
    {
      index: 1,
      label: 'Germination Check',
      description: 'Seeds have germinated. Submit a photo showing initial sprouting.',
      due_day: Math.max(3, seedEnd),
      completed: false,
      votes: 0,
    },
    {
      index: 2,
      label: 'Sprout Stage',
      description: 'Seedlings are growing well. Submit photo of healthy sprouts with visible leaves.',
      due_day: Math.max(7, sproutEnd),
      completed: false,
      votes: 0,
    },
    {
      index: 3,
      label: 'Growth Update',
      description: 'Plants are in active growth phase. Show progress with a photo and measurement.',
      due_day: Math.max(14, Math.round(totalDays * 0.6)),
      completed: false,
      votes: 0,
    },
    {
      index: 4,
      label: 'Near Harvest',
      description: 'Plants approaching maturity. Submit photo showing harvest-ready signs.',
      due_day: Math.max(21, matureEnd),
      completed: false,
      votes: 0,
    },
    {
      index: 5,
      label: 'Harvest Complete',
      description: 'Harvest done! Submit final photo of the yield with weight/quantity.',
      due_day: deadlineDays,
      completed: false,
      votes: 0,
    },
  ];
}

// Seed demo orders to Firestore if empty
async function seedDemoOrdersToFirestore() {
  // Clear existing orders to fix mismatched IDs/Names mapping from previous seeds
  const existing = await ordersRef.get();
  if (existing.size > 0) {
    const batch = db.batch();
    existing.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[Marketplace] Cleared ${existing.size} mismatched orders for re-seeding.`);
  }

  console.log(`[Marketplace] Seeding demo orders to Firestore...`);
  const demoOrders: Partial<MarketplaceOrder>[] = [
    {
      requester_uid: 'demo_user_001',
      requester_name: 'Sarah',
      requester_avatar: '👩',
      plant_id: 'P001',
      plant_name: 'Kangkung (Water Spinach)',
      plant_emoji: '🍃',
      quantity_kg: 5,
      reward_rm: 35,
      deadline_days: 60,
      location: 'George Town, Penang',
      latitude: 5.4164,
      longitude: 100.3327,
      notes: 'Prefer organic methods. No pesticides please.',
      difficulty: 'medium',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_002',
      requester_name: 'Daniel',
      requester_avatar: '🧑',
      plant_id: 'P003',
      plant_name: 'Long Bean',
      plant_emoji: '🎋',
      quantity_kg: 3,
      reward_rm: 50,
      deadline_days: 70,
      location: 'Johor Bahru, Johor',
      latitude: 1.4927,
      longitude: 103.7414,
      notes: 'Cherry tomatoes preferred. Will collect personally.',
      difficulty: 'medium',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_003',
      requester_name: 'Priya',
      requester_avatar: '👩',
      plant_id: 'P001',
      plant_name: 'Chili',
      plant_emoji: '🌶️',
      quantity_kg: 2,
      reward_rm: 40,
      deadline_days: 45,
      location: 'Ipoh, Perak',
      latitude: 4.5975,
      longitude: 101.0901,
      notes: 'Bird eye chili. The spicier the better!',
      difficulty: 'medium',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_001',
      requester_name: 'Sarah',
      requester_avatar: '👩',
      plant_id: 'P004',
      plant_name: 'Basil',
      plant_emoji: '🍃',
      quantity_kg: 1,
      reward_rm: 20,
      deadline_days: 30,
      location: 'Melaka City',
      latitude: 2.1896,
      longitude: 102.2501,
      notes: 'Sweet basil for my Italian cooking!',
      difficulty: 'easy',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_004',
      requester_name: 'James',
      requester_avatar: '🧑',
      plant_id: 'P002',
      plant_name: 'Lady Finger (Okra)',
      plant_emoji: '🥒',
      quantity_kg: 8,
      reward_rm: 45,
      deadline_days: 21,
      location: 'Kuantan, Pahang',
      latitude: 3.8077,
      longitude: 103.3260,
      notes: 'For restaurant supply. Need consistent weekly batches.',
      difficulty: 'easy',
      status: 'in_progress',
      farmer_uid: 'farmer_008',
      farmer_name: 'Wei Jian',
      farmer_avatar: '🧑‍🌾',
      accepted_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      requester_uid: 'demo_user_005',
      requester_name: 'Lisa',
      requester_avatar: '👩',
      plant_id: 'P002',
      plant_name: 'Mint',
      plant_emoji: '🌿',
      quantity_kg: 0.5,
      reward_rm: 15,
      deadline_days: 30,
      location: 'Bangsar, KL',
      latitude: 3.1295,
      longitude: 101.6710,
      notes: 'For mojitos 🍹 Fresh mint leaves only.',
      difficulty: 'easy',
      status: 'completed',
      farmer_uid: 'farmer_001',
      farmer_name: 'Aisyah',
      farmer_avatar: '👩‍🌾',
      accepted_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      completed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      requester_uid: 'demo_user_006',
      requester_name: 'Zul',
      requester_avatar: '🧑',
      plant_id: 'P001',
      plant_name: 'Chili',
      plant_emoji: '🌶️',
      quantity_kg: 4,
      reward_rm: 55,
      deadline_days: 60,
      location: 'Kota Bharu, Kelantan',
      latitude: 6.1248,
      longitude: 102.2544,
      notes: 'Cili padi for sambal. Need fiery ones!',
      difficulty: 'hard',
      status: 'accepted',
      farmer_uid: 'farmer_002',
      farmer_name: 'Budi',
      farmer_avatar: '🧑‍🌾',
      accepted_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      requester_uid: 'demo_user_007',
      requester_name: 'Christina',
      requester_avatar: '👩',
      plant_id: 'P001',
      plant_name: 'Kangkung (Water Spinach)',
      plant_emoji: '🍃',
      quantity_kg: 3,
      reward_rm: 30,
      deadline_days: 45,
      location: 'Kuching, Sarawak',
      latitude: 1.5535,
      longitude: 110.3593,
      notes: 'For salad bar. Butterhead lettuce preferred.',
      difficulty: 'easy',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_008',
      requester_name: 'Farid',
      requester_avatar: '🧑',
      plant_id: 'P011',
      plant_name: 'Lady Finger (Okra)',
      plant_emoji: '🥒',
      quantity_kg: 5,
      reward_rm: 40,
      deadline_days: 55,
      location: 'Petaling Jaya, Selangor',
      latitude: 3.1279,
      longitude: 101.5945,
      notes: 'Need tender lady fingers for curry.',
      difficulty: 'medium',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_009',
      requester_name: 'Ahmad',
      requester_avatar: '🧑',
      plant_id: 'P003',
      plant_name: 'Long Bean',
      plant_emoji: '🎋',
      quantity_kg: 10,
      reward_rm: 80,
      deadline_days: 70,
      location: 'Kota Kinabalu, Sabah',
      latitude: 5.9804,
      longitude: 116.0735,
      notes: 'For local sauce production.',
      difficulty: 'medium',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_010',
      requester_name: 'Siti',
      requester_avatar: '👩',
      plant_id: 'P004',
      plant_name: 'Basil',
      plant_emoji: '🍃',
      quantity_kg: 2,
      reward_rm: 25,
      deadline_days: 30,
      location: 'Kuala Terengganu, Terengganu',
      latitude: 5.3302,
      longitude: 103.1408,
      notes: 'Thai basil if possible.',
      difficulty: 'easy',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_011',
      requester_name: 'Muthu',
      requester_avatar: '🧑',
      plant_id: 'P016',
      plant_name: 'Brinjal (Eggplant)',
      plant_emoji: '🍆',
      quantity_kg: 6,
      reward_rm: 45,
      deadline_days: 70,
      location: 'Alor Setar, Kedah',
      latitude: 6.1210,
      longitude: 100.3601,
      notes: 'Long purple eggplants.',
      difficulty: 'medium',
      status: 'open',
    },
    {
      requester_uid: 'demo_user_012',
      requester_name: 'Mei Ling',
      requester_avatar: '👩',
      plant_id: 'P002',
      plant_name: 'Lady Finger (Okra)',
      plant_emoji: '🥒',
      quantity_kg: 4,
      reward_rm: 20,
      deadline_days: 21,
      location: 'Seremban, Negeri Sembilan',
      latitude: 2.7258,
      longitude: 101.9378,
      notes: 'Must be fresh and green.',
      difficulty: 'easy',
      status: 'open',
    }
  ];

  let orderIdCounter = 1;
  const batch = db.batch();

  for (const demo of demoOrders) {
    const id = `ORD-${String(orderIdCounter++).padStart(4, '0')}`;
    const checkpoints = generateCheckpoints(demo.plant_id!, demo.deadline_days!);
    
    // Mark checkpoints complete for in-progress and completed orders
    if (demo.status === 'in_progress') {
      checkpoints[0].completed = true;
      checkpoints[0].completed_at = demo.accepted_at;
      checkpoints[1].completed = true;
      checkpoints[1].completed_at = new Date(Date.now() - 3 * 86400000).toISOString();
    }
    if (demo.status === 'completed') {
      checkpoints.forEach((cp, i) => {
        cp.completed = true;
        cp.completed_at = new Date(Date.now() - (checkpoints.length - i) * 3 * 86400000).toISOString();
        cp.votes = Math.floor(Math.random() * 5) + 1;
      });
    }

    const reward = demo.reward_rm!;
    const fee = Math.round(reward * 0.05 * 100) / 100;
    
    const order: MarketplaceOrder = {
      id,
      requester_uid: demo.requester_uid!,
      requester_name: demo.requester_name!,
      requester_avatar: demo.requester_avatar!,
      plant_id: demo.plant_id!,
      plant_name: demo.plant_name!,
      plant_emoji: demo.plant_emoji!,
      quantity_kg: demo.quantity_kg!,
      reward_rm: reward,
      platform_fee_rm: fee,
      total_paid_rm: reward + fee,
      farmer_payout_rm: reward,
      deadline_days: demo.deadline_days!,
      location: demo.location || '',
      latitude: demo.latitude || 0,
      longitude: demo.longitude || 0,
      notes: demo.notes || '',
      difficulty: demo.difficulty || 'medium',
      status: (demo.status as any) || 'open',
      payment_status: demo.status === 'completed' ? 'released' : (demo.status === 'in_progress' ? 'escrow' : 'paid'),
      farmer_uid: demo.farmer_uid,
      farmer_name: demo.farmer_name,
      farmer_avatar: demo.farmer_avatar,
      created_at: new Date(Date.now() - Math.random() * 10 * 86400000).toISOString(),
      accepted_at: demo.accepted_at,
      completed_at: demo.completed_at,
      checkpoints,
      total_votes: demo.status === 'completed' ? 12 : 0,
      status_history: [
        { status: 'open', timestamp: new Date(Date.now() - 10 * 86400000).toISOString() }
      ],
    };

    const docRef = ordersRef.doc(id);
    // Filter out undefined fields to prevent Firestore crash
    const sanitizedOrder = Object.fromEntries(
      Object.entries(order).filter(([_, v]) => v !== undefined)
    );
    batch.set(docRef, sanitizedOrder);
  }

  await batch.commit();
  console.log(`[Marketplace] Seeded demo orders to Firestore`);
}

// GET /api/marketplace/orders — List orders with optional filters
app.get("/api/marketplace/orders", async (req, res) => {
  try {
    const snapshot = await ordersRef.get();
    let results = snapshot.docs.map(doc => doc.data() as MarketplaceOrder);

    const { status, plant_type, difficulty, min_reward, max_reward, max_deadline } = req.query;

    if (status && status !== 'all') {
      results = results.filter(o => o.status === status);
    }
    if (plant_type && plant_type !== 'all') {
      results = results.filter(o => o.plant_name.toLowerCase() === (plant_type as string).toLowerCase());
    }
    if (difficulty && difficulty !== 'all') {
      results = results.filter(o => o.difficulty === difficulty);
    }
    if (min_reward) {
      results = results.filter(o => o.reward_rm >= Number(min_reward));
    }
    if (max_reward) {
      results = results.filter(o => o.reward_rm <= Number(max_reward));
    }
    if (max_deadline) {
      results = results.filter(o => o.deadline_days <= Number(max_deadline));
    }

    // Sort: open first, then by creation date desc
    results.sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/marketplace/orders/:orderId — Get single order
app.get("/api/marketplace/orders/:orderId", async (req, res) => {
  try {
    const doc = await ordersRef.doc(req.params.orderId).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(doc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /api/marketplace/orders — Create new order
app.post("/api/marketplace/orders", async (req, res) => {
  const {
    requester_uid, requester_name, requester_avatar,
    plant_id, plant_name, plant_emoji,
    plan_type,
    quantity_kg, reward_rm, deadline_days,
    location, latitude, longitude, notes, difficulty
  } = req.body;

  if (!plant_id || !quantity_kg || !reward_rm || !deadline_days) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    // Generate a unique short ID for the order
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `ORD-${Date.now().toString().slice(-4)}${randomSuffix}`;
    
    const reward = Number(reward_rm);
    const fee = Math.round(reward * 0.05 * 100) / 100;

    const order: MarketplaceOrder = {
      id,
      requester_uid: requester_uid || 'anonymous',
      requester_name: requester_name || 'Anonymous',
      requester_avatar: requester_avatar || '🧑',
      plant_id,
      plant_name: plant_name || plant_id,
      plant_emoji: plant_emoji || '🌱',
      plan_type: plan_type || 'Budget',
      quantity_kg: Number(quantity_kg),
      reward_rm: reward,
      platform_fee_rm: fee,
      total_paid_rm: reward,
      farmer_payout_rm: Math.round((reward - fee) * 100) / 100,
      deadline_days: Number(deadline_days),
      location: location || '',
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      notes: notes || '',
      difficulty: difficulty || 'medium',
      status: 'open',
      payment_status: 'paid', // For prototype, assume paid on creation
      created_at: new Date().toISOString(),
      checkpoints: generateCheckpoints(plant_id, Number(deadline_days)),
      total_votes: 0,
      status_history: [
        { status: 'open', timestamp: new Date().toISOString() }
      ],
    };

    await ordersRef.doc(id).set(order);
    console.log(`[Marketplace] New order created: ${id} — ${plant_name} (${quantity_kg}kg, RM${reward_rm})`);
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// POST /api/marketplace/orders/:orderId/accept — Farmer accepts order
app.post("/api/marketplace/orders/:orderId/accept", async (req, res) => {
  try {
    const docRef = ordersRef.doc(req.params.orderId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    
    const order = doc.data() as MarketplaceOrder;
    if (order.status !== 'open') {
      res.status(400).json({ error: "Order is not available for acceptance" });
      return;
    }

    const { farmer_uid, farmer_name, farmer_avatar } = req.body;

    if (farmer_uid === order.requester_uid) {
      res.status(400).json({ error: "You cannot accept your own order" });
      return;
    }
    
    order.status = 'accepted';
    order.farmer_uid = farmer_uid || 'unknown';
    order.farmer_name = farmer_name || 'Farmer';
    order.farmer_avatar = farmer_avatar || '🧑‍🌾';
    order.accepted_at = new Date().toISOString();
    order.payment_status = 'escrow';

    await docRef.update({
      status: order.status,
      farmer_uid: order.farmer_uid,
      farmer_name: order.farmer_name,
      farmer_avatar: order.farmer_avatar,
      accepted_at: order.accepted_at,
      payment_status: order.payment_status,
      status_history: admin.firestore.FieldValue.arrayUnion({
        status: 'accepted',
        timestamp: order.accepted_at
      })
    });

    // Add a system message to chat
    const msgId = `MSG-${Date.now()}`;
    await messagesRef.doc(msgId).set({
      id: msgId,
      order_id: req.params.orderId,
      sender_uid: 'system',
      sender_name: 'System',
      text: `Order accepted by ${order.farmer_name}. Negotiation and tracking enabled!`,
      type: 'system',
      timestamp: new Date().toISOString()
    });

    console.log(`[Marketplace] Order ${order.id} accepted by ${order.farmer_name}`);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept order" });
  }
});

// POST /api/marketplace/orders/:orderId/status — Update order status (Logistics)
app.post("/api/marketplace/orders/:orderId/status", async (req, res) => {
  const { status, user_uid } = req.body;
  const validStatuses = ['planting', 'growing', 'harvested', 'delivering', 'completed', 'disputed', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  try {
    const docRef = ordersRef.doc(req.params.orderId);
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = doc.data() as MarketplaceOrder;
    
    // ROLE ENFORCEMENT
    const isFarmer = user_uid === order.farmer_uid;
    const isRequester = user_uid === order.requester_uid;

    if (!isFarmer && !isRequester) {
      res.status(403).json({ error: "Unauthorized to update status" });
      return;
    }

    // Farmer-only transitions
    if (['planting', 'growing', 'harvested', 'delivering'].includes(status) && !isFarmer) {
      res.status(403).json({ error: "Only the farmer can update logistics status" });
      return;
    }

    // Requester-only transitions
    if (status === 'completed' && !isRequester) {
      res.status(403).json({ error: "Only the requester can confirm completion" });
      return;
    }

    const oldStatus = order.status;
    const timestamp = new Date().toISOString();
    
    const updateData: any = { 
      status,
      status_history: admin.firestore.FieldValue.arrayUnion({ status, timestamp })
    };

    if (status === 'completed' && oldStatus !== 'completed') {
      updateData.completed_at = timestamp;
      updateData.payment_status = 'released';
      
      // Credit the farmer
      if (order.farmer_uid) {
        const farmerRef = db.collection('users').doc(order.farmer_uid);
        const payout = order.farmer_payout_rm || (order.reward_rm * 0.95);
        await farmerRef.update({
          total_earnings: admin.firestore.FieldValue.increment(payout),
          completed_orders: admin.firestore.FieldValue.increment(1),
          xp: admin.firestore.FieldValue.increment(100)
        });
        console.log(`[Marketplace] Status Change: Credited Farmer ${order.farmer_uid} with RM${payout.toFixed(2)}`);
      }
    } else if (status === 'cancelled') {
      updateData.payment_status = 'refunded';
    }

    await docRef.update(updateData);

    // Add system message
    const msgId = `MSG-${Date.now()}`;
    await messagesRef.doc(msgId).set({
      id: msgId,
      order_id: req.params.orderId,
      sender_uid: 'system',
      sender_name: 'System',
      text: `Status updated from ${oldStatus} to ${status}.`,
      type: 'system',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// GET /api/marketplace/orders/:orderId/messages — Get chat history
app.get("/api/marketplace/orders/:orderId/messages", async (req, res) => {
  try {
    const snapshot = await messagesRef
      .where('order_id', '==', req.params.orderId)
      .get();
    
    const messages = snapshot.docs.map(doc => doc.data() as ChatMessage);
    // Sort in-memory to avoid index requirement
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/marketplace/orders/:orderId/messages — Send message
app.post("/api/marketplace/orders/:orderId/messages", async (req, res) => {
  const { sender_uid, sender_name, text, type, action_type } = req.body;
  
  if (!text && !action_type) {
    res.status(400).json({ error: "Message content is required" });
    return;
  }

  try {
    const msgId = `MSG-${Date.now()}`;
    const message: ChatMessage = {
      id: msgId,
      order_id: req.params.orderId,
      sender_uid,
      sender_name,
      text: text || '',
      type: type || 'text',
      action_type,
      timestamp: new Date().toISOString()
    };

    await messagesRef.doc(msgId).set(message);
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET /api/marketplace/orders/:orderId/updates — Get progress updates
app.get("/api/marketplace/orders/:orderId/updates", async (req, res) => {
  try {
    const snapshot = await updatesRef
      .where("order_id", "==", req.params.orderId)
      .get();
      
    const updates = snapshot.docs.map(doc => doc.data());
    // Sort in-memory to avoid index requirement
    updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(updates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch updates" });
  }
});

// POST /api/marketplace/orders/:orderId/updates — Submit checkpoint update
app.post("/api/marketplace/orders/:orderId/updates", async (req, res) => {
  try {
    const docRef = ordersRef.doc(req.params.orderId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    
    const order = doc.data() as MarketplaceOrder;
    if (order.status !== 'accepted' && order.status !== 'in_progress') {
      res.status(400).json({ error: "Order is not in a state to receive updates" });
      return;
    }

    const { farmer_uid, farmer_name, farmer_avatar, checkpoint_index, description, photo_url } = req.body;

    // Mark checkpoint complete
    const cp = order.checkpoints.find((c: any) => c.index === checkpoint_index);
    if (cp) {
      cp.completed = true;
      cp.completed_at = new Date().toISOString();
    }

    // Update order status
    if (order.status === 'accepted') {
      order.status = 'in_progress';
    }

    // Check if all checkpoints complete
    const allComplete = order.checkpoints.every((c: any) => c.completed);
    if (allComplete) {
      order.status = 'pending_review';
    }

    // Save order updates
    await docRef.update({
      status: order.status,
      checkpoints: order.checkpoints
    });

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const updateId = `UPD-${Date.now().toString().slice(-4)}${randomSuffix}`;
    
    const update: MarketplaceUpdate = {
      id: updateId,
      order_id: order.id,
      farmer_uid: farmer_uid || order.farmer_uid || '',
      farmer_name: farmer_name || order.farmer_name || '',
      farmer_avatar: farmer_avatar || order.farmer_avatar || '',
      checkpoint_index: Number(checkpoint_index),
      description: description || '',
      photo_url: photo_url || '',
      timestamp: new Date().toISOString(),
      votes: 0,
      voter_uids: [],
    };

    await updatesRef.doc(updateId).set(update);
    console.log(`[Marketplace] Checkpoint ${checkpoint_index} updated for order ${order.id}`);
    res.status(201).json({ update, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit update" });
  }
});

// POST /api/marketplace/orders/:orderId/complete — Requester confirms completion
app.post("/api/marketplace/orders/:orderId/complete", async (req, res) => {
  try {
    const docRef = ordersRef.doc(req.params.orderId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const completed_at = new Date().toISOString();
    await docRef.update({
      status: 'completed',
      completed_at
    });

    const order = doc.data() as MarketplaceOrder;
    order.status = 'completed';
    order.completed_at = completed_at;

    // Credit the farmer
    if (order.farmer_uid) {
      const farmerRef = db.collection('users').doc(order.farmer_uid);
      const payout = order.farmer_payout_rm || (order.reward_rm * 0.95);
      await farmerRef.update({
        total_earnings: admin.firestore.FieldValue.increment(payout),
        completed_orders: admin.firestore.FieldValue.increment(1),
        xp: admin.firestore.FieldValue.increment(100) // Bonus XP for completing an order
      });
      console.log(`[Marketplace] Credited Farmer ${order.farmer_uid} with RM${payout.toFixed(2)}`);
    }

    console.log(`[Marketplace] Order ${order.id} completed! Farmer: ${order.farmer_name}, Reward: RM${order.reward_rm}`);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete order" });
  }
});

// POST /api/marketplace/orders/:orderId/vote — Community upvote
app.post("/api/marketplace/orders/:orderId/vote", async (req, res) => {
  try {
    const { checkpoint_index, voter_uid } = req.body;
    const docRef = ordersRef.doc(req.params.orderId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = doc.data() as MarketplaceOrder;
    const cp = order.checkpoints.find((c: any) => c.index === checkpoint_index);
    if (cp) {
      cp.votes = (cp.votes || 0) + 1;
      order.total_votes = (order.total_votes || 0) + 1;
      
      await docRef.update({
        checkpoints: order.checkpoints,
        total_votes: order.total_votes
      });
    }

    // Update the update entry if it exists
    const updateSnapshot = await updatesRef
      .where('order_id', '==', order.id)
      .where('checkpoint_index', '==', checkpoint_index)
      .limit(1)
      .get();

    if (!updateSnapshot.empty) {
      const updateDoc = updateSnapshot.docs[0];
      const updateData = updateDoc.data() as MarketplaceUpdate;
      
      if (!updateData.voter_uids.includes(voter_uid)) {
        updateData.votes += 1;
        updateData.voter_uids.push(voter_uid);
        await updateDoc.ref.update({
          votes: updateData.votes,
          voter_uids: updateData.voter_uids
        });
      }
    }

    res.json({ order, voted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to vote" });
  }
});

// POST /api/marketplace/orders/:orderId/shared-progress — Sync quest progress between requester/farmer plants
app.post("/api/marketplace/orders/:orderId/shared-progress", async (req, res) => {
  try {
    const orderRef = ordersRef.doc(req.params.orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = orderSnap.data() as MarketplaceOrder;
    const { plant_id, source_category, state, task_state, ai_tasks } = req.body;

    if (!plant_id || !state || !task_state) {
      res.status(400).json({ error: "Missing shared progress fields" });
      return;
    }

    const sharedKey = `marketplace-order-${order.id}`;
    const updatedAt = new Date().toISOString();

    const updates: any = {
      shared_progress_key: sharedKey,
      shared_progress_state: state,
      shared_progress_task_state: task_state,
      shared_progress_updated_at: admin.firestore.Timestamp.now(),
      shared_progress_source_category: source_category || 'chosen_plant',
      ai_tasks: ai_tasks || order.ai_tasks || null,
    };

    // Auto-transition logistics status based on quest progress
    let statusChanged = false;
    const currentStatus = order.status;

    if (currentStatus === 'accepted') {
      updates.status = 'planting';
      statusChanged = true;
    } else if (currentStatus === 'planting' && (task_state['intro-3'] || state.growthStage > 0)) {
      updates.status = 'growing';
      statusChanged = true;
    } else if (currentStatus === 'growing' && state.growthStage >= 3) {
       // Assuming stage 3 is harvest-ready
       updates.status = 'harvested';
       statusChanged = true;
    }

    if (statusChanged) {
      updates.status_history = [
        ...order.status_history,
        { status: updates.status, timestamp: updatedAt }
      ];
      console.log(`[Marketplace] Order ${order.id} auto-transitioned to ${updates.status} via quest progress`);
    }

    await orderRef.update(updates);

    const updatePlantsForUser = async (uid?: string) => {
      if (!uid) return;
      const plantsRef = db.collection('users').doc(uid).collection('user_plants');
      const snap = await plantsRef.where('shared_progress_key', '==', sharedKey).get();
      const matches = snap.docs.filter((doc) => {
        const data = doc.data() as any;
        return data.plant_id === plant_id;
      });

      if (!matches.length) return;

      const batch = db.batch();
      matches.forEach((docSnap) => {
        const data = docSnap.data() as any;
        batch.update(docSnap.ref, {
          state,
          task_state,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          ai_tasks: ai_tasks || data.ai_tasks || null,
        });
      });
      await batch.commit();
    };

    await updatePlantsForUser(order.requester_uid);
    await updatePlantsForUser(order.farmer_uid);

    res.json({ ok: true, order_id: order.id, shared_progress_key: sharedKey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync shared progress" });
  }
});

// DELETE /api/marketplace/orders/:orderId — Delete an open order
app.delete("/api/marketplace/orders/:orderId", async (req, res) => {
  try {
    const docRef = ordersRef.doc(req.params.orderId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = doc.data() as MarketplaceOrder;
    if (order.status !== 'open') {
      res.status(400).json({ error: "Only open orders can be deleted" });
      return;
    }

    const orderId = req.params.orderId;
    const sharedKey = `marketplace-order-${orderId}`;

    // Function to clean up plant entries for a specific user
    const cleanupUserPlants = async (uid?: string) => {
      if (!uid) return;
      const plantsRef = db.collection('users').doc(uid).collection('user_plants');
      const snap = await plantsRef.where('shared_progress_key', '==', sharedKey).get();
      const batch = db.batch();
      snap.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    };

    // Clean up for both parties
    await cleanupUserPlants(order.requester_uid);
    await cleanupUserPlants(order.farmer_uid);

    await docRef.delete();
    console.log(`[Marketplace] Order ${orderId} and associated garden quests deleted`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete order and clean up garden" });
  }
});

// DELETE /api/users/:uid/plants/:instanceId — Delete a plant from user's garden
app.delete("/api/users/:uid/plants/:instanceId", async (req, res) => {
  try {
    const { uid, instanceId } = req.params;
    const plantRef = db.collection('users').doc(uid).collection('user_plants').doc(instanceId);
    const plantDoc = await plantRef.get();

    if (!plantDoc.exists) {
      res.status(404).json({ error: "Plant instance not found" });
      return;
    }

    const plantData = plantDoc.data() as any;
    const sharedKey = plantData.shared_progress_key;

    // If it's an accepted marketplace order, we should release the order back to 'open'
    if (plantData.source_category === 'accepted_order' && sharedKey?.startsWith('marketplace-order-')) {
      const orderId = sharedKey.replace('marketplace-order-', '');
      const orderRef = ordersRef.doc(orderId);
      const orderDoc = await orderRef.get();

      if (orderDoc.exists) {
        console.log(`[Marketplace] Releasing order ${orderId} back to 'open' status due to farmer deletion`);
        await orderRef.update({
          status: 'open',
          farmer_uid: admin.firestore.FieldValue.delete(),
          farmer_name: admin.firestore.FieldValue.delete(),
          farmer_avatar: admin.firestore.FieldValue.delete(),
          accepted_at: admin.firestore.FieldValue.delete(),
          // Clear shared progress fields too
          shared_progress_state: admin.firestore.FieldValue.delete(),
          shared_progress_task_state: admin.firestore.FieldValue.delete(),
          shared_progress_updated_at: admin.firestore.FieldValue.delete(),
        });
      }
    }

    await plantRef.delete();
    console.log(`[Garden] User ${uid} deleted plant ${instanceId} (${plantData.plant_name})`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete plant from garden" });
  }
});

// GET /api/marketplace/my-orders — Get orders for current user
app.get("/api/marketplace/my-orders", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      res.status(400).json({ error: "uid query parameter required" });
      return;
    }

    const [reqSnapshot, farmSnapshot] = await Promise.all([
      ordersRef.where('requester_uid', '==', uid).get(),
      ordersRef.where('farmer_uid', '==', uid).get()
    ]);

    const asRequester = reqSnapshot.docs.map(d => d.data() as MarketplaceOrder);
    const asFarmer = farmSnapshot.docs.map(d => d.data() as MarketplaceOrder);

    res.json({ as_requester: asRequester, as_farmer: asFarmer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

// GET /api/marketplace/plant-options — Get plant options for order creation
app.get("/api/marketplace/plant-options", (_req, res) => {
  const options = (getPlantsData() as any).plants.map((p: any) => ({
    plant_id: p.plant_id,
    name: p.name,
    emoji: p.emoji || '🌱',
    difficulty: p.difficulty,
    growth_days: p.growth_days,
    type: p.type,
  }));
  res.json(options);
});

app.listen(PORT, async () => {
  console.log(`🌱 FarmQuest API running on http://localhost:${PORT}`);
  
  // Seed database
  try {
    await seedDemoOrdersToFirestore();
  } catch (err) {
    console.error("[Marketplace] Seeding failed:", err);
  }

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
    for (const plant of (getPlantsData() as any).plants) {
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
// Restarting seed