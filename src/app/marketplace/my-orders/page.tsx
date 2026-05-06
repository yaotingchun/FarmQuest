'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Scale, Clock, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import '../marketplace.css'
 
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Order {
  id: string; plant_name: string; plant_emoji: string; quantity_kg: number;
  reward_rm: number; deadline_days: number; difficulty: string; status: string;
  plant_id: string; plan_type?: 'Budget' | 'Balanced' | 'Premium';
  requester_name: string; requester_avatar: string; farmer_name?: string;
  farmer_avatar?: string; location: string; created_at: string;
}

export default function MyOrdersPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'posted' | 'fulfilling'>('posted')
  const [posted, setPosted] = useState<Order[]>([])
  const [fulfilling, setFulfilling] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      // Show all demo data for non-logged-in users
      fetch(`${API_URL}/api/marketplace/orders`)
        .then(r => r.json())
        .then(data => {
          setPosted(data.slice(0, 3))
          setFulfilling(data.filter((o: Order) => o.status !== 'open').slice(0, 2))
          setLoading(false)
        })
        .catch(() => setLoading(false))
      return
    }
    fetch(`${API_URL}/api/marketplace/my-orders?uid=${user.uid}`)
      .then(r => r.json())
      .then(data => {
        setPosted(data.as_requester || [])
        setFulfilling(data.as_farmer || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  const orders = tab === 'posted' ? posted : fulfilling
  const statusLabel = (s: string) => s.replace('_', ' ')

  const totalEarned = fulfilling
    .filter(o => o.status === 'completed')
    .reduce((acc, o) => acc + o.reward_rm, 0)

  return (
    <div className="mp-my-page">
      <Link href="/marketplace" className="mp-back"><ArrowLeft size={16} /> Back to Marketplace</Link>

      <h1 className="mp-title" style={{ fontSize: '1.8rem', marginBottom: 8 }}>My <span>Orders</span></h1>
      <p className="mp-sub" style={{ marginBottom: 24 }}>Track orders you&apos;ve posted and farming tasks you&apos;ve accepted.</p>

      {/* Stats */}
      <div className="mp-stats">
        <div className="mp-stat">
          <div className="mp-stat-icon" style={{ background: 'rgba(94,196,130,0.15)' }}>📋</div>
          <div><span className="mp-stat-val">{posted.length}</span><span className="mp-stat-label">Orders Posted</span></div>
        </div>
        <div className="mp-stat">
          <div className="mp-stat-icon" style={{ background: 'rgba(96,165,250,0.15)' }}>🚜</div>
          <div><span className="mp-stat-val">{fulfilling.length}</span><span className="mp-stat-label">Fulfilling</span></div>
        </div>
        <div className="mp-stat">
          <div className="mp-stat-icon" style={{ background: 'rgba(251,191,36,0.15)' }}>💰</div>
          <div><span className="mp-stat-val">RM{totalEarned}</span><span className="mp-stat-label">Total Earned</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mp-tabs">
        <button className={`mp-tab ${tab === 'posted' ? 'active' : ''}`} onClick={() => setTab('posted')}>
          Orders I Posted ({posted.length})
        </button>
        <button className={`mp-tab ${tab === 'fulfilling' ? 'active' : ''}`} onClick={() => setTab('fulfilling')}>
          Orders I&apos;m Fulfilling ({fulfilling.length})
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mp-empty"><span className="mp-empty-icon">⏳</span><h3>Loading...</h3></div>
      ) : orders.length === 0 ? (
        <div className="mp-empty">
          <span className="mp-empty-icon">{tab === 'posted' ? '📋' : '🚜'}</span>
          <h3>No orders yet</h3>
          <p>{tab === 'posted' ? 'Post your first plant order!' : 'Browse the marketplace and accept an order.'}</p>
          <Link href={tab === 'posted' ? '/preferences' : '/marketplace'} className="btn-primary" style={{ marginTop: 16, display: 'inline-flex', padding: '10px 24px', fontSize: '0.85rem' }}>
            {tab === 'posted' ? '+ Post Order' : 'Browse Orders'}
          </Link>
        </div>
      ) : (
        <div className="mp-grid">
          {orders.map(order => (
            <Link href={`/marketplace/${order.id}?from=my-orders`} key={order.id} className="mp-card">
              <div className="mp-card-top">
                <div className="mp-card-plant">
                  <span className="mp-card-emoji">{order.plant_emoji}</span>
                  <div className="mp-card-plant-info">
                    <h3>{order.plant_name}</h3>
                    <span>{order.id}</span>
                  </div>
                </div>
                <div className="mp-card-reward">
                  <span className="mp-card-reward-val">RM{order.reward_rm}</span>
                  <span className="mp-card-reward-label">Reward</span>
                </div>
              </div>
              <div className="mp-card-details">
                <span className="mp-card-detail"><Scale size={14} />{order.quantity_kg} kg</span>
                <span className="mp-card-detail"><Clock size={14} />{order.deadline_days} days</span>
              </div>
              <div className="mp-card-bottom">
                <span className="mp-card-requester">
                  {tab === 'fulfilling' ? (
                    <><span className="mp-card-requester-avatar">{order.requester_avatar}</span> For: {order.requester_name}</>
                  ) : order.farmer_name ? (
                    <><span className="mp-card-requester-avatar">{order.farmer_avatar}</span> Farmer: {order.farmer_name}</>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Awaiting farmer</span>
                  )}
                </span>
                <span className={`mp-status-badge mp-status-${order.status}`}>{statusLabel(order.status)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
