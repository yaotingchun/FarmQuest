"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, Sparkles, Rocket, AlertTriangle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { PotCard, SoilCard, SeedCard, NutritionCard } from "@/components/planting-setup/Cards";
import { ShoppingList } from "@/components/planting-setup/ShoppingList";
import { generateAIExplanation } from "@/utils/ai-placeholders";
import type { PlantSetup, Difficulty } from "@/types/plant";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const difficultyColors: Record<Difficulty, string> = {
  Easy: "badge-easy",
  Medium: "badge-medium",
  Hard: "badge-hard",
};

export default function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [plant, setPlant] = useState<PlantSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlant = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/plants/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("not_found");
          } else {
            setError("server_error");
          }
          return;
        }
        const data = await res.json();
        setPlant(data);
      } catch {
        setError("network_error");
      } finally {
        setLoading(false);
      }
    };
    fetchPlant();
  }, [id]);

  const handleAIExplain = () => {
    // TODO: Integrate Gemini AI explanation here
    if (plant) {
      const explanation = generateAIExplanation(plant);
      alert(explanation);
    } else {
      alert("AI explanation coming soon");
    }
  };

  const handleStartPlanting = () => {
    if (plant) {
      router.push(`/quest?plant=${id}`);
    }
  };

  // ── Loading State ──
  if (loading) return <SkeletonPage />;

  // ── Error States ──
  if (error === "not_found") {
    return (
      <div className="setup-page">
        <div className="setup-error">
          <div className="setup-error-icon">🔍</div>
          <h2>Plant not found</h2>
          <p>We couldn't find a plant with that ID. It may have been removed or the URL is incorrect.</p>
          <button className="btn-primary" onClick={() => router.push("/recommendations")}>
            ← Back to Recommendations
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="setup-page">
        <div className="setup-error">
          <AlertTriangle size={40} className="setup-error-alert" />
          <h2>Unable to load plant data</h2>
          <p>Please check that the backend server is running and try again.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!plant) return null;

  // ── Build dynamic timeline markers from nutrition stages ──
  const stageEmojis: Record<string, string> = {
    seedling: "🌱",
    vegetative: "🌿",
    fruiting: "🌶️",
    flowering: "🌸",
  };

  const stages = plant.nutrition.stages.map((s) => s.stage);
  const totalMarkers = stages.length + 1; // +1 for harvest
  const markers = stages.map((stage, i) => ({
    emoji: stageEmojis[stage] || "🌱",
    label: stage,
    position: (i / (totalMarkers - 1)) * 100,
  }));
  // Add harvest marker at the end
  markers.push({ emoji: "✅", label: "harvest", position: 100 });

  // ── Render ──
  return (
    <div className="setup-page">
      {/* Back Navigation */}
      <button className="setup-back" onClick={() => router.push("/recommendations")}>
        <ArrowLeft size={18} />
        <span>Recommendations</span>
      </button>

      {/* Hero / Header */}
      <div className="setup-hero">
        <div className="setup-hero-emoji">{plant.emoji}</div>
        <div className="setup-hero-info">
          <div className="setup-hero-top">
            <h1 className="setup-hero-name">{plant.name}</h1>
            <span className={`reco-badge ${difficultyColors[plant.difficulty]}`}>
              {plant.difficulty}
            </span>
          </div>
          <p className="setup-hero-desc">{plant.description}</p>
          <div className="setup-hero-meta">
            <Clock size={14} />
            <span>{plant.growth_time_days} days to harvest</span>
          </div>
        </div>
      </div>

      {/* Growth Progress Indicator */}
      <div className="setup-growth-bar">
        <div className="setup-growth-label">
          <span>Growth Timeline</span>
          <span>{plant.growth_time_days} days</span>
        </div>
        <div className="setup-growth-track">
          <div className="setup-growth-fill" style={{ width: "0%" }} />
          <div className="setup-growth-markers">
            {markers.map((m) => (
              <span
                key={m.label}
                className="setup-growth-marker"
                style={{ left: `${m.position}%` }}
                title={m.label}
              >
                {m.emoji}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Setup Guide Cards */}
      <div className="setup-grid">
        <PotCard pot={plant.pot} />
        <SoilCard soil={plant.soil} />
        <SeedCard seed={plant.seed} plantName={plant.name} />
        <NutritionCard stages={plant.nutrition.stages} />
      </div>

      {/* Shopping List */}
      <ShoppingList plant={plant} />

      {/* Action Buttons */}
      <div className="setup-actions">
        <button className="btn-primary setup-cta" onClick={handleStartPlanting}>
          <Rocket size={18} />
          <span>Start Planting</span>
        </button>
        <button className="btn-secondary setup-ai-btn" onClick={handleAIExplain}>
          <Sparkles size={18} />
          <span>Explain This Setup (AI)</span>
        </button>
      </div>
    </div>
  );
}
