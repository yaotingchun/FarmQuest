'use client'

interface RecoveryBannerProps {
  plantName: string
  health: number
  onDismiss?: () => void
}

export function RecoveryBanner({ plantName, health, onDismiss }: RecoveryBannerProps) {
  return (
    <div className="quest-recovery-banner">
      <div className="quest-recovery-icon">⚠️</div>
      <div className="quest-recovery-content">
        <h3 className="quest-recovery-title">
          Your {plantName} needs help!
        </h3>
        <p className="quest-recovery-desc">
          Health is at {health}%. Complete today&apos;s recovery tasks to bring your plant back.
        </p>
      </div>
      {onDismiss && (
        <button className="quest-recovery-dismiss" onClick={onDismiss}>✕</button>
      )}
    </div>
  )
}
