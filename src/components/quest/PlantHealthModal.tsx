'use client'

import React, { useEffect, useState } from 'react'
import type { PlantHealthReport } from '@/types/diagnosis'
import { Heart, Droplets, Sun, Leaf, TrendingUp, ShieldCheck, DollarSign, Sparkles, AlertTriangle, CheckCircle2, X, Sprout } from 'lucide-react'

interface PlantHealthModalProps {
  isOpen: boolean
  onClose: () => void
  report: PlantHealthReport | null
  plantName: string
  plantEmoji: string
  imagePreview?: string
  onCreateTreatmentQuests?: () => void
  isCreatingQuests?: boolean
}

function HealthScoreRing({ score, size = 120 }: { score: number, size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 300)
    return () => clearTimeout(timer)
  }, [score])

  const getColor = (s: number) => {
    if (s >= 80) return '#22c55e'
    if (s >= 60) return '#eab308'
    if (s >= 40) return '#f97316'
    return '#ef4444'
  }

  const getGlow = (s: number) => {
    if (s >= 80) return 'rgba(34, 197, 94, 0.3)'
    if (s >= 60) return 'rgba(234, 179, 8, 0.3)'
    if (s >= 40) return 'rgba(249, 115, 22, 0.3)'
    return 'rgba(239, 68, 68, 0.3)'
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={getColor(animatedScore)} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.5s',
            filter: `drop-shadow(0 0 8px ${getGlow(animatedScore)})`
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 900, color: getColor(animatedScore), letterSpacing: '-0.03em' }}>
          {animatedScore}
        </span>
        <span style={{ fontSize: size * 0.1, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Health
        </span>
      </div>
    </div>
  )
}

