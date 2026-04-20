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
    field: 'space',
    kind: 'options',
    title: 'Where would you like to plant?',
    subtitle: 'This helps us match plants to your available space.',
    icon: '🏡',
    options: [
      { value: 'balcony', label: 'Balcony', emoji: '🏢', sub: 'Apartment balconies or small patios' },
      { value: 'garden', label: 'Garden', emoji: '🏡', sub: 'Backyard or open ground' },
      { value: 'indoor', label: 'Indoor', emoji: '🪴', sub: 'Inside the house' },
    ],
  },
  {
    id: 2,
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
    id: 3,
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
]

const TOTAL_STEPS = 4 // 3 option steps + 1 climate step

// ── GPS + Climate helpers ─────────────────────────────────────────────────────
type GeoStatus = 'idle' | 'locating' | 'fetching' | 'done' | 'error'

interface ClimateData {
  temperature: number
  humidity: number
  rainfall: number          // mm (today)
  sunlight_hours: number    // hours (today)
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
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m` +
    `&daily=precipitation_sum,sunshine_duration` +
    `&timezone=auto&forecast_days=1`
  )
  if (!res.ok) throw new Error('Climate API failed')
  const data = await res.json()

  const temperature = Math.round(data.current.temperature_2m)
  const humidity = Math.round(data.current.relative_humidity_2m)
  const rainfall = data.daily?.precipitation_sum?.[0] ?? 0       // mm today
  const sunshineSec = data.daily?.sunshine_duration?.[0] ?? 0
  const sunlight_hours = Math.round((sunshineSec / 3600) * 10) / 10  // hours, 1dp

  const locationName = await reverseGeocode(lat, lon)

  return {
    temperature,
    humidity,
    rainfall: Math.round(rainfall * 10) / 10,
    sunlight_hours,
    latitude: lat,
    longitude: lon,
    locationName,
  }
}

// ── Defaults when GPS fails ───────────────────────────────────────────────────
const DEFAULT_CLIMATE: Omit<ClimateData, 'latitude' | 'longitude' | 'locationName'> = {
  temperature: 28,
  humidity: 65,
  rainfall: 2,
  sunlight_hours: 6,
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PreferencesPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<UserPreference>>({})

  // GPS / climate state
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [geoError, setGeoError] = useState('')
  const [climate, setClimate] = useState<ClimateData | null>(null)

  // Overridable values (seeded from API or defaults)
  const [manualTemp, setManualTemp] = useState(DEFAULT_CLIMATE.temperature)
  const [manualHumidity, setManualHumidity] = useState(DEFAULT_CLIMATE.humidity)
  const [manualRainfall, setManualRainfall] = useState(DEFAULT_CLIMATE.rainfall)
  const [manualSunHours, setManualSunHours] = useState(DEFAULT_CLIMATE.sunlight_hours)

  const isClimateStep = step === 3
  const progressPct = ((step + 1) / TOTAL_STEPS) * 100

  // ── Auto-detect when climate step is reached ────────────────────────────────
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
          setManualHumidity(data.humidity)
          setManualRainfall(data.rainfall)
          setManualSunHours(data.sunlight_hours)
          setGeoStatus('done')
        } catch {
          setGeoStatus('error')
          setGeoError('Could not fetch weather data. You can adjust values manually.')
        }
      },
      () => {
        setGeoStatus('error')
        setGeoError('Location access denied. You can adjust values manually below.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => {
    if (isClimateStep && geoStatus === 'idle') {
      detectLocation()
    }
  }, [isClimateStep, geoStatus, detectLocation])

  // ── Option step selection ───────────────────────────────────────────────────
  function selectOption(value: string) {
    const next = { ...answers, [OPTION_STEPS[step].field]: value }
    setAnswers(next)

    setTimeout(() => {
      setStep(s => s + 1)
    }, 240)
  }

  // ── Climate confirm → run engine ────────────────────────────────────────────
  function confirmClimate() {
    const prefs: UserPreference = {
      space: answers.space as string,
      sunlight: answers.sunlight as string,
      time_commitment: answers.time_commitment as 'low' | 'medium' | 'high',
      goal: 'food',
      temperature: manualTemp,
      humidity: manualHumidity,
      rainfall: manualRainfall,
      sunlight_hours: manualSunHours,
    }
    const results = rankPlantsByPreferences(prefs)
    const encoded = encodeURIComponent(JSON.stringify(results))
    const prefsEncoded = encodeURIComponent(JSON.stringify(prefs))
    router.push(`/results?data=${encoded}&prefs=${prefsEncoded}`)
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1)
  }

  const climateReady = geoStatus === 'done' || geoStatus === 'error'

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
      {!isClimateStep && (
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

      {/* ── Climate Step (4) — GPS Auto-detect ── */}
      {isClimateStep && (
        <div className="pref-card" key="climate-step">
          <div className="pref-icon">🌍</div>
          <h1 className="pref-title">Detecting your local climate</h1>
          <p className="pref-subtitle">
            We fetch real-time temperature, humidity, rainfall, and sunlight from
            your location to find the perfect plants. You can override any value.
          </p>

          {/* Status indicator */}
          {(geoStatus === 'locating' || geoStatus === 'fetching') && (
            <div className="geo-loading">
              <div className="geo-spinner" />
              <span>{geoStatus === 'locating' ? 'Finding your location…' : 'Fetching climate data…'}</span>
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

          {/* Detected location header */}
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
                <span className="geo-temp-value">LIVE</span>
                <span className="geo-temp-label">real-time data</span>
              </div>
            </div>
          )}

          {/* ── Climate data grid with sliders ── */}
          {climateReady && (
            <div className="climate-grid">
              {/* Temperature */}
              <div className="climate-tile">
                <div className="tile-header">
                  <span className="tile-emoji">🌡️</span>
                  <span className="tile-label">Temperature</span>
                </div>
                <div className="tile-value">{manualTemp}°C</div>
                <input
                  type="range" min={5} max={45} step={1}
                  value={manualTemp}
                  onChange={e => setManualTemp(Number(e.target.value))}
                  className="tile-slider"
                />
                <div className="tile-range">
                  <span>5°C</span><span>45°C</span>
                </div>
              </div>

              {/* Humidity */}
              <div className="climate-tile">
                <div className="tile-header">
                  <span className="tile-emoji">💧</span>
                  <span className="tile-label">Humidity</span>
                </div>
                <div className="tile-value">{manualHumidity}%</div>
                <input
                  type="range" min={10} max={100} step={1}
                  value={manualHumidity}
                  onChange={e => setManualHumidity(Number(e.target.value))}
                  className="tile-slider"
                />
                <div className="tile-range">
                  <span>10%</span><span>100%</span>
                </div>
              </div>

              {/* Rainfall */}
              <div className="climate-tile">
                <div className="tile-header">
                  <span className="tile-emoji">🌧️</span>
                  <span className="tile-label">Rainfall</span>
                </div>
                <div className="tile-value">{manualRainfall} mm</div>
                <input
                  type="range" min={0} max={30} step={0.5}
                  value={manualRainfall}
                  onChange={e => setManualRainfall(Number(e.target.value))}
                  className="tile-slider"
                />
                <div className="tile-range">
                  <span>0 mm</span><span>30 mm</span>
                </div>
              </div>

              {/* Sunlight Hours */}
              <div className="climate-tile">
                <div className="tile-header">
                  <span className="tile-emoji">☀️</span>
                  <span className="tile-label">Sunlight</span>
                </div>
                <div className="tile-value">{manualSunHours} hrs</div>
                <input
                  type="range" min={0} max={14} step={0.5}
                  value={manualSunHours}
                  onChange={e => setManualSunHours(Number(e.target.value))}
                  className="tile-slider"
                />
                <div className="tile-range">
                  <span>0 hrs</span><span>14 hrs</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="temp-actions">
            <button className="pref-back-btn" onClick={goBack}>
              ← Back
            </button>
            {climateReady && (
              <button className="temp-confirm-btn" onClick={confirmClimate}>
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
