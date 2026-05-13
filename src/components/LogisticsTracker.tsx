'use client'

import React from 'react'
import { Package, Sprout, Leaf, Hand, Truck, CheckCircle2, AlertCircle, Check } from 'lucide-react'

type Status = 'open' | 'accepted' | 'planting' | 'growing' | 'harvested' | 'delivering' | 'received' | 'completed' | 'disputed' | 'cancelled'

interface LogisticsTrackerProps {
  status: Status;
  history: { status: string; timestamp: string }[];
  isRequester: boolean;
}

const stages: { status: Status; label: string; icon: any }[] = [
  { status: 'accepted', label: 'Accepted', icon: Package },
  { status: 'planting', label: 'Planting', icon: Sprout },
  { status: 'growing', label: 'Growing', icon: Leaf },
  { status: 'harvested', label: 'Harvested', icon: Hand },
  { status: 'delivering', label: 'On the Way', icon: Truck },
  { status: 'received', label: 'Order Received', icon: CheckCircle2 },
  { status: 'completed', label: 'Payment Released', icon: CheckCircle2 },
]

export default function LogisticsTracker({ status, history, isRequester }: LogisticsTrackerProps) {
  if (status === 'open') return null

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const [currentStatus, setCurrentStatus] = React.useState(status)

  React.useEffect(() => {
    if (status === 'completed') {
      const completedItem = history.find(h => h.status === 'completed')
      const sessionKey = completedItem ? `animated_${completedItem.timestamp}` : 'animated_completed'
      const hasAnimated = sessionStorage.getItem(sessionKey)

      if (!hasAnimated) {
        setCurrentStatus('received')
        const timer = setTimeout(() => {
          setCurrentStatus('completed')
          sessionStorage.setItem(sessionKey, 'true')
        }, 3000)
        return () => clearTimeout(timer)
      } else {
        setCurrentStatus('completed')
      }
    } else {
      setCurrentStatus(status)
    }
  }, [status, history])

  const currentIdx = stages.findIndex(s => s.status === currentStatus)

  return (
    <div className="logistics-tracker">
      <div className="logistics-header">
        <h3>Logistics Tracking</h3>
      </div>

      {status === 'disputed' && (
        <div className="logistics-disputed">
          <AlertCircle size={18} />
          <div>
            <strong>Dispute Raised</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>
              Progress is paused until the dispute is resolved between requester and farmer.
            </p>
          </div>
        </div>
      )}

      {status === 'cancelled' && (
        <div className="logistics-cancelled">
          <AlertCircle size={18} />
          <div>
            <strong>Order Cancelled</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>
              This order has been terminated.
            </p>
          </div>
        </div>
      )}

      <div className="logistics-timeline">
        {stages.map((stage, idx) => {
          const Icon = stage.icon
          const historyItem = history.find(h => h.status === stage.status)
          const isDone = !!historyItem || idx <= currentIdx
          const isCurrent = idx === currentIdx

          let displayTime = ''
          if (historyItem) {
            displayTime = formatTime(historyItem.timestamp)
          } else if (stage.status === 'received' && status === 'completed') {
            const completedItem = history.find(h => h.status === 'completed')
            if (completedItem) {
              displayTime = formatTime(completedItem.timestamp)
            }
          }

          return (
            <React.Fragment key={stage.status}>
              <div className={`logistics-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                <div className="step-icon-wrapper">
                  {isDone ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <div className="step-label">{stage.label}</div>
                {displayTime && <div className="step-time">{displayTime}</div>}
              </div>
              {idx < stages.length - 1 && (
                <div className={`step-connector ${idx < currentIdx ? 'done' : ''}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      <style jsx>{`
        .logistics-tracker {
          background: linear-gradient(135deg, rgba(5, 30, 14, 0.8), rgba(10, 40, 20, 0.6));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 24px 32px;
          margin-bottom: 24px;
          backdrop-filter: blur(20px);
          width: 100%;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        }

        .logistics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .logistics-header h3 {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800;
          font-size: 1.2rem;
          margin: 0;
          color: var(--text-primary);
        }

        .logistics-status-tag {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          background: rgba(94, 196, 130, 0.1);
          color: #5ec482;
          padding: 4px 12px;
          border-radius: 50px;
          border: 1px solid rgba(94, 196, 130, 0.2);
        }

        .logistics-timeline {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          position: relative;
          padding: 10px 0;
        }

        .logistics-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          z-index: 1;
          width: 100px;
        }

        .step-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.3s ease;
          margin-bottom: 4px;
        }

        .step-connector {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          margin-top: 16px; /* Align with center of 36px icon */
          transition: background-color 0.3s ease;
          border-radius: 2px;
          min-width: 20px;
        }

        .step-connector.done {
          background: #5ec482;
          box-shadow: 0 0 10px rgba(94, 196, 130, 0.3);
        }

        .logistics-step.done .step-icon-wrapper {
          background: #5ec482;
          border-color: #5ec482;
          color: #020d06;
          box-shadow: 0 0 15px rgba(94, 196, 130, 0.4);
        }

        .logistics-step.current .step-icon-wrapper {
          background: #020d06;
          border-color: #5ec482;
          color: #5ec482;
          box-shadow: 0 0 20px rgba(94, 196, 130, 0.6);
          animation: pulse 2s infinite;
        }

        .step-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          transition: color 0.3s ease;
          margin-bottom: 4px;
          text-transform: none;
          text-align: center;
          height: 2.4rem; /* Fixed height to align times */
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logistics-step.done .step-label {
          color: var(--text-primary);
        }

        .logistics-step.current .step-label {
          color: #5ec482;
        }

        .step-time {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        .step-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 8px;
          max-width: 140px;
          animation: slideIn 0.3s ease;
          line-height: 1.4;
        }

        .logistics-cancelled, .logistics-disputed {
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.2);
          color: #f87171;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(94, 196, 130, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(94, 196, 130, 0); }
          100% { box-shadow: 0 0 0 0 rgba(94, 196, 130, 0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
