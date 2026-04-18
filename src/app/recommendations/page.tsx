"use client";

import { useRouter } from "next/navigation";
import { Clock, Leaf, ChevronRight } from "lucide-react";
import type { PlantSummary, Difficulty } from "@/types/plant";

// ── Mock Data (easily replaceable with API call) ──
// future: const plants = await fetch("/api/recommendations").then(r => r.json());
const mockRecommendedPlants: PlantSummary[] = [
  {
    plant_id: "chili",
    name: "Chili",
    difficulty: "Medium",
    growth_time_days: 60,
    emoji: "🌶️",
    description: "A rewarding and spicy addition to any urban garden.",
  },
  {
    plant_id: "mint",
    name: "Mint",
    difficulty: "Easy",
    growth_time_days: 30,
    emoji: "🌿",
    description: "One of the easiest herbs to grow indoors.",
  },
  {
    plant_id: "lettuce",
    name: "Lettuce",
    difficulty: "Easy",
    growth_time_days: 25,
    emoji: "🥬",
    description: "A fast-growing leafy green perfect for beginners.",
  },
];

const difficultyColors: Record<Difficulty, string> = {
  Easy: "badge-easy",
  Medium: "badge-medium",
  Hard: "badge-hard",
};

export default function RecommendationsPage() {
  const router = useRouter();
  const plants = mockRecommendedPlants;

  return (
    <div className="reco-page">
      <div className="reco-header">
        <div className="section-label">
          <Leaf size={14} />
          <span>Recommended For You</span>
        </div>
        <h1 className="section-title">
          Pick a Plant to <span className="hero-title-line2" style={{ display: "inline" }}>Get Started</span>
        </h1>
        <p className="section-desc">
          Choose from our AI-curated selection of plants that are perfect for urban growing.
          Each card leads to a full planting setup guide.
        </p>
      </div>

      {plants.length === 0 ? (
        <div className="reco-empty">
          <div className="reco-empty-icon">🔍</div>
          <h2>No suitable plants found</h2>
          <p>Try adjusting your preferences or check back later for new recommendations.</p>
        </div>
      ) : (
        <div className="reco-grid">
          {plants.map((plant, index) => (
            <button
              key={plant.plant_id}
              className="reco-card"
              onClick={() => router.push(`/plant/${plant.plant_id}`)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="reco-card-emoji">{plant.emoji}</div>
              <div className="reco-card-body">
                <div className="reco-card-top">
                  <h2 className="reco-card-name">{plant.name}</h2>
                  <span className={`reco-badge ${difficultyColors[plant.difficulty]}`}>
                    {plant.difficulty}
                  </span>
                </div>
                <p className="reco-card-desc">{plant.description}</p>
                <div className="reco-card-footer">
                  <div className="reco-card-stat">
                    <Clock size={14} />
                    <span>{plant.growth_time_days} days</span>
                  </div>
                  <div className="reco-card-arrow">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
