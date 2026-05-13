'use client'

import { useEffect, useState } from 'react'
import { pickMessage } from '@/lib/completionMessages'

interface CompletionModalProps {
  isOpen: boolean
  onClose: () => void
  taskLabel: string
  xpGained: number
  newXP: number
  newStreak: number
  leveledUp: boolean
  newLevel: number
  plantGrowthPercent?: number
  nextQuestTitle?: string
}

export function CompletionModal({
  isOpen,
  onClose,
  taskLabel,
  xpGained,
  newXP,
  newStreak,
  leveledUp,
  newLevel,
  plantGrowthPercent,
  nextQuestTitle
}: CompletionModalProps) {
  const [showLevelBanner, setShowLevelBanner] = useState(false)
  const [isRendered, setIsRendered] = useState(false)
  const message = pickMessage(taskLabel, newStreak)

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true)
      if (leveledUp) {
        const timer = setTimeout(() => setShowLevelBanner(true), 800)
        return () => clearTimeout(timer)
      }
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300)
      setShowLevelBanner(false)
      return () => clearTimeout(timer)
    }
  }, [isOpen, leveledUp])

  if (!isRendered && !isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      padding: '1rem',
      opacity: isOpen ? 1 : 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: isOpen ? 'auto' : 'none'
    }}>
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .bounce-in {
          animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-card-glass {
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      <div className="modal-card-glass" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '32px',
        width: '100%',
        maxWidth: '420px',
        padding: '3rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Success Icon */}
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: 'rgba(16, 185, 129, 0.1)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: '1.5rem',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <span style={{ fontSize: '2rem' }}>✨</span>
        </div>

        {/* Message */}
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          {message.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6, fontSize: '1.05rem' }}>
          {message.body}
        </p>

        {/* Stats Grid */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
          {/* XP Gained Row */}
          <div style={{
            background: 'rgba(251, 191, 36, 0.08)',
            padding: '1rem',
            borderRadius: '16px',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#fbbf24'
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', opacity: 0.8 }}>XP Gained</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>+{xpGained}</span>
          </div>

          {/* Streak Counter Row */}
          <div style={{
            background: 'rgba(249, 115, 22, 0.08)',
            padding: '1rem',
            borderRadius: '16px',
            border: '1px solid rgba(249, 115, 22, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#f97316'
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', opacity: 0.8 }}>Current Streak</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
               {newStreak} Days 🔥
            </span>
          </div>
        </div>

        {/* Level Up Banner */}
        {showLevelBanner && (
          <div className="bounce-in" style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2))',
            padding: '1.25rem',
            borderRadius: '20px',
            marginBottom: '1.5rem',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#c084fc',
            boxShadow: '0 10px 20px rgba(168, 85, 247, 0.1)'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>New Achievement</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>LEVEL {newLevel}! 🎊</span>
          </div>
        )}

        {/* Plant Growth Progress Bar */}
        {plantGrowthPercent !== undefined && (
          <div style={{ width: '100%', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              <span>Growth Progress</span>
              <span style={{ color: 'var(--accent)' }}>{Math.round(plantGrowthPercent)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                width: `${plantGrowthPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #34d399)',
                borderRadius: '10px',
                transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
              }} />
            </div>
          </div>
        )}

        {/* Next Quest Preview */}
        {nextQuestTitle && (
          <div style={{
            width: '100%',
            background: 'rgba(16, 185, 129, 0.03)',
            border: '1px dashed rgba(16, 185, 129, 0.3)',
            padding: '1.25rem',
            borderRadius: '20px',
            marginBottom: '2.5rem',
            textAlign: 'left'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.7, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
              Up Next
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {nextQuestTitle}
            </span>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={onClose}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '1.25rem',
            fontSize: '1.1rem',
            fontWeight: 800,
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(16, 185, 129, 0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.4)';
          }}
        >
          Keep it up! 💪
        </button>
      </div>
    </div>
  )
}
