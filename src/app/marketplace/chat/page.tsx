'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import InboxChatWindow from '@/components/InboxChatWindow'
import '../marketplace.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Order {
  id: string; plant_name: string; plant_emoji: string; quantity_kg: number;
  reward_rm: number; deadline_days: number; difficulty: string; status: string;
  plant_id: string; plan_type?: 'Budget' | 'Balanced' | 'Premium';
  requester_name: string; requester_avatar: string; farmer_name?: string;
  farmer_avatar?: string; location: string; created_at: string;
}

export default function ChatInboxPage() {
  const { user } = useAuth()
  const [posted, setPosted] = useState<Order[]>([])
  const [fulfilling, setFulfilling] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null)

  const fetchMyOrders = useCallback(() => {
    if (!user) return
    fetch(`${API_URL}/api/marketplace/my-orders?uid=${user.uid}`)
      .then(r => r.json())
      .then(data => {
        setPosted(data.as_requester || [])
        setFulfilling(data.as_farmer || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

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
    fetchMyOrders()
  }, [user, fetchMyOrders])

  const chatsByPerson = useMemo(() => {
    const groups: { [key: string]: { other_name: string, other_avatar: string, other_uid: string, orders: Order[] } } = {};
    
    posted.forEach(o => {
      if (o.status === 'open' || !o.farmer_uid) return;
      const uid = o.farmer_uid;
      if (!groups[uid]) groups[uid] = { other_name: o.farmer_name!, other_avatar: o.farmer_avatar!, other_uid: uid, orders: [] };
      groups[uid].orders.push(o);
    });
    
    fulfilling.forEach(o => {
      if (o.status === 'open') return;
      const uid = o.requester_uid;
      if (!groups[uid]) groups[uid] = { other_name: o.requester_name, other_avatar: o.requester_avatar, other_uid: uid, orders: [] };
      groups[uid].orders.push(o);
    });
    
    return Object.values(groups);
  }, [posted, fulfilling]);

  return (
    <div className="mp-my-page">
      <Link href="/marketplace" className="mp-back"><ArrowLeft size={16} /> Back to Marketplace</Link>

      <h1 className="mp-title" style={{ fontSize: '1.8rem', marginBottom: 8 }}>Chat <span>Inbox</span></h1>
      <p className="mp-sub" style={{ marginBottom: 24 }}>Manage your conversations with farmers and requesters.</p>

      {loading ? (
        <div className="mp-empty"><span className="mp-empty-icon">⏳</span><h3>Loading...</h3></div>
      ) : (
        <div className="mp-inbox">
          <div className="mp-inbox-sidebar">
            {chatsByPerson.length === 0 ? (
              <div className="mp-empty-small">No active chats</div>
            ) : (
              chatsByPerson.map(chat => (
                <div 
                  key={chat.other_uid} 
                  className={`mp-inbox-item ${selectedUserUid === chat.other_uid ? 'active' : ''}`}
                  onClick={() => setSelectedUserUid(chat.other_uid)}
                >
                  <div className="mp-inbox-item-avatar">{chat.other_avatar || '🧑'}</div>
                  <div className="mp-inbox-item-info">
                    <h4>{chat.other_name || 'User'}</h4>
                    <span>{chat.orders.length} order{chat.orders.length > 1 ? 's' : ''}</span>
                    <small style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.orders.map(o => o.plant_name).join(', ')}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mp-inbox-content">
            {selectedUserUid ? (
              <InboxChatWindow 
                orders={chatsByPerson.find(c => c.other_uid === selectedUserUid)?.orders || []} 
                onStatusUpdate={() => fetchMyOrders()}
                otherName={chatsByPerson.find(c => c.other_uid === selectedUserUid)?.other_name}
              />
            ) : (
              <div className="mp-inbox-placeholder">
                <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</span>
                <h3>Your Messages</h3>
                <p>Select a chat from the sidebar to start messaging.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
