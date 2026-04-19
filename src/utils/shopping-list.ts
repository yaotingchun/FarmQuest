import type { PlantSetup, ShoppingItem } from "@/types/plant";

/**
 * Generates a categorized shopping list from plant setup data.
 * Each item includes a unique ID, category label, and human-readable name.
 */
export function generateShoppingList(plant: PlantSetup): ShoppingItem[] {
  const items: ShoppingItem[] = [];

  // Pot materials
  // Pot material — Only one for choose to tick
  if (plant.pot.material.length > 0) {
    const primary = plant.pot.material[0];
    const others = plant.pot.material.slice(1);
    const othersText = others.length > 0
      ? ` (or use: ${others.map(capitalize).join(", ")})`
      : "";

    items.push({
      id: `pot-0`,
      category: "pot",
      name: `${capitalize(primary)} pot (Recommended)`,
      detail: `Min. ${plant.pot.min_diameter_cm}cm Ø × ${plant.pot.depth_cm}cm deep${othersText}`,
      checked: false,
    });
  }

  // Soil components
  plant.soil.mix.forEach((comp, i) => {
    items.push({
      id: `soil-${i}`,
      category: "soil",
      name: capitalize(comp.component),
      detail: `${comp.percentage}% of mix`,
      checked: false,
    });
  });

  // Seeds / seedlings
  items.push({
    id: "seed-0",
    category: "seed",
    name: `${plant.name} ${plant.seed.method === "seed" ? "seeds" : "seedlings"}`,
    detail: `Plant at ${plant.seed.planting_depth_cm}cm depth`,
    checked: false,
  });

  // Fertilizers — deduplicate by type+npk
  const seen = new Set<string>();
  plant.nutrition.stages.forEach((stage, i) => {
    const key = `${stage.type}-${stage.npk}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push({
        id: `fert-${i}`,
        category: "fertilizer",
        name: `${capitalize(stage.type)} (NPK ${stage.npk})`,
        detail: `Used in ${stage.stage} stage, ${stage.frequency}`,
        checked: false,
      });
    }
  });

  return items;
}

/**
 * Formats all shopping list items into a copy-friendly text string.
 */
export function formatShoppingListText(
  plantName: string,
  items: ShoppingItem[]
): string {
  const lines = [`🛒 Shopping List — ${plantName}`, ""];
  const categories = ["pot", "soil", "seed", "fertilizer"] as const;
  const categoryLabels: Record<string, string> = {
    pot: "🪴 Pot",
    soil: "🌍 Soil",
    seed: "🌱 Seed",
    fertilizer: "🧪 Fertilizer",
  };

  for (const cat of categories) {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length === 0) continue;
    lines.push(categoryLabels[cat]);
    catItems.forEach((item) => {
      const check = item.checked ? "✅" : "⬜";
      lines.push(`  ${check} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
