'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, MapPin, Clock, Scale, Compass, Map } from 'lucide-react'
import { getNearbyFarmers, MOCK_FARMERS } from '@/data/mock-farmers'
import type { MockFarmer } from '@/types/marketplace'
import { useAuth } from '@/context/AuthContext'
import MapView from '@/components/MapView'
import type { MapMarker } from '@/components/MapView'
import './marketplace.css'

interface PlantOrder {
  id: string; plant_name: string; plant_emoji: string; quantity_kg: number;
  reward_rm: number; deadline_days: number; difficulty: string; status: string;
  requester_uid: string; requester_name: string; requester_avatar: string;
  plant_id?: string; plan_type?: 'Budget' | 'Balanced' | 'Premium';
  farmer_uid?: string; farmer_name?: string; location: string;
  latitude?: number; longitude?: number;
  created_at: string;
}

export default function MarketplacePage() {
  const { user, profile } = useAuth()
  const [orders, setOrders] = useState<PlantOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [diffFilter, setDiffFilter] = useState('all')
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyFarmers, setNearbyFarmers] = useState<(MockFarmer & { distance_km: number })[]>([])
  const [gpsLoading, setGpsLoading] = useState(false)

  // Fetch orders
  useEffect(() => {
    fetch('http://localhost:3001/api/marketplace/orders')
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // GPS detection
  const detectGPS = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setGpsPos(coords)
        setNearbyFarmers(getNearbyFarmers(coords.lat, coords.lng, 20))
        setGpsLoading(false)
      },
      () => {
        // Fallback to KL center
        const fallback = { lat: 3.1390, lng: 101.6869 }
        setGpsPos(fallback)
        setNearbyFarmers(getNearbyFarmers(fallback.lat, fallback.lng, 20))
        setGpsLoading(false)
      }
    )
  }

  // Auto-detect on mount
  useEffect(() => { detectGPS() }, [])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      // 1. Exclude user's own requested orders from the public browse
      if (user && o.requester_uid === user.uid) return false

      // 2. Filter by Marketplace Visibility:
      // - Show all 'open' orders (available for everyone)
      // - For other statuses (accepted, in_progress, completed), only show if the current user is the farmer
      const isAvailable = o.status === 'open'
      const isMyQuest = user && o.farmer_uid === user.uid
      
      if (!isAvailable && !isMyQuest) return false

      const matchSearch = o.plant_name.toLowerCase().includes(search.toLowerCase()) ||
        o.location.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      const matchDiff = diffFilter === 'all' || o.difficulty === diffFilter
      return matchSearch && matchStatus && matchDiff
    })
  }, [orders, search, statusFilter, diffFilter, user])

  const openCount = orders.filter(o => 
    o.status === 'open' && o.requester_uid !== user?.uid
  ).length
  const activeCount = orders.filter(o => 
    ['accepted', 'in_progress'].includes(o.status) && o.farmer_uid === user?.uid
  ).length
  const completedCount = orders.filter(o => 
    o.status === 'completed' && o.farmer_uid === user?.uid
  ).length

  const statusLabel = (s: string) => s.replace('_', ' ')

  return (
    <div className="marketplace-page">
      <div className="mp-header">
        <div className="mp-header-row">
          <div>
            <div className="mp-badge"><div className="mp-badge-dot" /> PLANT MARKETPLACE</div>
            <h1 className="mp-title">Plant <span>Marketplace</span></h1>
            <p className="mp-sub">Post plant orders or accept farming tasks. Grow, verify, and earn rewards.</p>
          </div>
          <div className="mp-header-actions">
            <Link href="/marketplace/my-orders" className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              My Orders
            </Link>
            <Link href="/recommendations" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              + Post Order
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mp-stats">
        <div className="mp-stat">
          <div className="mp-stat-icon" style={{ background: 'rgba(94,196,130,0.15)' }}>🌱</div>
          <div><span className="mp-stat-val">{openCount}</span><span className="mp-stat-label">Open Orders</span></div>
        </div>
        <div className="mp-stat">
          <div className="mp-stat-icon" style={{ background: 'rgba(96,165,250,0.15)' }}>🚜</div>
          <div><span className="mp-stat-val">{activeCount}</span><span className="mp-stat-label">In Progress</span></div>
        </div>
        <div className="mp-stat">
          <div className="mp-stat-icon" style={{ background: 'rgba(52,211,153,0.15)' }}>✅</div>
          <div><span className="mp-stat-val">{completedCount}</span><span className="mp-stat-label">Completed</span></div>
        </div>
        <div className="mp-stat">
          <div className="mp-stat-icon" style={{ background: 'rgba(251,191,36,0.15)' }}>👨‍🌾</div>
          <div><span className="mp-stat-val">{nearbyFarmers.length}</span><span className="mp-stat-label">Nearby Farmers</span></div>
        </div>
      </div>

      {/* Nearby Farmers */}
      <div className="mp-nearby">
        <div className="mp-nearby-header">
          <Compass size={16} color="var(--accent)" />
          <h3>Nearby Farmers</h3>
          <span>({gpsPos ? `${gpsPos.lat.toFixed(4)}, ${gpsPos.lng.toFixed(4)}` : 'Detecting...'})</span>
          <button className="mp-gps-btn" onClick={detectGPS} style={{ marginLeft: 'auto' }}>
            <MapPin size={12} />{gpsLoading ? 'Detecting...' : 'Refresh GPS'}
          </button>
        </div>
        <div className="mp-nearby-list">
          {nearbyFarmers.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {gpsLoading ? 'Scanning area...' : 'No farmers detected nearby. Try increasing radius.'}
            </span>
          ) : nearbyFarmers.map(f => (
            <div key={f.uid} className="mp-farmer-chip">
              <span className="mp-farmer-avatar">{f.avatar}</span>
              <div className="mp-farmer-info">
                <span className="mp-farmer-name">{f.name}</span>
                <span className="mp-farmer-meta">Lv.{f.level} · ⭐ {f.rating} · {f.completed_orders} orders</span>
                <span className="mp-farmer-dist">📍 {f.distance_km} km · {f.location_label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map View */}
      {gpsPos && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Map size={16} color="var(--accent)" />
            <h3 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 700, fontSize: '1rem' }}>Order Locations</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders & nearby farmers on map</span>
          </div>
          <MapView
            center={gpsPos}
            zoom={12}
            height="340px"
            markers={[
              // Your position
              { lat: gpsPos.lat, lng: gpsPos.lng, label: 'You', emoji: '📍', color: 'blue', popup: 'Your current location' },
              // Order locations
              ...filtered
                .filter(o => o.latitude && o.longitude)
                .map(o => ({
                  lat: o.latitude!,
                  lng: o.longitude!,
                  label: o.plant_name,
                  emoji: o.plant_emoji,
                  color: (o.status === 'open' ? 'green' : o.status === 'completed' ? 'gold' : 'blue') as MapMarker['color'],
                  popup: `RM${o.reward_rm} · ${o.quantity_kg}kg · ${o.location}`,
                })),
              // Nearby farmers
              ...nearbyFarmers.map(f => ({
                lat: f.latitude,
                lng: f.longitude,
                label: f.name,
                emoji: f.avatar,
                color: 'orange' as MapMarker['color'],
                popup: `${f.location_label} · ${f.distance_km}km · ⭐${f.rating}`,
              })),
            ]}
          />
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>🟢 Open orders</span>
            <span>🔵 In progress / You</span>
            <span>🟡 Completed</span>
            <span>🟠 Nearby farmers</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mp-filters">
        <div className="mp-search">
          <Search size={16} className="mp-search-icon" />
          <input placeholder="Search plants or locations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="mp-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select className="mp-filter-select" value={diffFilter} onChange={e => setDiffFilter(e.target.value)}>
          <option value="all">Any Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="mp-empty"><span className="mp-empty-icon">⏳</span><h3>Loading orders...</h3></div>
      ) : filtered.length === 0 ? (
        <div className="mp-empty"><span className="mp-empty-icon">🌿</span><h3>No orders found</h3><p>Try adjusting your filters or post a new order!</p></div>
      ) : (
        <div className="mp-grid">
          {filtered.map(order => (
            <Link href={`/marketplace/${order.id}`} key={order.id} className="mp-card">
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
                <span className={`mp-card-detail mp-diff-${order.difficulty}`}>● {order.difficulty}</span>
              </div>
              <div className="mp-card-bottom">
                <span className="mp-card-requester">
                  <span className="mp-card-requester-avatar">{order.requester_avatar}</span>
                  {order.requester_name}
                </span>
                <span className={`mp-status-badge mp-status-${order.status}`}>{statusLabel(order.status)}</span>
              </div>
              {order.location && (
                <div className="mp-card-location"><MapPin size={12} />{order.location}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
