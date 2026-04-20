'use client'

import { useState } from 'react'
import {
  Sprout, Flame, Trophy, Star, Leaf, Zap,
  Users, Camera, Shield,
  TrendingUp, Calendar, Award, Flower2, TreeDeciduous,
  Wheat, Cherry, Carrot, Salad, BookOpen, Heart, X, Lock
} from 'lucide-react'

/* ─── Default account data ─── */
const USER = {
  username: 'FarmQuester_01',
  handle: '@farmquester_01',
  email: 'grower@farmquest.app',
  bio: '"Growing green, one pot at a time 🌱"',
  avatar: '🧑‍🌾',
  level: 12,
  xp: 3840,
  xpNext: 5000,
  followers: 47,
  following: 31,
  friends: 14,
  badges: 6,
  streak: { current: 7, best: 21 },
  plantsGrown: 23,
  harvested: 9,
  joined: 'March 2026',
}

/* ─── Harvest History (Mock Data) ─── */
const HARVEST_HISTORY = [
  { plantId: 'basil_01', quantityKg: 0.5, timestamp: '2026-04-10' },
  { plantId: 'tomato_03', quantityKg: 2.1, timestamp: '2026-04-12' },
  { plantId: 'lettuce_02', quantityKg: 1.2, timestamp: '2026-04-14' },
  { plantId: 'carrots_01', quantityKg: 3.4, timestamp: '2026-04-15' },
  { plantId: 'mint_01', quantityKg: 0.3, timestamp: '2026-04-16' },
  { plantId: 'spinach_04', quantityKg: 4.5, timestamp: '2026-04-18' },
]

const MILESTONES = [
  { label: 'Beginner Farmer', icon: '🌱', threshold: 5, color: '#4ade80' },
  { label: 'Urban Grower', icon: '🌿', threshold: 20, color: '#22c55e' },
  { label: 'Farm Expert', icon: '🌳', threshold: 50, color: '#16a34a' },
]

function calculateStats() {
  const totalKg = HARVEST_HISTORY.reduce((acc, curr) => acc + curr.quantityKg, 0)
  const totalHarvests = HARVEST_HISTORY.length
  const mealsProvided = totalKg * 2

  let currentLevel = MILESTONES[0]
  let nextLevel: typeof MILESTONES[0] | null = MILESTONES[1]

  if (totalKg >= MILESTONES[2].threshold) {
    currentLevel = MILESTONES[2]
    nextLevel = null
  } else if (totalKg >= MILESTONES[1].threshold) {
    currentLevel = MILESTONES[1]
    nextLevel = MILESTONES[2]
  } else if (totalKg >= MILESTONES[0].threshold) {
    currentLevel = MILESTONES[0]
    nextLevel = MILESTONES[1]
  } else {
    // Below beginner, but let's default to beginner as starting point
    currentLevel = { label: 'Novice Planter', icon: '👶', threshold: 0, color: '#a7f3d0' }
    nextLevel = MILESTONES[0]
  }

  const progress = nextLevel
    ? (totalKg / nextLevel.threshold) * 100
    : 100

  return { totalKg, totalHarvests, mealsProvided, currentLevel, nextLevel, progress }
}

const TABS = ['Overview', 'Progress Tracker', 'FarmDex', 'History'] as const
type Tab = typeof TABS[number]

