"use client";

import { Box, Droplets, Layers, FlaskConical, Check, Sprout } from "lucide-react";
import type { PlantSetup, NutritionStage } from "@/types/plant";
import { useState } from "react";

// ── Pot Card ──
export function PotCard({ pot, reason }: { pot: PlantSetup["pot"]; reason?: string }) {
  return (
    <div className="setup-card">
      <div className="setup-card-header">
        <div className="setup-card-icon">
          <Box size={20} />
        </div>
        <h3 className="setup-card-title">
          Pot Selection
          <span className="setup-card-subtitle"> (Choose one)</span>
        </h3>
      </div>

      <div className="setup-chips">
        {pot.material.map((mat) => (
          <span key={mat} className="setup-chip">{mat}</span>
        ))}
      </div>

      <div className="setup-stat-grid">
        <div className="setup-stat">
          <span className="setup-stat-value">{pot.min_diameter_cm}cm</span>
          <span className="setup-stat-label">Min. Diameter</span>
        </div>
        <div className="setup-stat">
          <span className="setup-stat-value">{pot.depth_cm}cm</span>
          <span className="setup-stat-label">Depth</span>
        </div>
      </div>

      <div className={`setup-indicator ${pot.drainage_required ? "setup-indicator-active" : ""}`}>
        <Droplets size={14} />
        <span>Drainage {pot.drainage_required ? "Required" : "Optional"}</span>
        {pot.drainage_required && <Check size={14} className="setup-indicator-check" />}
      </div>


    </div>
  );
}

// ── Soil Card ──
export function SoilCard({ soil, reason }: { soil: PlantSetup["soil"]; reason?: string }) {
  return (
    <div className="setup-card">
      <div className="setup-card-header">
        <div className="setup-card-icon">
          <Layers size={20} />
        </div>
        <h3 className="setup-card-title">Soil Composition</h3>
      </div>

      <div className="soil-mix-list">
        {soil.mix.map((comp) => (
          <div key={comp.component} className="soil-mix-item">
            <div className="soil-mix-bar-track">
              <div
                className="soil-mix-bar-fill"
                style={{ width: `${comp.percentage}%` }}
              />
            </div>
            <div className="soil-mix-info">
              <span className="soil-mix-name">{comp.component}</span>
              <span className="soil-mix-pct">{comp.percentage}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="setup-meta-row">
        <div className="setup-meta">
          <span className="setup-meta-label">pH Range</span>
          <span className="setup-meta-value">{soil.ph_range}</span>
        </div>
        <div className="setup-meta">
          <span className="setup-meta-label">Moisture</span>
          <span className="setup-meta-value">{soil.moisture}</span>
        </div>
      </div>


    </div>
  );
}

// ── Seed Card ──
export function SeedCard({ seed, plantName }: { seed: PlantSetup["seed"]; plantName: string }) {
  return (
    <div className="setup-card">
      <div className="setup-card-header">
        <div className="setup-card-icon">
          <Sprout size={20} />
        </div>
        <h3 className="setup-card-title">Seed / Seedling Guide</h3>
      </div>

      <div className="seed-method-badge">
        {seed.method === "seed" ? "🌱 From Seed" : "🪴 From Seedling"}
      </div>

      <div className="setup-stat-grid">
        <div className="setup-stat">
          <span className="setup-stat-value">{seed.germination_days}</span>
          <span className="setup-stat-label">Germination (days)</span>
        </div>
        <div className="setup-stat">
          <span className="setup-stat-value">{seed.planting_depth_cm}cm</span>
          <span className="setup-stat-label">Planting Depth</span>
        </div>
      </div>

      <p className="setup-card-note">
        Plant your {plantName.toLowerCase()} {seed.method}s at {seed.planting_depth_cm}cm depth and expect sprouts in {seed.germination_days} days.
      </p>
    </div>
  );
}

// ── Nutrition Card ──
export function NutritionCard({ stages }: { stages: NutritionStage[] }) {
  const [activeStage, setActiveStage] = useState(0);

  // Safety Check: If stages are missing or empty, show a gentle loading/fallback state
  if (!stages || stages.length === 0) {
    return (
      <div className="setup-card">
        <div className="setup-card-header">
          <div className="setup-card-icon"><FlaskConical size={20} /></div>
          <h3 className="setup-card-title">Nutrition Plan</h3>
        </div>
        <div className="nutrition-loading">Nutrition data loading...</div>
      </div>
    );
  }

  const current = stages[activeStage] || stages[0];

  return (
    <div className="setup-card">
      <div className="setup-card-header">
        <div className="setup-card-icon">
          <FlaskConical size={20} />
        </div>
        <h3 className="setup-card-title">Nutrition Plan</h3>
      </div>

      <div className="nutrition-tabs">
        {stages.map((s, i) => (
          <button
            key={s.stage || i}
            className={`nutrition-tab ${i === activeStage ? "nutrition-tab-active" : ""}`}
            onClick={() => setActiveStage(i)}
          >
            {s.stage}
          </button>
        ))}
      </div>

      <div className="nutrition-detail">
        <div className="nutrition-npk">
          <span className="nutrition-npk-label">NPK</span>
          <span className="nutrition-npk-value">{current?.npk || "N/A"}</span>
        </div>
        <div className="setup-meta-row">
          <div className="setup-meta">
            <span className="setup-meta-label">Type</span>
            <span className="setup-meta-value">{current?.type || "Standard"}</span>
          </div>
          <div className="setup-meta">
            <span className="setup-meta-label">Frequency</span>
            <span className="setup-meta-value">{current?.frequency || "As needed"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
