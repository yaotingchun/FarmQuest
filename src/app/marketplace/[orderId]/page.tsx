'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Scale, Shield, ThumbsUp, CheckCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import MapView from '@/components/MapView'
import '../marketplace.css'
 
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Checkpoint {
  index: number; label: string; description: string; due_day: number;
  completed: boolean; completed_at?: string; votes: number;
}
interface Order {
  id: string; plant_id: string; plant_name: string; plant_emoji: string; quantity_kg: number;
  reward_rm: number; deadline_days: number; difficulty: string; status: string;
  requester_uid: string; requester_name: string; requester_avatar: string;
  plan_type?: 'Budget' | 'Balanced' | 'Premium';
  farmer_uid?: string; farmer_name?: string; farmer_avatar?: string;
  location: string; latitude?: number; longitude?: number;
  notes: string; created_at: string; accepted_at?: string;
  completed_at?: string; checkpoints: Checkpoint[]; total_votes: number;
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

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromMyOrders = searchParams.get('from') === 'my-orders'
  const { user, profile } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<AIPlan | null>(null)

  const fetchOrder = () => {
    fetch(`${API_URL}/api/marketplace/orders/${orderId}`)
      .then(r => r.json())
      .then(data => { 
        setOrder(data); 
        setLoading(false);
        // Fetch plan details
        if (data.plant_id) {
          fetch(`${API_URL}/api/plants/${data.plant_id}/ai-plans`)
            .then(r => r.json())
            .then((plans: AIPlan[]) => {
              const plan = plans.find(p => p.plan_type === (data.plan_type || 'Budget')) || plans[0]
              if (plan) setSelectedPlan(plan)
            })
            .catch(() => {})
        }
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchOrder() }, [orderId])

  const handleAccept = async () => {
    const res = await fetch(`${API_URL}/api/marketplace/orders/${orderId}/accept`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_uid: user?.uid || 'current_user',
        farmer_name: profile?.username || 'You',
        farmer_avatar: profile?.avatar || '🧑‍🌾',
      }),
    })
    if (res.ok) {
      setToast('✅ Order accepted!')
      setTimeout(() => {
        router.push(`/quest?plant=${encodeURIComponent(order?.plant_id || '')}&plan=${encodeURIComponent(order?.plan_type || 'Budget')}&source=accepted_order&order=${encodeURIComponent(orderId)}`)
      }, 900)
    }
  }

  const handleCheckpoint = async (cpIndex: number) => {
    const res = await fetch(`${API_URL}/api/marketplace/orders/${orderId}/updates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_uid: user?.uid || order?.farmer_uid,
        farmer_name: profile?.username || order?.farmer_name,
        farmer_avatar: profile?.avatar || order?.farmer_avatar,
        checkpoint_index: cpIndex,
        description: `Checkpoint ${cpIndex + 1} completed`,
      }),
    })
    if (res.ok) { setToast('📸 Progress updated!'); fetchOrder() }
  }

  const handleComplete = async () => {
    const res = await fetch(`${API_URL}/api/marketplace/orders/${orderId}/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) { setToast('🎉 Order completed! Reward released.'); fetchOrder() }
  }

  const handleVote = async (cpIndex: number) => {
    await fetch(`${API_URL}/api/marketplace/orders/${orderId}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkpoint_index: cpIndex, voter_uid: user?.uid || 'anon' }),
    })
    setToast('👍 Vote recorded!'); fetchOrder()
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order?')) return
    const res = await fetch(`${API_URL}/api/marketplace/orders/${orderId}`, { method: 'DELETE' })
    if (res.ok) {
      setToast('🗑️ Order deleted')
      setTimeout(() => router.push('/marketplace/my-orders'), 800)
    }
  }

  if (loading) return (
    <div className="mp-detail-page">
       <div className="mp-detail-header" style={{ opacity: 0.3 }}>
          <div style={{ height: '40px', width: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '16px' }}></div>
          <div style={{ height: '20px', width: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></div>
       </div>
       <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '10vh' }}>Loading order details...</p>
    </div>
  )
  if (!order) return (
    <div className="mp-detail-page">
       <Link href={fromMyOrders ? "/marketplace/my-orders" : "/marketplace"} className="mp-back"><ArrowLeft size={16} /> Back to {fromMyOrders ? "My Orders" : "Marketplace"}</Link>
       <div className="mp-empty" style={{ paddingTop: '10vh' }}>
          <h3>Order not found</h3>
          <p>The order might have been deleted or moved.</p>
       </div>
    </div>
  )

  const completedCPs = order.checkpoints.filter(c => c.completed).length
  const totalCPs = order.checkpoints.length
  const trustPct = totalCPs > 0 ? Math.round((completedCPs / totalCPs) * 100) : 0
  const statusLabel = (s: string) => s.replace('_', ' ')

  // Determine which checkpoint is next
  const nextCP = order.checkpoints.find(c => !c.completed)

  return (
    <div className="mp-detail-page">
      {toast && <div className="mp-toast">{toast}</div>}
      <Link href={fromMyOrders ? "/marketplace/my-orders" : "/marketplace"} className="mp-back"><ArrowLeft size={16} /> Back to {fromMyOrders ? "My Orders" : "Marketplace"}</Link>

      {/* Header Card */}
      <div className="mp-detail-header">
        <div className="mp-detail-top">
          <div className="mp-detail-plant">
            <span className="mp-detail-emoji">{order.plant_emoji}</span>
            <div>
              <h1>{order.plant_name}</h1>
              <p>{order.id} · <span className={`mp-status-badge mp-status-${order.status}`}>{statusLabel(order.status)}</span></p>
            </div>
          </div>
          <div className="mp-detail-reward">
            <span className="mp-detail-reward-val">RM{order.reward_rm}</span>
            <span className="mp-detail-reward-label">Reward</span>
          </div>
        </div>

        <div className="mp-detail-meta">
          <span className="mp-detail-meta-item"><Scale size={15} /> {order.quantity_kg} kg</span>
          <span className="mp-detail-meta-item"><Clock size={15} /> {order.deadline_days} days</span>
          <span className={`mp-detail-meta-item mp-diff-${order.difficulty}`}>● {order.difficulty}</span>
          {order.location && <span className="mp-detail-meta-item"><MapPin size={15} /> {order.location}</span>}
        </div>

        {order.notes && <div className="mp-detail-notes">&ldquo;{order.notes}&rdquo;</div>}

        <div className="mp-detail-people">
          <div className="mp-detail-person">
            <span className="mp-detail-person-avatar">{order.requester_avatar}</span>
            <div><span className="mp-detail-person-role">Requester</span><br /><span className="mp-detail-person-name">{order.requester_name}</span></div>
          </div>
          {order.farmer_name && (
            <div className="mp-detail-person">
              <span className="mp-detail-person-avatar">{order.farmer_avatar}</span>
              <div><span className="mp-detail-person-role">Farmer</span><br /><span className="mp-detail-person-name">{order.farmer_name}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Setup Details Section - Back at the top with skeleton */}
      <div className="mp-detail-header" style={{ marginTop: -10, minHeight: selectedPlan ? 'auto' : '340px', transition: 'all 0.3s' }}>
        <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          📋 GROWING SPECIFICATIONS — {order.plan_type || 'Budget'}
        </div>
        
        {!selectedPlan ? (
          <>
            <div className="mp-setup-detail-grid">
              <div className="mp-setup-detail-card" style={{ height: '80px', opacity: 0.1, background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}></div>
              <div className="mp-setup-detail-card" style={{ height: '80px', opacity: 0.1, background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}></div>
              <div className="mp-setup-detail-card" style={{ height: '80px', opacity: 0.1, background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}></div>
            </div>
            <div style={{ marginTop: 24, height: '140px', opacity: 0.05, borderRadius: '16px', background: 'rgba(255,255,255,0.1)' }}></div>
          </>
        ) : (
          <>
            <div className="mp-setup-detail-grid">
              <div className="mp-setup-detail-card">
                <div className="mp-setup-detail-title">Pot</div>
                <div className="mp-setup-detail-text">
                  {selectedPlan.pot?.material?.length ? selectedPlan.pot.material.join(', ') : '-'}
                  {selectedPlan.pot?.min_diameter_cm ? ` · ${selectedPlan.pot.min_diameter_cm}cm` : ''}
                  {selectedPlan.pot?.depth_cm ? ` deep` : ''}
                  {selectedPlan.pot?.drainage_required ? ' · drainage required' : ''}
                </div>
              </div>
              <div className="mp-setup-detail-card">
                <div className="mp-setup-detail-title">Soil</div>
                <div className="mp-setup-detail-text">
                  {selectedPlan.soil?.mix?.length
                    ? selectedPlan.soil.mix.map(part => `${part.component} ${part.percentage}%`).join(', ')
                    : '-'}
                  {selectedPlan.soil?.ph_range ? ` · pH ${selectedPlan.soil.ph_range}` : ''}
                  {selectedPlan.soil?.moisture ? ` · ${selectedPlan.soil.moisture}` : ''}
                </div>
              </div>
              <div className="mp-setup-detail-card">
                <div className="mp-setup-detail-title">Seed</div>
                <div className="mp-setup-detail-text">
                  {selectedPlan.seed?.method || '-'}
                  {selectedPlan.seed?.germination_days ? ` · ${selectedPlan.seed.germination_days}` : ''}
                  {selectedPlan.seed?.planting_depth_cm ? ` · ${selectedPlan.seed.planting_depth_cm}cm depth` : ''}
                </div>
              </div>
            </div>

            {selectedPlan.nutrition?.stages?.length ? (
              <>
                <div style={{ marginTop: 20, marginBottom: 12, color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Fertilizer Plan (NPK & Frequency)</div>
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
          </>
        )}
      </div>

      {/* Location Map */}
      {order.latitude && order.longitude && order.latitude !== 0 && (
        <div style={{ marginBottom: 20 }}>
          <MapView
            center={{ lat: order.latitude, lng: order.longitude }}
            zoom={14}
            height="250px"
            markers={[
              {
                lat: order.latitude,
                lng: order.longitude,
                label: order.plant_name,
                emoji: order.plant_emoji,
                color: 'green',
                popup: `${order.location} · RM${order.reward_rm}`,
              },
            ]}
          />
        </div>
      )}

      <div className="mp-actions" style={{ marginBottom: 24 }}>
        {order.status === 'open' && order.requester_uid === user?.uid && (
          <button className="mp-action-btn mp-action-danger" onClick={handleDelete}>🗑️ Delete This Order</button>
        )}
        {order.status === 'open' && order.requester_uid !== user?.uid && (
          <button className="mp-action-btn mp-action-primary" onClick={handleAccept}>🚜 Accept This Order</button>
        )}
        {(order.status === 'accepted' || order.status === 'in_progress' || order.status === 'pending_review') && (
          <Link 
            href={`/quest?plant=${encodeURIComponent(order.plant_id)}&plan=${encodeURIComponent(order.plan_type || 'Budget')}&source=${order.requester_uid === user?.uid ? 'posted_order' : 'accepted_order'}&order=${encodeURIComponent(order.id)}`}
            className="mp-action-btn mp-action-primary"
            style={{ textDecoration: 'none' }}
          >
            🌱 View in Garden Quest
          </Link>
        )}
        {order.status === 'pending_review' && (
          <button className="mp-action-btn mp-action-primary" onClick={handleComplete}>✅ Confirm & Release Payment</button>
        )}
        {order.status === 'completed' && (
          <button className="mp-action-btn mp-action-secondary" disabled>🎉 Order Completed</button>
        )}
      </div>

    </div>
  )
}