const ACHIEVEMENTS = [
  { id: 'first_seed', icon: <Sprout size={26} />, label: 'First Seed', desc: 'Plant your very first crop', unlocked: true, color: '#5ec482' },
  { id: 'on_a_roll', icon: <Flame size={26} />, label: 'On a Roll', desc: 'Maintain a 7-day streak', unlocked: true, color: '#f97316' },
  { id: 'leaf_lover', icon: <Leaf size={26} />, label: 'Leaf Lover', desc: 'Grow 5 leafy vegetables', unlocked: true, color: '#4ade80' },
  { id: 'fruit_ninja', icon: <Cherry size={26} />, label: 'Fruit Ninja', desc: 'Harvest 3 fruit plants', unlocked: true, color: '#fb7185' },
  { id: 'golden_thumb', icon: <Star size={26} />, label: 'Golden Thumb', desc: 'Achieve 90%+ avg plant score', unlocked: true, color: '#facc15' },
  { id: 'herb_whisperer', icon: <Flower2 size={26} />, label: 'Herb Whisperer', desc: 'Grow every herb in FarmDex', unlocked: true, color: '#a78bfa' },
  { id: 'root_master', icon: <Carrot size={26} />, label: 'Root Master', desc: 'Master all root vegetables', unlocked: false, color: '#fb923c' },
  { id: 'canopy_keeper', icon: <TreeDeciduous size={26} />, label: 'Canopy Keeper', desc: 'Keep 10 plants alive at once', unlocked: false, color: '#34d399' },
  { id: 'harvest_moon', icon: <Wheat size={26} />, label: 'Harvest Moon', desc: 'Harvest 20 plants total', unlocked: false, color: '#fbbf24' },
  { id: 'salad_days', icon: <Salad size={26} />, label: 'Salad Days', desc: 'Complete a full salad garden', unlocked: false, color: '#86efac' },
  { id: 'photo_doc', icon: <Camera size={26} />, label: 'Photo Doc', desc: 'Log 50 AI plant health scans', unlocked: false, color: '#60a5fa' },
  { id: 'community_seed', icon: <Heart size={26} />, label: 'Community Seed', desc: 'Get 25 likes on a forum post', unlocked: false, color: '#f472b6' },
  { id: 'quest_legend', icon: <Trophy size={26} />, label: 'Quest Legend', desc: 'Reach Level 25 in FarmQuest', unlocked: false, color: '#facc15' },
]

const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length

/* ─── Inline XP bar (inside hero card) ─── */
function HeroXpBar() {
  const xpPct = Math.round((USER.xp / USER.xpNext) * 100)
  return (
    <div className="hero-xp-bar">
      <div className="hero-xp-bar-top">
        <span className="hero-xp-bar-label">
          <Zap size={12} color="var(--accent)" />
          Level {USER.level} · {USER.xp.toLocaleString()} XP
        </span>
        <span className="hero-xp-bar-right">
          {USER.xpNext.toLocaleString()} XP
          <span className="hero-xp-pct">{xpPct}%</span>
        </span>
      </div>
      <div className="hero-xp-track">
        <div className="hero-xp-fill" style={{ width: `${xpPct}%` }} />
      </div>
      <p className="hero-xp-hint">
        {(USER.xpNext - USER.xp).toLocaleString()} XP to Level {USER.level + 1}
      </p>
    </div>
  )
}

/* ─── Overview tab ─── */
function OverviewTab() {
  return (
    <div className="profile-overview-tab">
      <div className="profile-overview-grid">
        <div className="profile-card streak-card">
          <div className="profile-card-header">
            <Flame size={18} color="#f97316" />
            <h3>Daily Streak</h3>
          </div>
          <div className="streak-numbers">
            <div className="streak-num-block">
              <span className="streak-big current">{USER.streak.current}</span>
              <span className="streak-meta">Current</span>
            </div>
            <div className="streak-divider" />
            <div className="streak-num-block">
              <span className="streak-big best">{USER.streak.best}</span>
              <span className="streak-meta">Best</span>
            </div>
          </div>
          <div className="streak-bar-row">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className={`streak-day ${i < USER.streak.current ? 'active' : ''}`}>
                <div className="streak-day-dot" />
                <span>{d}</span>
              </div>
            ))}
          </div>
          <p className="streak-msg">🌱 Keep watering your habits daily!</p>
        </div>

        <div className="profile-card activity-card">
          <div className="profile-card-header">
            <Zap size={18} color="var(--accent)" />
            <h3>Account Activity</h3>
          </div>
          <div className="activity-rows">
            <div className="activity-row">
              <Calendar size={14} color="var(--text-muted)" />
              <span className="activity-label">Joined</span>
              <span className="activity-val">{USER.joined}</span>
            </div>
            <div className="activity-row">
              <Sprout size={14} color="var(--text-muted)" />
              <span className="activity-label">Plants Grown</span>
              <span className="activity-val accent">{USER.plantsGrown}</span>
            </div>
            <div className="activity-row">
              <Award size={14} color="var(--text-muted)" />
              <span className="activity-label">Harvested</span>
              <span className="activity-val accent">{USER.harvested}</span>
            </div>
            <div className="activity-row">
              <Shield size={14} color="var(--text-muted)" />
              <span className="activity-label">Account Status</span>
              <span className="activity-badge verified">Active</span>
            </div>
          </div>
        </div>
      </div>

      <AchievementsSection />
    </div>
  )
}

