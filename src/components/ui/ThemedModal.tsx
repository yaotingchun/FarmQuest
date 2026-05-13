import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export interface ThemedModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'success' | 'info'
  hideButtons?: boolean
  children?: ReactNode
}

export function ThemedModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText,
  type = 'info',
  hideButtons = false,
  children
}: ThemedModalProps) {
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300)
      document.body.style.overflow = 'unset'
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isRendered && !isOpen) return null

  const typeConfig = {
    danger: {
      icon: <AlertCircle style={{ color: '#ef4444' }} size={32} />,
      confirmBtnStyle: { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' },
      glowStyle: { boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)' }
    },
    success: {
      icon: <CheckCircle2 style={{ color: '#10b981' }} size={32} />,
      confirmBtnStyle: { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' },
      glowStyle: { boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)' }
    },
    info: {
      icon: <AlertCircle style={{ color: '#3b82f6' }} size={32} />,
      confirmBtnStyle: { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' },
      glowStyle: { boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)' }
    }
  }

  const config = typeConfig[type]

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: isOpen ? 'auto' : 'none'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          ...config.glowStyle
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ marginBottom: '1rem' }}>
            {config.icon}
          </div>
          
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            color: 'var(--text-primary)', 
            marginBottom: '0.5rem'
          }}>
            {title}
          </h3>
          
          <p style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: '2rem', 
            fontSize: '0.95rem',
            lineHeight: 1.5 
          }}>
            {message}
          </p>

          {children}

          {!hideButtons && (
            <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
              {cancelText && (
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={() => {
                  onConfirm?.()
                  onClose()
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid transparent',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ...config.confirmBtnStyle
                }}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
