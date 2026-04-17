'use client'

import React from 'react'

const features = [
  { icon: '🌱', name: 'Plant Tracker', desc: 'Log every seed you plant. Get personalized care schedules, watering reminders, and growth milestones tailored to each variety.' },
  { icon: '⚡', name: 'XP & Leveling', desc: 'Earn experience points for every action — watering, harvesting, posting. Level up from Seedling to Master Cultivator.' },
  { icon: '📸', name: 'Growth Journal', desc: 'Snap photos at each stage. Our AI analyzes plant health, spots issues early, and tracks visual progress over time.' },
  { icon: '🗺️', name: 'Garden Planner', desc: 'Design your space in 2D. Drag-and-drop beds, pots, and shelves to plan companion planting and maximize your yield.' },
  { icon: '🌦️', name: 'Weather Sync', desc: 'Automatic local weather integration. Get alerts before frost, heavy rain, or heat waves that could harm your plants.' },
  { icon: '🏆', name: 'Seasonal Quests', desc: 'Unlock limited-time challenges every season. Compete with friends, earn rare seeds, and discover new crops to grow.' }
]

export const Features = () => {
  return (
    <section id="features">
      <p className="section-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L13.5 8.5L20 7L15.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L8.5 12L4 7L10.5 8.5L12 2Z" fill="currentColor"/></svg>
        Features
      </p>
      <h2 className="section-title">Everything you need<br />to grow smarter</h2>
      <p className="section-desc">From seed to harvest, FarmQuest has the tools to help you succeed — even if you've never grown anything before.</p>

      <div className="features-grid">
        {features.map((f, i) => (
          <div className="feature-card" key={i}>
            <div className="feature-icon">{f.icon}</div>
            <h3 className="feature-name">{f.name}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
