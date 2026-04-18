'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { rankPlantsByPreferences, type UserPreference } from '@/lib/recommendationEngine'
import './preferences.css'

// ── Step configuration (steps 1–3 stay as option-based) ───────────────────────
type OptionStep = {
  id: number
  field: keyof UserPreference
  kind: 'options'
  title: string
  subtitle: string
  icon: string
  options: { value: string; label: string; emoji: string; sub?: string }[]
}

const OPTION_STEPS: OptionStep[] = [
  {
    id: 1,
    field: 'sunlight',
    kind: 'options',
    title: 'How much sunlight does your space get?',
    subtitle: 'This helps us find plants that actually thrive where you are.',
    icon: '☀️',
    options: [
      { value: 'full_sun',  label: 'Full Sun',     emoji: '☀️',  sub: '6+ hours of direct sunlight' },
      { value: 'partial',   label: 'Partial Shade', emoji: '🌤️', sub: '3–6 hours of sunlight' },
      { value: 'low_light', label: 'Low Light',    emoji: '🌥️', sub: 'Minimal or indirect light' },
    ],
  },
  {
    id: 2,
    field: 'time_commitment',
    kind: 'options',
    title: 'How much time can you commit per week?',
    subtitle: "We'll match plants to your schedule — no guilt trips.",
    icon: '⏱️',
    options: [
      { value: 'low',    label: 'Low',    emoji: '🙂', sub: 'Under 15 min / week' },
      { value: 'medium', label: 'Medium', emoji: '🌿', sub: '15–30 min / week' },
      { value: 'high',   label: 'High',   emoji: '💪', sub: '30+ min / week' },
    ],
  },
  {
    id: 3,
    field: 'goal',
    kind: 'options',
    title: 'What is your main growing goal?',
    subtitle: 'Tell us what you want to get out of your garden.',
    icon: '🎯',
    options: [
      { value: 'food',        label: 'Grow Food',     emoji: '🥦', sub: 'Vegetables, herbs & fruits' },
      { value: 'aesthetics',  label: 'Beautify Space', emoji: '🌸', sub: 'Flowers & decorative plants' },
      { value: 'air_quality', label: 'Cleaner Air',    emoji: '🌬️', sub: 'Air-purifying indoor plants' },
    ],
  },
]

const TOTAL_STEPS = 4 // 3 option steps + 1 temperature step

// ── GPS + Climate helpers ─────────────────────────────────────────────────────
type GeoStatus = 'idle' | 'locating' | 'fetching' | 'done' | 'error'

interface ClimateData {
  temperature: number
  latitude: number
  longitude: number
  locationName?: string
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state || ''
    const country = data.address?.country || ''
    return city ? `${city}, ${country}` : country || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
  } catch {
    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
  }
}