/* ─── Achievements ─── */
function AchievementsSection() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? ACHIEVEMENTS : ACHIEVEMENTS.slice(0, 10)
  return (
    <div className="profile-card achievements-card">
      <div className="achievements-header">
        <div className="profile-card-header">
          <Trophy size={18} color="#facc15" />
          <h3>Achievements</h3>
        </div>
        <div className="achievements-meta">
          <span className="ach-count-badge">{unlockedCount} / {ACHIEVEMENTS.length}</span>
          <span className="ach-pct">{Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}% complete</span>
        </div>
      </div>
      <div className="achievements-grid">
        {visible.map(ach => (
          <div
            key={ach.id}
            className={`ach-item ${ach.unlocked ? 'ach-unlocked' : 'ach-locked'}`}
            title={ach.desc}
            style={{ '--ach-color': ach.color } as React.CSSProperties}
          >
            <div className="ach-icon-wrap">{ach.icon}</div>
            <span className="ach-label">{ach.label}</span>
            {ach.unlocked && <div className="ach-glow" />}
          </div>
        ))}
      </div>
      <button className="view-more-btn" onClick={() => setShowAll(v => !v)}>
        {showAll ? 'Show Less ↑' : 'View All Badges ↗'}
      </button>
    </div>
  )
}

/* ─── Metric Card Component ─── */
function MetricCard({ label, value, sub, icon, color }: { label: string, value: string, sub: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="impact-metric-card" style={{ '--metric-color': color } as React.CSSProperties}>
      <div className="metric-icon-wrap">{icon}</div>
      <div className="metric-content">
        <span className="metric-val">{value}</span>
        <span className="metric-label">{label}</span>
        <span className="metric-sub">{sub}</span>
      </div>
    </div>
  )
}

