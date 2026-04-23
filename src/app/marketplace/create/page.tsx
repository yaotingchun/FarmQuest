'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sprout, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import '../marketplace.css'

interface PlantOption {
  plant_id: string; name: string; emoji: string;
  difficulty: string; growth_days: number; type: string;
}

export default function CreateOrderPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [plants, setPlants] = useState<PlantOption[]>([])
  const [selectedPlant, setSelectedPlant] = useState<PlantOption | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reward, setReward] = useState('')
  const [deadline, setDeadline] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('http://localhost:3001/api/marketplace/plant-options')
      .then(r => r.json())
      .then(setPlants)
      .catch(() => {})
  }, [])

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
        }),
      })
      if (res.ok) {
        setToast('🌱 Order posted successfully!')
        setTimeout(() => router.push('/marketplace'), 1500)
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
        {/* Step 1: Select Plant */}
        <div className="mp-form-step-label">🌱 Step 1 — Select Plant</div>
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