function VitalBar({ label, icon, value, color }: { label: string, icon: React.ReactNode, value: number, color: string }) {
  const [animatedWidth, setAnimatedWidth] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(value), 500)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <div className="health-vital-bar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {icon}
          {label}
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '10px',
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          width: `${animatedWidth}%`,
          transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 0 8px ${color}40`
        }} />
      </div>
    </div>
  )
}

export function PlantHealthModal({
  isOpen, onClose, report, plantName, plantEmoji,
  imagePreview, onCreateTreatmentQuests, isCreatingQuests
}: PlantHealthModalProps) {
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    if (isOpen) setIsRendered(true)
    else {
      const timer = setTimeout(() => setIsRendered(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isRendered && !isOpen) return null
  if (!report) return null

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'severe': return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', label: '⚠️ Severe', glow: 'rgba(239,68,68,0.15)' }
      case 'moderate': return { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)', label: '⚡ Moderate', glow: 'rgba(249,115,22,0.15)' }
      case 'mild': return { color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.25)', label: '💡 Mild', glow: 'rgba(234,179,8,0.15)' }
      default: return { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', label: '✅ Healthy', glow: 'rgba(34,197,94,0.15)' }
    }
  }

  const severityConfig = getSeverityConfig(report.severity)

  const getGrowthRateIcon = (rate: string) => {
    switch (rate) {
      case 'fast': return '🚀'
      case 'slow': return '🐌'
      default: return '🌿'
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
      padding: '1rem',
      opacity: isOpen ? 1 : 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: isOpen ? 'auto' : 'none',
      overflowY: 'auto'
    }}>
      <div className="health-modal-card" style={{
        background: 'var(--glass-bg)', backdropFilter: 'blur(24px)',
        border: '1px solid var(--glass-border)', borderRadius: '28px',
        width: '100%', maxWidth: '520px',
        maxHeight: '90vh', overflowY: 'auto',
        padding: '0',
        boxShadow: `0 25px 60px -12px rgba(0,0,0,0.6), 0 0 40px ${severityConfig.glow}`,
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: 'sticky', top: '16px', float: 'right', marginRight: '16px', zIndex: 10,
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', border: '1px solid var(--glass-border)',
          color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          <X size={18} />
        </button>

        {/* Header with image */}
        <div style={{
          padding: '2rem 2rem 1.5rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          {imagePreview && (
            <div style={{
              width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden',
              border: `2px solid ${severityConfig.color}`,
              marginBottom: '1rem',
              boxShadow: `0 0 20px ${severityConfig.glow}`
            }}>
              <img src={imagePreview} alt={plantName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>{plantEmoji}</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{plantName}</h2>
          </div>

          {/* Health Score Ring */}
          <HealthScoreRing score={report.healthScore} />

          {/* Severity Badge */}
          <div style={{
            marginTop: '1rem', padding: '6px 16px', borderRadius: '999px',
            background: severityConfig.bg, border: `1px solid ${severityConfig.border}`,
            color: severityConfig.color, fontWeight: 700, fontSize: '0.82rem'
          }}>
            {severityConfig.label}
            {report.diseaseDetected && ` — ${report.diseaseName}`}
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem 2rem' }}>
          {/* Growth State Section */}
          <div style={{
            background: 'rgba(74, 222, 128, 0.06)',
            border: '1px solid rgba(74, 222, 128, 0.15)',
            borderRadius: '16px', padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Sprout size={16} color="#4ade80" />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4ade80' }}>
                Growth State
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Stage</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{report.growthState.currentStage}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Est. Age</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{report.growthState.estimatedAge}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Growth Rate</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {getGrowthRateIcon(report.growthState.growthRate)} {report.growthState.growthRate.charAt(0).toUpperCase() + report.growthState.growthRate.slice(1)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vigor</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{report.growthState.overallVigor}%</span>
              </div>
            </div>
          </div>

          {/* Vital Scores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
            <VitalBar label="Vitality" icon={<Heart size={14} />} value={report.vitalityScore} color="#ef4444" />
            <VitalBar label="Sunlight" icon={<Sun size={14} />} value={report.sunlightScore} color="#eab308" />
            <VitalBar label="Hydration" icon={<Droplets size={14} />} value={report.hydrationScore} color="#38bdf8" />
            <VitalBar label="Nutrients" icon={<Leaf size={14} />} value={report.nutrientScore} color="#22c55e" />
          </div>

          {/* Diagnosis */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
            borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}>
              AI Diagnosis
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {report.diagnosis}
            </p>
            {report.detectedIssues.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {report.detectedIssues.map((issue, i) => (
                  <span key={i} style={{
                    padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                    background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)'
                  }}>
                    {issue}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Treatment Section (only if disease detected) */}
          {report.diseaseDetected && report.treatmentSteps.length > 0 && (
            <>
              {/* Treatment Protocol */}
              <div style={{
                background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.15)',
                borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ShieldCheck size={16} color="#f97316" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f97316' }}>
                    Treatment Protocol
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {report.treatmentSteps.length} steps
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {report.treatmentSteps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', paddingBottom: i < report.treatmentSteps.length - 1 ? '12px' : '0' }}>
                      {/* Timeline marker */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: 'rgba(249,115,22,0.15)', border: '2px solid rgba(249,115,22,0.4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 800, color: '#f97316'
                        }}>
                          {step.day}
                        </div>
                        {i < report.treatmentSteps.length - 1 && (
                          <div style={{ width: '2px', flex: 1, background: 'rgba(249,115,22,0.15)', minHeight: '12px' }} />
                        )}
                      </div>
                      {/* Step content */}
                      <div style={{ flex: 1, paddingTop: '2px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          {step.step}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
                            border: '1px solid var(--glass-border)'
                          }}>
                            {step.duration}
                          </span>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(249,115,22,0.08)', color: '#fb923c',
                            border: '1px solid rgba(249,115,22,0.15)'
                          }}>
                            {step.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Products & Cost */}
              {report.suggestedProducts.length > 0 && (
                <div style={{
                  background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)',
                  borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <DollarSign size={16} color="#a78bfa" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa' }}>
                      Supplies & Budget
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {report.suggestedProducts.map((product, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{product.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {product.type} · {product.supplier}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.85rem', fontWeight: 800, color: '#a78bfa',
                          background: 'rgba(139,92,246,0.1)', padding: '4px 10px',
                          borderRadius: '8px', whiteSpace: 'nowrap'
                        }}>
                          {product.estimatedCost}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Total cost summary */}
                  <div style={{
                    marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c4b5fd' }}>Estimated Total</span>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: '#a78bfa' }}>
                      {report.estimatedTreatmentCost.currency} {report.estimatedTreatmentCost.min}–{report.estimatedTreatmentCost.max}
                    </span>
                  </div>
                </div>
              )}

              {/* Expected Benefits */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(34,197,94,0.06))',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <TrendingUp size={16} color="#22c55e" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22c55e' }}>
                    Expected Benefits After Treatment
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22c55e' }}>{report.expectedBenefits.yieldSavedPercent}%</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>Yield Saved</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8' }}>{report.expectedBenefits.recoveryTimeDays}d</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>Recovery</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a78bfa' }}>{report.expectedBenefits.healthImprovement}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '2px' }}>Health After</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                  {report.expectedBenefits.description}
                </p>
              </div>

              {/* Create Treatment Quests Button */}
              <button
                onClick={onCreateTreatmentQuests}
                disabled={isCreatingQuests}
                className="btn-primary"
                style={{
                  width: '100%', padding: '1rem',
                  fontSize: '1rem', fontWeight: 800,
                  borderRadius: '14px', border: 'none', cursor: isCreatingQuests ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                  boxShadow: '0 10px 25px -5px rgba(249,115,22,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  color: '#fff', opacity: isCreatingQuests ? 0.7 : 1,
                  transition: 'all 0.3s'
                }}
              >
                {isCreatingQuests ? (
                  <>⏳ Creating Quests...</>
                ) : (
                  <><Sparkles size={18} /> Create Treatment Quests</>
                )}
              </button>
            </>
          )}

          {/* Healthy Plant Celebration */}
          {!report.diseaseDetected && (
            <div style={{
              textAlign: 'center', padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.08))',
              borderRadius: '16px', border: '1px solid rgba(34,197,94,0.2)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22c55e', marginBottom: '6px' }}>
                Your Plant is Thriving!
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                No diseases detected. Keep up the great care — your {plantName} is looking excellent!
              </p>
              <button
                onClick={onClose}
                className="btn-primary"
                style={{
                  marginTop: '1.25rem', padding: '0.85rem 2rem',
                  fontSize: '0.95rem', fontWeight: 800, borderRadius: '12px',
                  border: 'none', cursor: 'pointer'
                }}
              >
                Awesome! 💪
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
