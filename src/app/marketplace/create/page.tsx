'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sprout, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import '../marketplace.css'

interface PlantOption {
  plant_id: string; name: string; emoji: string;
  difficulty: string; growth_days: number; type: string;
}

interface AIPlan {
  plan_type: 'Budget' | 'Balanced' | 'Premium'
  name: string
  emoji: string
  description: string
  growth_days: number
  difficulty: string
  cost?: number
  currency?: string
  pot?: { material?: string[]; min_diameter_cm?: number; depth_cm?: number; drainage_required?: boolean }
  soil?: { mix?: { component: string; percentage: number }[]; ph_range?: string; moisture?: string }
  seed?: { method?: string; germination_days?: string; planting_depth_cm?: number }
  nutrition?: { stages: { stage: string; npk?: string; type?: string; frequency?: string }[] }
}

export default function CreateOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useAuth()
  const [plants, setPlants] = useState<PlantOption[]>([])
  const [selectedPlant, setSelectedPlant] = useState<PlantOption | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<AIPlan | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reward, setReward] = useState('')
  const [deadline, setDeadline] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  const prefillPlantId = searchParams.get('plant')
  const prefillPlanType = (searchParams.get('plan') as 'Budget' | 'Balanced' | 'Premium' | null) || 'Budget'

  const hasPrefill = !!prefillPlantId

  useEffect(() => {
    fetch('http://localhost:3001/api/marketplace/plant-options')
      .then(r => r.json())
      .then((data) => {
        setPlants(data)
        if (prefillPlantId) {
          const match = data.find((p: PlantOption) => p.plant_id === prefillPlantId)
          if (match) {
            setSelectedPlant(match)
            if (!deadline) setDeadline(String(match.growth_days))
          }
        }
      })
      .catch(() => {})
  }, [prefillPlantId])

  useEffect(() => {
    if (!prefillPlantId) return
    fetch(`http://localhost:3001/api/plants/${prefillPlantId}/ai-plans`)
      .then(r => r.json())
      .then((plans: AIPlan[]) => {
        const plan = plans.find(p => p.plan_type === prefillPlanType) || plans[0]
        if (plan) {
          setSelectedPlan(plan)
          if (!deadline) setDeadline(String(plan.growth_days))
          if (!reward && plan.cost !== undefined) setReward(String(plan.cost))
        }
      })
      .catch(() => {})
  }, [prefillPlantId, prefillPlanType])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGpsPos({ lat: 3.1390, lng: 101.6869 })
      )
    }
  }, [])

  const canSubmit = selectedPlant && quantity && reward && deadline && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('http://localhost:3001/api/marketplace/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_uid: user?.uid || 'anonymous',
          requester_name: profile?.username || 'Anonymous',
          requester_avatar: profile?.avatar || '🧑',
          plant_id: selectedPlant!.plant_id,
          plant_name: selectedPlant!.name,
          plant_emoji: selectedPlant!.emoji,
          quantity_kg: Number(quantity),
          reward_rm: Number(reward),
          deadline_days: Number(deadline),
          location,
          latitude: gpsPos?.lat || 0,
          longitude: gpsPos?.lng || 0,
          notes,
          difficulty: selectedPlant!.difficulty,
          plan_type: prefillPlanType,
        }),
      })
      if (res.ok) {
        const createdOrder = await res.json()
        setToast('🌱 Order posted successfully!')
        setTimeout(() => router.push(`/quest/quests?plant=${encodeURIComponent(selectedPlant!.plant_id)}&plan=${encodeURIComponent(prefillPlanType)}&source=posted_order&order=${encodeURIComponent(createdOrder.id)}`), 1200)
      }
    } catch {
      setToast('Failed to create order')
    }
    setSubmitting(false)
  }

  return (
    <div className="mp-create-page">
      {toast && <div className="mp-toast">{toast}</div>}

      <Link href="/marketplace" className="mp-back"><ArrowLeft size={16} /> Back to Marketplace</Link>

      <div className="mp-badge" style={{ marginBottom: 16 }}><Sprout size={14} /> POST A PLANT ORDER</div>
      <h1 className="mp-title" style={{ fontSize: '1.8rem', marginBottom: 24 }}>
        Create <span>Plant Order</span>
      </h1>

      <div className="mp-create-card">
        {/* Step 1 */}
        <div className="mp-form-step-label">🌱 Step 1 — {hasPrefill ? 'Plant Summary' : 'Select Plant'}</div>
        {hasPrefill && selectedPlant ? (
          <div className="mp-plant-summary">
            <div className="mp-plant-summary-head">
              <span className="mp-plant-summary-title">{selectedPlant.emoji} {selectedPlant.name}</span>
              <span className="mp-plant-summary-plan">{selectedPlan?.plan_type || prefillPlanType}</span>
            </div>

            <div className="mp-plant-summary-grid">
              <div className="mp-plant-summary-item">
                <span className="mp-plant-summary-label">Growth Days</span>
                <span className="mp-plant-summary-value">{selectedPlan?.growth_days || selectedPlant.growth_days} days</span>
              </div>
              <div className="mp-plant-summary-item">
                <span className="mp-plant-summary-label">Difficulty</span>
                <span className="mp-plant-summary-value">{selectedPlan?.difficulty || selectedPlant.difficulty}</span>
              </div>
            </div>

            {selectedPlan?.description && (
              <div className="mp-plant-summary-desc">{selectedPlan.description}</div>
            )}

            <div className="mp-plant-summary-subtitle">Setup Details</div>
            <div className="mp-setup-detail-grid">
              <div className="mp-setup-detail-card">
                <div className="mp-setup-detail-title">Pot</div>
                <div className="mp-setup-detail-text">
                  {selectedPlan?.pot?.material?.length ? selectedPlan.pot.material.join(', ') : '-'}
                  {selectedPlan?.pot?.min_diameter_cm ? ` · ${selectedPlan.pot.min_diameter_cm}cm` : ''}
                  {selectedPlan?.pot?.depth_cm ? ` deep` : ''}
                  {selectedPlan?.pot?.drainage_required ? ' · drainage required' : ''}
                </div>
              </div>
              <div className="mp-setup-detail-card">
                <div className="mp-setup-detail-title">Soil</div>
                <div className="mp-setup-detail-text">
                  {selectedPlan?.soil?.mix?.length
                    ? selectedPlan.soil.mix.map(part => `${part.component} ${part.percentage}%`).join(', ')
                    : '-'}
                  {selectedPlan?.soil?.ph_range ? ` · pH ${selectedPlan.soil.ph_range}` : ''}
                  {selectedPlan?.soil?.moisture ? ` · ${selectedPlan.soil.moisture}` : ''}
                </div>
              </div>
              <div className="mp-setup-detail-card">
                <div className="mp-setup-detail-title">Seed</div>
                <div className="mp-setup-detail-text">
                  {selectedPlan?.seed?.method || '-'}
                  {selectedPlan?.seed?.germination_days ? ` · ${selectedPlan.seed.germination_days}` : ''}
                  {selectedPlan?.seed?.planting_depth_cm ? ` · ${selectedPlan.seed.planting_depth_cm}cm depth` : ''}
                </div>
              </div>
            </div>

            {selectedPlan?.nutrition?.stages?.length ? (
              <>
                <div className="mp-plant-summary-subtitle">Fertilizer Plan (NPK & Frequency)</div>
                <div className="mp-nutrition-stage-list">
                  {selectedPlan.nutrition.stages.map((stage, idx) => (
                    <div key={`${stage.stage}-${idx}`} className="mp-nutrition-stage-card">
                      <div className="mp-nutrition-stage-name">{stage.stage}</div>
                      <div className="mp-nutrition-stage-meta">
                        <span>NPK: <strong>{stage.npk || '-'}</strong></span>
                        <span>Type: <strong>{stage.type || '-'}</strong></span>
                        <span>Frequency: <strong>{stage.frequency || '-'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className="mp-plant-picker">
            {plants.map(p => (
              <button
                key={p.plant_id}
                className={`mp-plant-option ${selectedPlant?.plant_id === p.plant_id ? 'selected' : ''}`}
                onClick={() => { setSelectedPlant(p); if (!deadline) setDeadline(String(p.growth_days)) }}
              >
                <span className="mp-plant-option-emoji">{p.emoji}</span>
                <span className="mp-plant-option-name">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mp-form-divider" />

        {/* Step 2: Order Details */}
        <div className="mp-form-step-label">📦 Step 2 — Order Details</div>
        <div className="mp-form-row-3">
          <div className="mp-form-group">
            <label>Quantity (kg)</label>
            <input className="mp-form-input" type="number" placeholder="e.g. 5" value={quantity}
              onChange={e => setQuantity(e.target.value)} min="0.1" step="0.1" />
          </div>
          <div className="mp-form-group">
            <label>Reward (RM)</label>
            <input className="mp-form-input" type="number" placeholder="e.g. 50" value={reward}
              onChange={e => setReward(e.target.value)} min="1" />
          </div>
          <div className="mp-form-group">
            <label>Deadline (days)</label>
            <input className="mp-form-input" type="number" placeholder="e.g. 30" value={deadline}
              onChange={e => setDeadline(e.target.value)} min="7" />
          </div>
        </div>

        <div className="mp-form-divider" />

        {/* Step 3: Location */}
        <div className="mp-form-step-label">📍 Step 3 — Location</div>
        <div className="mp-form-group">
          <label>Location Label</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="mp-form-input" placeholder="e.g. Bangsar, KL" value={location}
              onChange={e => setLocation(e.target.value)} />
            <button className="mp-gps-btn" onClick={() => {
              if (gpsPos) setLocation(`GPS: ${gpsPos.lat.toFixed(4)}, ${gpsPos.lng.toFixed(4)}`)
            }}><MapPin size={12} /> GPS</button>
          </div>
        </div>
        <div className="mp-form-group">
          <label>Notes (optional)</label>
          <textarea className="mp-form-input" placeholder="Any preferences, methods, or details..."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* Preview */}
        {selectedPlant && quantity && reward && (
          <>
            <div className="mp-form-divider" />
            <div className="mp-form-step-label">👀 Preview</div>
            <div className="mp-preview-box">
              <div className="mp-preview-row"><span>Plant</span><span>{selectedPlant.emoji} {selectedPlant.name}</span></div>
              <div className="mp-preview-row"><span>Plan</span><span>{prefillPlanType}</span></div>
              <div className="mp-preview-row"><span>Quantity</span><span>{quantity} kg</span></div>
              <div className="mp-preview-row"><span>Reward</span><span>RM {reward}</span></div>
              <div className="mp-preview-row"><span>Deadline</span><span>{deadline} days</span></div>
              <div className="mp-preview-row"><span>Difficulty</span><span>{selectedPlant.difficulty}</span></div>
              {location && <div className="mp-preview-row"><span>Location</span><span>{location}</span></div>}
            </div>
          </>
        )}

        <button className="mp-form-submit" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? 'Posting...' : '🌱 Post Plant Order'}
        </button>
      </div>
    </div>
  )
}