async function fetchClimate(lat: number, lon: number): Promise<ClimateData> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`
  )
  if (!res.ok) throw new Error('Climate API failed')
  const data = await res.json()
  const locationName = await reverseGeocode(lat, lon)
  return {
    temperature: Math.round(data.current.temperature_2m),
    latitude: lat,
    longitude: lon,
    locationName,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PreferencesPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<UserPreference>>({})

  // GPS / climate state — only used on step 3 (the 4th screen)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [geoError, setGeoError] = useState('')
  const [climate, setClimate] = useState<ClimateData | null>(null)
  const [manualTemp, setManualTemp] = useState<number>(28) // fallback default

  const isTemperatureStep = step === 3
  const progressPct = ((step + 1) / TOTAL_STEPS) * 100

  // ── Auto-detect when temperature step is reached ────────────────────────────
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error')
      setGeoError('Geolocation is not supported by your browser.')
      return
    }

    setGeoStatus('locating')
    setGeoError('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoStatus('fetching')
        try {
          const data = await fetchClimate(pos.coords.latitude, pos.coords.longitude)
          setClimate(data)
          setManualTemp(data.temperature)
          setGeoStatus('done')
        } catch {
          setGeoStatus('error')
          setGeoError('Could not fetch weather data. You can enter temperature manually.')
        }
      },
      () => {
        setGeoStatus('error')
        setGeoError('Location access denied. You can enter temperature manually below.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => {
    if (isTemperatureStep && geoStatus === 'idle') {
      detectLocation()
    }
  }, [isTemperatureStep, geoStatus, detectLocation])

  // ── Option step selection ───────────────────────────────────────────────────
  function selectOption(value: string) {
    const next = { ...answers, [OPTION_STEPS[step].field]: value }
    setAnswers(next)

    setTimeout(() => {
      setStep(s => s + 1)
    }, 240)
  }

  // ── Temperature confirm ─────────────────────────────────────────────────────
  function confirmTemperature() {
    const prefs: UserPreference = {
      sunlight: answers.sunlight as string,
      time_commitment: answers.time_commitment as 'low' | 'medium' | 'high',
      goal: answers.goal as string,
      temperature: manualTemp,
    }
    const results = rankPlantsByPreferences(prefs)
    const encoded = encodeURIComponent(JSON.stringify(results))
    const prefsEncoded = encodeURIComponent(JSON.stringify(prefs))
    router.push(`/results?data=${encoded}&prefs=${prefsEncoded}`)
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="pref-shell">
      {/* Header */}
      <div className="pref-header">
        <div className="pref-logo">🌱 FarmQuest</div>
        <div className="pref-step-counter">Step {step + 1} of {TOTAL_STEPS}</div>
      </div>

      {/* Progress Bar */}
      <div className="pref-progress-wrap">
        <div className="pref-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>

      {/* ── Option Steps (1-3) ── */}
      {!isTemperatureStep && (
        <div className="pref-card" key={step}>
          <div className="pref-icon">{OPTION_STEPS[step].icon}</div>
          <h1 className="pref-title">{OPTION_STEPS[step].title}</h1>
          <p className="pref-subtitle">{OPTION_STEPS[step].subtitle}</p>

          <div className="pref-options">
            {OPTION_STEPS[step].options.map(opt => (
              <button
                key={opt.value}
                className={`pref-option ${answers[OPTION_STEPS[step].field] === opt.value ? 'selected' : ''}`}
                onClick={() => selectOption(opt.value)}
              >
                <span className="opt-emoji">{opt.emoji}</span>
                <div className="opt-text">
                  <span className="opt-label">{opt.label}</span>
                  {opt.sub && <span className="opt-sub">{opt.sub}</span>}
                </div>
                <div className="opt-check">
                  {answers[OPTION_STEPS[step].field] === opt.value && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {step > 0 && (
            <button className="pref-back-btn" onClick={goBack}>
              ← Back
            </button>
          )}
        </div>
      )}

      {/* ── Temperature Step (4) — GPS Auto-detect ── */}
      {isTemperatureStep && (
        <div className="pref-card" key="temp-step">
          <div className="pref-icon">🌡️</div>
          <h1 className="pref-title">Detecting your local climate</h1>
          <p className="pref-subtitle">
            We use your location to fetch real-time temperature so we can match plants
            to your environment. You can always override it.
          </p>

          {/* Status indicator */}
          {(geoStatus === 'locating' || geoStatus === 'fetching') && (
            <div className="geo-loading">
              <div className="geo-spinner" />
              <span>{geoStatus === 'locating' ? 'Finding your location…' : 'Fetching weather data…'}</span>
            </div>
          )}

          {geoStatus === 'error' && (
            <div className="geo-error">
              <span className="geo-error-icon">⚠️</span>
              <span>{geoError}</span>
              <button className="geo-retry-btn" onClick={() => { setGeoStatus('idle'); detectLocation() }}>
                Retry
              </button>
            </div>
          )}

          {/* Detected result card */}
          {geoStatus === 'done' && climate && (
            <div className="geo-result">
              <div className="geo-result-icon">📍</div>
              <div className="geo-result-info">
                <span className="geo-location-name">{climate.locationName}</span>
                <span className="geo-coords">
                  {climate.latitude.toFixed(4)}°N, {climate.longitude.toFixed(4)}°E
                </span>
              </div>
              <div className="geo-detected-temp">
                <span className="geo-temp-value">{climate.temperature}°C</span>
                <span className="geo-temp-label">Live temperature</span>
              </div>
            </div>
          )}

          {/* Temperature slider — always visible (once loading is done or on error) */}
          {(geoStatus === 'done' || geoStatus === 'error') && (
            <div className="temp-control">
              <label className="temp-label">
                {geoStatus === 'done' ? 'Adjust if needed' : 'Set your temperature'}
              </label>
              <div className="temp-slider-row">
                <span className="temp-range-label">10°C</span>
                <input
                  type="range"
                  min={10}
                  max={45}
                  step={1}
                  value={manualTemp}
                  onChange={e => setManualTemp(Number(e.target.value))}
                  className="temp-slider"
                />
                <span className="temp-range-label">45°C</span>
              </div>
              <div className="temp-display">
                <span className="temp-big">{manualTemp}°C</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="temp-actions">
            <button className="pref-back-btn" onClick={goBack}>
              ← Back
            </button>
            {(geoStatus === 'done' || geoStatus === 'error') && (
              <button className="temp-confirm-btn" onClick={confirmTemperature}>
                See My Plants →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step dots */}
      <div className="pref-dots">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`pref-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
        ))}
      </div>
    </div>
  )
}
