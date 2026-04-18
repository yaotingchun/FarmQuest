'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import type { RecommendationResult, UserPreference } from '@/lib/recommendationEngine'
import './results.css'

// ── Difficulty badge colours ───────────────────────────────────────────────────
const DIFF_META: Record<string, { label: string; cls: string; emoji: string }> = {
  easy:   { label: 'Easy',   cls: 'badge-easy',   emoji: '🟢' },
  medium: { label: 'Medium', cls: 'badge-medium',  emoji: '🟡' },
  hard:   { label: 'Hard',   cls: 'badge-hard',    emoji: '🔴' },
}

// ── Score ring colour ─────────────────────────────────────────────────────────
function scoreColour(score: number) {
  if (score >= 80) return 'var(--accent)'
  if (score >= 60) return '#facc15'
  return '#f87171'
}

// ── Plant card ────────────────────────────────────────────────────────────────
function PlantCard({ plant, rank }: { plant: RecommendationResult; rank: number }) {
  const diff = DIFF_META[plant.difficulty] ?? DIFF_META.medium
  const colour = scoreColour(plant.match_score)

  return (
    <div className="result-card" style={{ animationDelay: `${rank * 0.1}s` }}>
      {/* Rank ribbon */}
      <div className="rank-ribbon">#{rank}</div>

      {/* Score meter */}
      <div className="score-ring" style={{ background: `conic-gradient(${colour} ${plant.match_score}%, rgba(255,255,255,0.06) 0%)` }}>
        <div className="score-ring-inner">
          <span className="score-num">{plant.match_score}</span>
          <span className="score-label">score</span>
        </div>
      </div>

      {/* Info */}
      <div className="card-body">
        <h2 className="result-plant-name">{plant.name}</h2>
        <p className="result-plant-id">{plant.plant_id}</p>

        <div className="result-meta">
          <span className={`diff-badge ${diff.cls}`}>{diff.emoji} {diff.label}</span>
          <span className="growth-pill">🌱 {plant.estimated_growth_days}d to harvest</span>
        </div>

        {/* Score bar */}
        <div className="score-bar-wrap">
          <div className="score-bar-label">
            <span>Match strength</span>
            <span style={{ color: colour }}>{plant.match_score}%</span>
          </div>
          <div className="score-bar-track">
            <div
              className="score-bar-fill"
              style={{ width: `${plant.match_score}%`, background: `linear-gradient(90deg, var(--green-700), ${colour})` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Summary of what the user chose ───────────────────────────────────────────
const PREF_LABELS: Record<string, string> = {
  full_sun: 'Full Sun ☀️',
  partial: 'Partial Shade 🌤️',
  low_light: 'Low Light 🌥️',
  low: 'Low time ⏱️',
  medium: 'Medium time ⏱️',
  high: 'High time ⏱️',
  food: 'Grow Food 🥦',
  aesthetics: 'Beautify Space 🌸',
  air_quality: 'Cleaner Air 🌬️',
}

// ── Inner content (needs useSearchParams so must be in Suspense) ──────────────
function ResultsInner() {
  const params = useSearchParams()
  const router = useRouter()

  const rawData = params.get('data')
  const rawPrefs = params.get('prefs')

  if (!rawData) {
    return (
      <div className="results-empty">
        <p>No results found.</p>
        <button className="btn-primary" onClick={() => router.push('/preferences')}>
          Start Quiz →
        </button>
      </div>
    )
  }

  const results: RecommendationResult[] = JSON.parse(decodeURIComponent(rawData))
  const prefs: UserPreference | null = rawPrefs ? JSON.parse(decodeURIComponent(rawPrefs)) : null

  const top5 = results.slice(0, 5)

  return (
    <div className="results-shell">
      {/* Hero area */}
      <div className="results-hero">
        <div className="results-badge">
          <span className="badge-dot" />
          Your Personalised Results
        </div>
        <h1 className="results-title">
          Your top plant<br />
          <span className="results-title-accent">recommendations</span>
        </h1>
        <p className="results-sub">
          Based on your preferences, here are the plants most likely to thrive in your space.
        </p>

        {/* Pref chips */}
        {prefs && (
          <div className="pref-chips">
            <span className="pref-chip">{PREF_LABELS[prefs.sunlight] ?? prefs.sunlight}</span>
            <span className="pref-chip">{PREF_LABELS[prefs.time_commitment] ?? prefs.time_commitment}</span>
            <span className="pref-chip">{PREF_LABELS[prefs.goal] ?? prefs.goal}</span>
            <span className="pref-chip">🌡️ {prefs.temperature}°C</span>
            <span className="pref-chip">💧 {prefs.humidity}% humidity</span>
            <span className="pref-chip">🌧️ {prefs.rainfall} mm rain</span>
            <span className="pref-chip">☀️ {prefs.sunlight_hours} hrs sun</span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="results-grid">
        {top5.map((plant, i) => (
          <PlantCard key={plant.plant_id} plant={plant} rank={i + 1} />
        ))}
      </div>

      {/* CTA row */}
      <div className="results-actions">
        <button
          className="btn-primary"
          onClick={() => router.push('/preferences')}
        >
          ↩ Start Over
        </button>
        <button
          className="btn-secondary"
          onClick={() => router.push('/explore')}
        >
          Browse All Plants →
        </button>
      </div>
    </div>
  )
}

// ── Page export ───────────────────────────────────────────────────────────────
export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="results-loading">
        <div className="loading-pulse" />
        <p>Analysing your preferences…</p>
      </div>
    }>
      <ResultsInner />
    </Suspense>
  )
}
