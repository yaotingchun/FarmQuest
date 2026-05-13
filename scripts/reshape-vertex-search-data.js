const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourcePlantsPath = path.join(rootDir, 'server', 'data', 'plants.json');
const sourcePricesPath = path.join(rootDir, 'server', 'data', 'prices.json');
const outputDir = path.join(rootDir, 'server', 'data', 'vertex-search');
const plantOutputPath = path.join(outputDir, 'plants.jsonl');
const priceOutputPath = path.join(outputDir, 'prices.jsonl');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonl(filePath, records) {
  const contents = records.map((record) => JSON.stringify(record)).join('\n') + '\n';
  fs.writeFileSync(filePath, contents, 'utf8');
}

function flattenPlant(plant) {
  return {
    id: plant.plant_id,
    plant_id: plant.plant_id,
    name: plant.name,
    scientific_name: plant.scientific_name,
    sunlight: plant.sunlight,
    water: plant.water,
    temp_min: plant.temp_min,
    temp_max: plant.temp_max,
    humidity_min: plant.humidity_min,
    humidity_max: plant.humidity_max,
    difficulty: plant.difficulty,
    growth_days: plant.growth_days,
    type: plant.type,
    space: Array.isArray(plant.space) ? plant.space.join(', ') : plant.space,
    description: plant.description,
    care_tips: plant.care_tips,
    weekly_time_minutes: plant.weekly_time_minutes,
    emoji: plant.emoji,
    pot_material: plant.pot?.material?.join(', '),
    pot_min_diameter_cm: plant.pot?.min_diameter_cm,
    pot_depth_cm: plant.pot?.depth_cm,
    pot_drainage_required: plant.pot?.drainage_required,
    soil_mix: plant.soil?.mix
      ?.map((item) => `${item.component}:${item.percentage}%`)
      .join(', '),
    soil_ph_range: plant.soil?.ph_range,
    soil_moisture: plant.soil?.moisture,
    seed_method: plant.seed?.method,
    seed_germination_days: plant.seed?.germination_days,
    seed_planting_depth_cm: plant.seed?.planting_depth_cm,
    nutrition_stages: Array.isArray(plant.nutrition?.stages)
      ? plant.nutrition.stages
          .map((stage) => `${stage.stage}:${stage.npk}:${stage.type}:${stage.frequency}`)
          .join(' | ')
      : undefined,
    source_type: 'plant_catalog',
    source_file: 'plants.json',
    content: [
      plant.name,
      plant.scientific_name,
      plant.description,
      plant.care_tips,
      `Difficulty: ${plant.difficulty}`,
      `Growth days: ${plant.growth_days}`,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

function flattenPriceEntry(item, range) {
  return {
    id: item,
    item,
    min_price: range.min,
    max_price: range.max,
    price_range: `${range.min}-${range.max}`,
    source_type: 'price_catalog',
    source_file: 'prices.json',
    content: `${item} price range RM${range.min} to RM${range.max}`,
  };
}

function main() {
  const plantData = readJson(sourcePlantsPath);
  const priceData = readJson(sourcePricesPath);

  fs.mkdirSync(outputDir, { recursive: true });

  const plantRecords = (plantData.plants || []).map(flattenPlant);
  const priceRecords = Object.entries(priceData).map(([item, range]) => flattenPriceEntry(item, range));

  writeJsonl(plantOutputPath, plantRecords);
  writeJsonl(priceOutputPath, priceRecords);

  console.log(`Wrote ${plantRecords.length} plant records to ${plantOutputPath}`);
  console.log(`Wrote ${priceRecords.length} price records to ${priceOutputPath}`);
}

main();