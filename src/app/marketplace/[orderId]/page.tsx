'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Scale, Shield, ThumbsUp, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import MapView from '@/components/MapView'
import '../marketplace.css'

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

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  const { user, profile } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const fetchOrder = () => {
    fetch(`http://localhost:3001/api/marketplace/orders/${orderId}`)
      .then(r => r.json())
      .then(data => { setOrder(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchOrder() }, [orderId])

  const handleAccept = async () => {
    const res = await fetch(`http://localhost:3001/api/marketplace/orders/${orderId}/accept`, {
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
    const res = await fetch(`http://localhost:3001/api/marketplace/orders/${orderId}/updates`, {
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
    const res = await fetch(`http://localhost:3001/api/marketplace/orders/${orderId}/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) { setToast('🎉 Order completed! Reward released.'); fetchOrder() }
  }

  const handleVote = async (cpIndex: number) => {
    await fetch(`http://localhost:3001/api/marketplace/orders/${orderId}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkpoint_index: cpIndex, voter_uid: user?.uid || 'anon' }),
    })
    setToast('👍 Vote recorded!'); fetchOrder()
  }

  if (loading) return <div className="mp-detail-page"><p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '20vh' }}>Loading order...</p></div>
  if (!order) return <div className="mp-detail-page"><p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '20vh' }}>Order not found</p></div>

  const completedCPs = order.checkpoints.filter(c => c.completed).length
  const totalCPs = order.checkpoints.length
  const trustPct = totalCPs > 0 ? Math.round((completedCPs / totalCPs) * 100) : 0
  const statusLabel = (s: string) => s.replace('_', ' ')

  // Determine which checkpoint is next
  const nextCP = order.checkpoints.find(c => !c.completed)

  return (
    <div className="mp-detail-page">
      {toast && <div className="mp-toast">{toast}</div>}
      <Link href="/marketplace" className="mp-back"><ArrowLeft size={16} /> Back to Marketplace</Link>

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

      {/* Action Buttons */}
      <div className="mp-actions">
        {order.status === 'open' && order.requester_uid === user?.uid && (
          <button className="mp-action-btn mp-action-secondary" disabled>Your Order</button>
        )}
        {order.status === 'open' && order.requester_uid !== user?.uid && (
          <button className="mp-action-btn mp-action-primary" onClick={handleAccept}>🚜 Accept This Order</button>
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
