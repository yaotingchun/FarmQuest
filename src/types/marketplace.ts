// ── Marketplace Types ──

export type OrderStatus =
  | 'open'
  | 'accepted'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'disputed'

export interface PlantOrder {
  id: string
  // Requester info
  requester_uid: string
  requester_name: string
  requester_avatar: string
  // Plant info
  plant_id: string
  plant_name: string
  plant_emoji: string
  // Order details
  quantity_kg: number
  reward_rm: number
  deadline_days: number
  location?: string
  latitude?: number
  longitude?: number
  notes?: string
  difficulty: 'easy' | 'medium' | 'hard'
  // Status
  status: OrderStatus
  // Farmer info (after acceptance)
  farmer_uid?: string
  farmer_name?: string
  farmer_avatar?: string
  // Timestamps
  created_at: string    // ISO date
  accepted_at?: string
  completed_at?: string
  // Trust
  checkpoints: OrderCheckpoint[]
  total_votes: number
}

export interface OrderCheckpoint {
  index: number
  label: string
  description: string
  due_day: number          // Day X from acceptance
  completed: boolean
  completed_at?: string
  photo_url?: string       // placeholder for now
  votes: number
}

export interface OrderUpdate {
  id: string
  order_id: string
  farmer_uid: string
  farmer_name: string
  farmer_avatar: string
  checkpoint_index: number
  description: string
  photo_url?: string
  timestamp: string
  votes: number
  voter_uids: string[]
}

// ── Mock Farmer ──
export interface MockFarmer {
  uid: string
  name: string
  avatar: string
  handle: string
  level: number
  xp: number
  completed_orders: number
  rating: number          // 0-5
  latitude: number
  longitude: number
  location_label: string  // e.g., "Petaling Jaya"
  specialties: string[]   // e.g., ["Lettuce", "Tomato"]
  bio: string
}

// ── Filter ──
export interface OrderFilter {
  plant_type?: string
  min_reward?: number
  max_reward?: number
  difficulty?: string
  status?: OrderStatus
  max_deadline_days?: number
  nearby_only?: boolean
  radius_km?: number
}
