"use client";

import "../plant/plant.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, Leaf, ChevronRight, AlertTriangle } from "lucide-react";
import type { PlantSummary, Difficulty } from "@/types/plant";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const difficultyColors: Record<string, string> = {
  easy: "badge-easy",
  medium: "badge-medium",
  hard: "badge-hard",
  Easy: "badge-easy",
  Medium: "badge-medium",
  Hard: "badge-hard",
};

const formatDifficulty = (d: string) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();

export default function RecommendationsPage() {
  const router = useRouter();
  const [plants, setPlants] = useState<PlantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const res = await fetch(`${API_URL}/api/plants`);
        if (!res.ok) throw new Error("Failed to fetch plants");
        const data = await res.json();
        setPlants(data);
      } catch (err) {
        setError("Unable to connect to the plant database. Please ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlants();
  }, []);

  if (loading) {
    return (
      <div className="reco-page">
        <div className="reco-header">
          <h1 className="section-title">Analyzing Habitat...</h1>
          <p className="section-desc">Loading our botanical catalog for your location.</p>
        </div>
        <div className="reco-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="reco-card skeleton-pulse" style={{ height: "300px", background: "rgba(255,255,255,0.05)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reco-page">
        <div className="reco-error">
          <AlertTriangle size={48} color="#ef4444" />
          <h2>Connection Interrupted</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>Retry Uplink</button>
        </div>
      </div>
    );
  }

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
          Choose from our selection of {plants.length} species optimized for urban growing.
          Each card leads to a detailed planting setup guide.
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
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="reco-card-emoji">{plant.emoji}</div>
              <div className="reco-card-body">
                <div className="reco-card-top">
                  <h2 className="reco-card-name">{plant.name}</h2>
                  <span className={`reco-badge ${difficultyColors[plant.difficulty] || "badge-medium"}`}>
                    {formatDifficulty(plant.difficulty)}
                  </span>
                </div>
                <p className="reco-card-desc">{plant.description}</p>
                <div className="reco-card-footer">
                  <div className="reco-card-stat">
                    <Clock size={14} />
                    <span>{plant.growth_days} days</span>
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
