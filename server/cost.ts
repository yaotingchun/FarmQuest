// ── Deterministic Cost Calculation ──
// Prices in RM (Malaysian Ringgit) — calculated deterministically from prices.json

import fs from 'fs';
import path from 'path';

// Load prices from external JSON
const pricesPath = path.resolve(__dirname, './data/prices.json');
let priceMap: Record<string, { min: number; max: number }> = {};

try {
  const fileContent = fs.readFileSync(pricesPath, 'utf-8');
  priceMap = JSON.parse(fileContent);
} catch (error) {
  console.error('[Cost Engine] Failed to load prices.json:', error);
}

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

interface CostablePlan {
  pot: {
    material: string[];
    [key: string]: unknown;
  };
  soil: {
    mix: SoilComponent[];
    [key: string]: unknown;
  };
  seed: {
    method: string;
    [key: string]: unknown;
  };
  nutrition: {
    stages: NutritionStage[];
  };
}

/**
 * Returns the deterministic average price from min/max bounds in prices.json.
 * Includes fuzzy matching for AI-generated variations.
 */
function getAveragePrice(itemName: string): number {
  if (!itemName) return 0;
  
  const key = itemName.toLowerCase().trim();
  
  // Exact match
  if (priceMap[key]) {
    return (priceMap[key].min + priceMap[key].max) / 2;
  }

  // Fuzzy fallback: try partial match
  for (const [mapKey, range] of Object.entries(priceMap)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return (range.min + range.max) / 2;
    }
  }

  // Safe fallback if NOT found
  return 0;
}

export function calculateCost(plan: CostablePlan, planType: string = "Balanced"): number {
  let total = 0;
  const breakdown: { item: string; cost: number }[] = [];

  const addCost = (item: string, cost: number) => {
    total += cost;
    breakdown.push({ item, cost });
  };

  // 1. Pot cost (Use the first material listed)
  if (plan.pot?.material && plan.pot.material.length > 0) {
    const potItem = plan.pot.material[0];
    const lookupKey = potItem.toLowerCase().includes('pot') ? potItem : `${potItem} pot`;
    addCost(potItem, getAveragePrice(lookupKey));
  }

  // 2. Soil cost (weighted by percentage)
  if (plan.soil?.mix) {
    for (const comp of plan.soil.mix) {
      if (comp.component && typeof comp.percentage === 'number') {
        const fullPrice = getAveragePrice(comp.component);
        const weightedPrice = fullPrice * (comp.percentage / 100);
        addCost(comp.component, weightedPrice);
      }
    }
  }

  // 3. Fertilizer cost (weighted by usage factor for urban farming)
  if (plan.nutrition?.stages) {
    const seenTypes = new Set<string>();
    const USAGE_FACTOR = 0.35; // You don't use the whole bottle for one plant
    for (const stage of plan.nutrition.stages) {
      if (stage.type) {
        const typeKey = stage.type.toLowerCase().trim();
        if (!seenTypes.has(typeKey)) {
          seenTypes.add(typeKey);
          const fullPrice = getAveragePrice(stage.type);
          addCost(stage.type, fullPrice * USAGE_FACTOR);
        }
      }
    }
  }

  // 4. Seeds cost (weighted by usage factor)
  const SEED_USAGE_FACTOR = 0.5; // You don't use the whole pack for one plant
  const seedItem = plan.seed?.method || 'seeds';
  const seedCost = getAveragePrice('seeds') * SEED_USAGE_FACTOR;
  addCost(`Seed method: ${seedItem}`, seedCost);

  // 5. Apply Subtle Quality Multipliers
  let finalMultiplier = 1.0;
  const typePrefix = planType.toLowerCase();
  
  if (typePrefix === "balanced") {
    finalMultiplier = 1.15;
  } else if (typePrefix === "premium") {
    finalMultiplier = 1.3;
  }

  return Math.round(total * finalMultiplier);
}