/* ─── Progress Tracker ─── */
function ProgressTab() {
  const stats = calculateStats()

  const categories = [
    { label: 'Leafy Greens', emoji: '🥬', progress: 72, color: '#4ade80' },
    { label: 'Fruit Plants', emoji: '🍓', progress: 45, color: '#fb7185' },
    { label: 'Root Vegetables', emoji: '🥕', progress: 33, color: '#fb923c' },
    { label: 'Herbs & Spices', emoji: '🌿', progress: 88, color: '#a78bfa' },
  ]



  return (
    <div className="progress-tracker-tab">
      {/* Metric Row */}
      <div className="impact-metrics-grid">
        <MetricCard
          label="Total Harvested"
          value={`${stats.totalKg.toFixed(1)} kg`}
          sub="Cumulative production"
          icon={<Sprout size={18} />}
          color="#5ec482"
        />
        <MetricCard
          label="Meals Provided"
          value={`${stats.mealsProvided.toFixed(0)}`}
          sub="Est. food impact"
          icon={<Heart size={18} />}
          color="#fb7185"
        />
        <MetricCard
          label="Total Harvests"
          value={`${stats.totalHarvests}`}
          sub="Successful picks"
          icon={<TrendingUp size={18} />}
          color="#60a5fa"
        />
      </div>

      <div className="impact-dashboard-main">
        {/* Milestone Card */}
        <div className="profile-card impact-card">
          <div className="profile-card-header">
            <Trophy size={18} color="#facc15" />
            <h3>Your Farming Impact</h3>
          </div>

          <div className="milestone-container">
            <div className="milestone-info">
              <div className="milestone-level">
                <span className="milestone-icon">{stats.currentLevel.icon}</span>
                <div>
                  <span className="level-name">{stats.currentLevel.label}</span>
                  <span className="level-status">Current Milestone Achieved</span>
                </div>
              </div>
              {stats.nextLevel && (
                <div className="next-milestone">
                  <span>Next: {stats.nextLevel.label}</span>
                  <strong>{stats.nextLevel.threshold} kg</strong>
                </div>
              )}
            </div>

            <div className="milestone-progress-bar">
              <div className="milestone-progress-fill" style={{ width: `${stats.progress}%` }}>
                <div className="progress-glow" />
              </div>
            </div>

            <div className="milestone-footer">
              <span>{stats.totalKg.toFixed(1)} kg produced</span>
              {stats.nextLevel && (
                <span>{(stats.nextLevel.threshold - stats.totalKg).toFixed(1)} kg to next level</span>
              )}
            </div>
          </div>
        </div>

        {/* FarmDex Distribution Graph */}
        <div className="profile-card progress-full-card">
          <div className="profile-card-header">
            <Leaf size={18} color="var(--accent)" />
            <h3>FarmDex Distribution</h3>
          </div>
          <p className="progress-sub">Visual completion analysis across plant categories</p>

          <div className="progress-list">
            {categories.map(cat => (
              <div key={cat.label} className="prog-row">
                <div className="prog-row-label">
                  <span className="prog-emoji">{cat.emoji}</span>
                  <span>{cat.label}</span>
                </div>
                <div className="prog-bar-wrap">
                  <div className="prog-bar-fill" style={{ width: `${cat.progress}%`, background: cat.color }} />
                </div>
                <span className="prog-pct" style={{ color: cat.color }}>{cat.progress}%</span>
              </div>
            ))}
          </div>

          <div className="progress-insight" style={{ marginTop: '24px' }}>
            <Zap size={16} color="var(--accent)" />
            <p>You are <strong>{categories[3].label}</strong> dominant. Try growing more <strong>{categories[2].label}</strong> to balance your farm!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── History ─── */
function HistoryTab() {
  const events = [
    { icon: '🌱', text: 'Planted Basil in Pot #3', time: '2 hours ago', color: 'var(--accent)' },
    { icon: '📷', text: 'AI health scan on Tomato — Score 91%', time: 'Yesterday', color: '#60a5fa' },
    { icon: '🏆', text: 'Unlocked "Herb Whisperer" badge', time: '2 days ago', color: '#facc15' },
    { icon: '🌿', text: 'Harvested Mint — added to FarmDex', time: '3 days ago', color: '#4ade80' },
    { icon: '🔥', text: 'Hit 7-day streak milestone!', time: '4 days ago', color: '#f97316' },
    { icon: '🥕', text: 'Started growing Carrot seedlings', time: '5 days ago', color: '#fb923c' },
    { icon: '💧', text: 'Watering reminder completed', time: '6 days ago', color: '#38bdf8' },
  ]
  return (
    <div className="profile-card history-card">
      <div className="profile-card-header">
        <BookOpen size={18} color="var(--accent)" />
        <h3>Recent Activity</h3>
      </div>
      <div className="history-list">
        {events.map((ev, i) => (
          <div key={i} className="history-item">
            <div className="history-dot" style={{ background: ev.color }} />
            <div className="history-icon">{ev.icon}</div>
            <div className="history-text">
              <p>{ev.text}</p>
              <span>{ev.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── FARMDEX MOCK DATA ─── */
const FARMDEX_CATEGORIES = [
  { id: 'leafy', title: 'Leafy Greens', emoji: '🥬' },
  { id: 'fruit', title: 'Fruit Plants', emoji: '🍓' },
  { id: 'root', title: 'Root Veggies', emoji: '🥕' },
  { id: 'herb', title: 'Herbs & Spices', emoji: '🌿' },
]

type PlantStatus = 'locked' | 'unlocked' | 'wellgrown'

const FARMDEX_PLANTS = [
  // Leafy
  { id: 'l1', catId: 'leafy', name: 'Lettuce', emoji: '🥬', status: 'wellgrown' as PlantStatus, desc: 'A crisp foundation for any salad. Thrives in cool weather.' },
  { id: 'l2', catId: 'leafy', name: 'Spinach', emoji: '🍃', status: 'unlocked' as PlantStatus, desc: 'Packed with iron and vitamins. Fast growing.' },
  { id: 'l3', catId: 'leafy', name: 'Kale', emoji: '🥬', status: 'locked' as PlantStatus, desc: 'A hardy superfood that can survive a frost.' },
  { id: 'l4', catId: 'leafy', name: 'Arugula', emoji: '🌿', status: 'locked' as PlantStatus, desc: 'Peppery leaves that add a kick to meals.' },
  { id: 'l5', catId: 'leafy', name: 'Cabbage', emoji: '🥬', status: 'locked' as PlantStatus, desc: 'Large, dense heads perfect for slaws.' },

  // Fruit
  { id: 'f1', catId: 'fruit', name: 'Tomato', emoji: '🍅', status: 'wellgrown' as PlantStatus, desc: 'Juicy and versatile. Needs plenty of sun.' },
  { id: 'f2', catId: 'fruit', name: 'Strawberry', emoji: '🍓', status: 'unlocked' as PlantStatus, desc: 'Sweet, low-growing runners perfect for pots.' },
  { id: 'f3', catId: 'fruit', name: 'Bell Pepper', emoji: '🫑', status: 'locked' as PlantStatus, desc: 'Crunchy and colorful when fully ripe.' },
  { id: 'f4', catId: 'fruit', name: 'Eggplant', emoji: '🍆', status: 'locked' as PlantStatus, desc: 'Loves heat and produces glossy purple fruits.' },

  // Root
  { id: 'r1', catId: 'root', name: 'Carrot', emoji: '🥕', status: 'unlocked' as PlantStatus, desc: 'Sweet orange roots that need loose soil to grow straight.' },
  { id: 'r2', catId: 'root', name: 'Radish', emoji: '🫚', status: 'wellgrown' as PlantStatus, desc: 'Spicy and incredibly fast to harvest.' },
  { id: 'r3', catId: 'root', name: 'Potato', emoji: '🥔', status: 'locked' as PlantStatus, desc: 'A staple crop. Heap soil around stems for more tubers.' },
  { id: 'r4', catId: 'root', name: 'Beetroot', emoji: '🫚', status: 'locked' as PlantStatus, desc: 'Earthy and sweet, with edible top greens.' },

  // Herb
  { id: 'h1', catId: 'herb', name: 'Basil', emoji: '🌱', status: 'wellgrown' as PlantStatus, desc: 'Aromatic leaves essential for pesto and pizza.' },
  { id: 'h2', catId: 'herb', name: 'Mint', emoji: '🌿', status: 'wellgrown' as PlantStatus, desc: 'Vigorous grower. Best kept in its own pot.' },
  { id: 'h3', catId: 'herb', name: 'Rosemary', emoji: '🌿', status: 'unlocked' as PlantStatus, desc: 'Woody stems with a pine-like fragrance.' },
  { id: 'h4', catId: 'herb', name: 'Thyme', emoji: '🌿', status: 'locked' as PlantStatus, desc: 'Creeping herb that handles dry conditions well.' },
  { id: 'h5', catId: 'herb', name: 'Cilantro', emoji: '🌿', status: 'locked' as PlantStatus, desc: 'Bright, citrusy flavor. Tends to bolt in heat.' },
]

/* ─── FARMDEX TAB ─── */
function FarmDexTab() {
  const [selectedPlant, setSelectedPlant] = useState<typeof FARMDEX_PLANTS[0] | null>(null);

  return (
    <div className="farmdex-tab">
      {FARMDEX_CATEGORIES.map(cat => {
        const catPlants = FARMDEX_PLANTS.filter(p => p.catId === cat.id);
        const unlockedCount = catPlants.filter(p => p.status !== 'locked').length;
        const totalCount = catPlants.length;
        const progressPct = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

        return (
          <div key={cat.id} className="farmdex-category-card">
            <div className="farmdex-category-header">
              <h3 className="farmdex-category-title">{cat.emoji} {cat.title}</h3>
              <div className="farmdex-progress-wrap">
                <span className="farmdex-progress-text">{unlockedCount} / {totalCount} collected</span>
                <div className="farmdex-progress-bar">
                  <div className="farmdex-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>

            <div className="farmdex-grid">
              {catPlants.map(plant => {
                const isLocked = plant.status === 'locked';
                const isWellGrown = plant.status === 'wellgrown';

                return (
                  <div
                    key={plant.id}
                    className={`farmdex-card ${isLocked ? 'locked' : 'unlocked'}`}
                    onClick={() => { if (!isLocked) setSelectedPlant(plant) }}
                  >
                    {isWellGrown && <div className="farmdex-status-badge" title="Well Grown">⭐</div>}
                    <div className="farmdex-icon">
                      {isLocked ? <Lock size={32} color="rgba(255,255,255,0.4)" strokeWidth={1.5} /> : plant.emoji}
                    </div>
                    <span className="farmdex-name">
                      {isLocked ? '???' : plant.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Modal Overlay */}
      {selectedPlant && (
        <div className="farmdex-modal-overlay" onClick={() => setSelectedPlant(null)}>
          <div className="farmdex-modal" onClick={e => e.stopPropagation()}>
            <button className="farmdex-modal-close" onClick={() => setSelectedPlant(null)}>
              <X size={24} />
            </button>
            <div className="farmdex-modal-icon">{selectedPlant.emoji}</div>
            <h3 className="farmdex-modal-title">{selectedPlant.name}</h3>
            <div className="farmdex-modal-category">
              {FARMDEX_CATEGORIES.find(c => c.id === selectedPlant.catId)?.title}
            </div>
            <p className="farmdex-modal-desc">{selectedPlant.desc}</p>
            <div className="farmdex-modal-status">
              {selectedPlant.status === 'wellgrown' ? (
                <><Star size={18} fill="#facc15" /> Well Grown</>
              ) : (
                <><Leaf size={18} color="#5ec482" /> Collected</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  return (
    <div className="profile-page">

      {/* Page header */}
      <div className="profile-page-header">
        <div>
          <h1 className="profile-page-title">My Profile</h1>
          <p className="profile-page-sub">Your journey, achievements, and community.</p>
        </div>
        <div className="profile-header-actions">
          <button className="profile-action-btn">
            <Users size={14} />
            Find Friends
          </button>
          <button className="profile-action-btn primary">
            <Sprout size={14} />
            Edit Profile
          </button>
        </div>
      </div>

      {/* ── Hero card ── */}
      <div className="profile-hero-card">

        {/* LEFT column: avatar + info column + XP bar below */}
        <div className="profile-hero-main">

          {/* Top row: avatar | text info */}
          <div className="profile-hero-top">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">{USER.avatar}</div>
              <div className="profile-level-chip">Lv.{USER.level}</div>
            </div>

            <div className="profile-info">
              <div className="profile-hero-main-top">
                <h2 className="profile-username">{USER.username}</h2>
                <div className="archetype-tag">ELITE GROWER</div>
              </div>
              <div className="profile-handles">
                <span className="profile-handle">{USER.handle}</span>
                <span className="profile-email">{USER.email}</span>
              </div>
              <p className="profile-bio">{USER.bio}</p>
              <div className="profile-socials">
                <div className="profile-social-item">
                  <span className="social-num">{USER.followers}</span>
                  <span className="social-label">Followers</span>
                </div>
                <div className="profile-social-item">
                  <span className="social-num">{USER.following}</span>
                  <span className="social-label">Following</span>
                </div>
                <div className="profile-social-item">
                  <span className="social-num">{USER.friends}</span>
                  <span className="social-label">Friends</span>
                </div>
                <div className="profile-social-item">
                  <span className="social-num">{USER.badges}</span>
                  <span className="social-label">Badges</span>
                </div>
              </div>
            </div>
          </div>

          {/* XP bar — full width of left column, sits below avatar+info */}
          <HeroXpBar />
        </div>

        {/* RIGHT column: 3 stat pills */}
        <div className="profile-hero-right">
          <div className="profile-stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(94,196,130,0.15)' }}>
              <Sprout size={15} color="#5ec482" />
            </div>
            <div>
              <span className="stat-pill-val">{USER.plantsGrown}</span>
              <span className="stat-pill-label">Plants Grown</span>
            </div>
          </div>

          <div className="profile-stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(251,191,36,0.15)' }}>
              <Wheat size={15} color="#fbbf24" />
            </div>
            <div>
              <span className="stat-pill-val">{USER.harvested}</span>
              <span className="stat-pill-label">Harvested</span>
            </div>
          </div>

          <div className="profile-stat-pill">
            <div className="stat-pill-icon" style={{ background: 'rgba(249,115,22,0.15)' }}>
              <Flame size={15} color="#f97316" />
            </div>
            <div>
              <span className="stat-pill-val">{USER.streak.current}</span>
              <span className="stat-pill-label">Streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'Overview' && <Sprout size={14} />}
            {tab === 'Progress Tracker' && <TrendingUp size={14} />}
            {tab === 'FarmDex' && <Leaf size={14} />}
            {tab === 'History' && <BookOpen size={14} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="profile-tab-content">
        {activeTab === 'Overview' && <OverviewTab />}
        {activeTab === 'Progress Tracker' && <ProgressTab />}
        {activeTab === 'FarmDex' && <FarmDexTab />}
        {activeTab === 'History' && <HistoryTab />}
      </div>
    </div>
  )
}
