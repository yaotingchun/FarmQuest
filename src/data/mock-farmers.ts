import type { MockFarmer } from '@/types/marketplace'

/**
 * Hardcoded mock farmers distributed across Malaysian states.
 * In production this would come from Firestore user profiles.
 */
export const MOCK_FARMERS: MockFarmer[] = [
  {
    uid: 'farmer_001',
    name: 'Aisyah',
    avatar: '👩‍🌾',
    handle: '@aisyah_grows',
    level: 14,
    xp: 4200,
    completed_orders: 12,
    rating: 4.8,
    latitude: 3.1390,
    longitude: 101.6869,
    location_label: 'Kuala Lumpur',
    specialties: ['Lettuce', 'Kangkung', 'Spinach'],
    bio: 'Urban farmer since 2024. Loves leafy greens! 🥬',
  },
  {
    uid: 'farmer_002',
    name: 'Ahmad',
    avatar: '🧑‍🌾',
    handle: '@ahmad_farm',
    level: 9,
    xp: 2100,
    completed_orders: 7,
    rating: 4.5,
    latitude: 5.4141,
    longitude: 100.3288,
    location_label: 'George Town, Penang',
    specialties: ['Tomato', 'Chili', 'Bell Pepper'],
    bio: 'Balcony gardener with a love for spicy things 🌶️',
  },
  {
    uid: 'farmer_003',
    name: 'Mei Ling',
    avatar: '👩‍🌾',
    handle: '@meiling_garden',
    level: 18,
    xp: 6800,
    completed_orders: 22,
    rating: 4.9,
    latitude: 1.4927,
    longitude: 103.7414,
    location_label: 'Johor Bahru, Johor',
    specialties: ['Herbs', 'Basil', 'Mint', 'Rosemary'],
    bio: 'Herb queen 🌿 Supplying local restaurants for 2 years.',
  },
  {
    uid: 'farmer_004',
    name: 'Raj',
    avatar: '🧑‍🌾',
    handle: '@raj_roots',
    level: 6,
    xp: 1400,
    completed_orders: 3,
    rating: 4.2,
    latitude: 4.5975,
    longitude: 101.0901,
    location_label: 'Ipoh, Perak',
    specialties: ['Carrot', 'Radish', 'Potato'],
    bio: 'Root veggie specialist 🥕 Small plot, big dreams.',
  },
  {
    uid: 'farmer_005',
    name: 'Nurul',
    avatar: '👩‍🌾',
    handle: '@nurul_sprouts',
    level: 11,
    xp: 3200,
    completed_orders: 9,
    rating: 4.7,
    latitude: 5.9749,
    longitude: 116.0724,
    location_label: 'Kota Kinabalu, Sabah',
    specialties: ['Strawberry', 'Tomato', 'Lettuce'],
    bio: 'Growing strawberries in tropical weather! 🍓',
  },
  {
    uid: 'farmer_006',
    name: 'Hafiz',
    avatar: '🧑‍🌾',
    handle: '@hafiz_harvest',
    level: 15,
    xp: 5100,
    completed_orders: 16,
    rating: 4.6,
    latitude: 1.5535,
    longitude: 110.3593,
    location_label: 'Kuching, Sarawak',
    specialties: ['Kangkung', 'Spinach', 'Lettuce', 'Kale'],
    bio: 'Leafy green machine 🥬 Delivering fresh weekly.',
  },
  {
    uid: 'farmer_007',
    name: 'Siti',
    avatar: '👩‍🌾',
    handle: '@siti_organic',
    level: 20,
    xp: 8500,
    completed_orders: 28,
    rating: 5.0,
    latitude: 2.2063,
    longitude: 102.2406,
    location_label: 'Melaka',
    specialties: ['Tomato', 'Basil', 'Chili', 'Eggplant'],
    bio: 'Certified organic grower. Zero pesticides always 🌱',
  },
  {
    uid: 'farmer_008',
    name: 'Wei Jian',
    avatar: '🧑‍🌾',
    handle: '@weijian_farm',
    level: 7,
    xp: 1800,
    completed_orders: 4,
    rating: 4.3,
    latitude: 3.8077,
    longitude: 103.3260,
    location_label: 'Kuantan, Pahang',
    specialties: ['Mint', 'Basil', 'Cilantro'],
    bio: 'Rooftop herb garden enthusiast 🌿',
  },
  {
    uid: 'farmer_009',
    name: 'Farah',
    avatar: '👩‍🌾',
    handle: '@farah_fields',
    level: 12,
    xp: 3600,
    completed_orders: 10,
    rating: 4.6,
    latitude: 6.1248,
    longitude: 102.2544,
    location_label: 'Kota Bharu, Kelantan',
    specialties: ['Chili', 'Cucumber', 'Kangkung'],
    bio: 'East coast grower. Fresh from the kampung 🏡',
  },
  {
    uid: 'farmer_010',
    name: 'Lim',
    avatar: '🧑‍🌾',
    handle: '@lim_hydroponics',
    level: 16,
    xp: 5500,
    completed_orders: 18,
    rating: 4.8,
    latitude: 5.2831,
    longitude: 103.1324,
    location_label: 'Kuala Terengganu',
    specialties: ['Lettuce', 'Tomato', 'Strawberry'],
    bio: 'Hydroponics setup on my rooftop! 💧',
  },
]

/**
 * Haversine formula to calculate distance between two GPS points.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Get mock farmers within a given radius (km) from a GPS position.
 */
export function getNearbyFarmers(
  lat: number,
  lng: number,
  radiusKm: number = 50
): (MockFarmer & { distance_km: number })[] {
  return MOCK_FARMERS
    .map(farmer => ({
      ...farmer,
      distance_km: Math.round(haversineDistance(lat, lng, farmer.latitude, farmer.longitude) * 10) / 10,
    }))
    .filter(f => f.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
}
