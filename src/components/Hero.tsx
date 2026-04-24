'use client'

import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export const Hero = () => {
  const { profile } = useAuth()
  const router = useRouter()

  const handleStartQuest = (e: React.MouseEvent) => {
    e.preventDefault()
    if (profile) {
      router.push('/dashboard')
    } else {
      router.push('/?modal=login')
    }
  }

  return (
    <section className="hero">
      <h1 className="hero-title">
        Grow Your Own Food<br />
        <span className="hero-title-line2">Right at Home.</span>
      </h1>

      <p className="hero-sub">
        FarmQuest turns every windowsill, balcony, and backyard into a thriving micro-farm.
        Track your plants, level up your skills, and harvest real food — every day.
      </p>

      <div className="hero-actions">
        <button onClick={handleStartQuest} className="btn-primary" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.5 8.5L20 7L15.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L8.5 12L4 7L10.5 8.5L12 2Z" fill="currentColor"/>
          </svg>
          Start Your Quest
        </button>
        <a href="#how-it-works" className="btn-secondary">
          See How It Works
        </a>
      </div>

      {/* Hero dashboard cards or Integrated Hero Image */}
      <div className="hero-visual">
        <div className="hero-card hero-card-main">
          <div className="card-plant-header">
            <span className="plant-emoji">🌱</span>
            <div>
              <p className="card-title">Cherry Tomatoes</p>
              <p className="card-sub">Day 34 of 75 · Fruiting Stage</p>
            </div>
          </div>
          <div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
              <span style={{fontSize:'0.72rem', color:'var(--text-muted)'}}>Growth Progress</span>
              <span style={{fontSize:'0.72rem', color:'var(--accent)', fontWeight:'600'}}>45%</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{width:'45%'}} />
            </div>
          </div>
          <div className="card-stat-row">
            <div className="card-stat">
              <span className="stat-num">💧</span>
              <span className="stat-label">Water Due</span>
            </div>
            <div className="card-stat">
              <span className="stat-num">+40</span>
              <span className="stat-label">XP Today</span>
            </div>
            <div className="card-stat">
              <span className="stat-num">🌡️</span>
              <span className="stat-label">28°C</span>
            </div>
          </div>
        </div>

        <div className="hero-card hero-card-left">
          <p className="mini-card-title">🌿 Community</p>
          <div className="avatar-row">
            <div className="avatar">M</div>
            <div className="avatar">S</div>
            <div className="avatar">A</div>
            <div className="avatar">R</div>
            <div className="avatar avatar-count">+9k</div>
          </div>
          <div style={{marginTop:'14px', padding:'10px', background:'rgba(94, 196, 130, 0.05)', borderRadius:'10px', border:'1px solid rgba(94, 196, 130, 0.1)'}}>
            <p style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'4px'}}>TOP HARVEST TODAY</p>
            <p style={{fontFamily:'Cabinet Grotesk, sans-serif', fontWeight:'700', fontSize:'0.95rem', color:'var(--green-200)'}}>🍅 Sarah grew 340g tomatoes</p>
          </div>
        </div>

        <div className="hero-card hero-card-right">
          <p className="mini-card-title">⚡ Your Level</p>
          <div style={{textAlign:'center', padding:'8px 0'}}>
            <span style={{fontFamily:'Cabinet Grotesk, sans-serif', fontWeight:'900', fontSize:'2.2rem', color:'var(--accent)'}}>14</span>
            <p style={{fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'12px'}}>URBAN FARMER</p>
          </div>
          <div className="xp-bar-label">
            <span>1,240 XP</span>
            <span>2,000 XP</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{width:'62%'}} />
          </div>
        </div>
      </div>
    </section>
  )
}
