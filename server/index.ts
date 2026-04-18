import express from "express";
import cors from "cors";
import plantsData from "./data/plants.json" with { type: "json" };

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`🌱 FarmQuest API running on http://localhost:${PORT}`);
});
