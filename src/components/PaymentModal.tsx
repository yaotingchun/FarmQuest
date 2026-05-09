'use client'

import React, { useState } from 'react'
import { X, CreditCard, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react'

interface PaymentModalProps {
  amount: number; // Total paid by requester
  fee: number;    // Platform fee (deducted)
  payout: number; // Final payout to farmer
  onConfirm: () => void;
  onClose: () => void;
}

const banks = [
  { id: 'maybank', name: 'Maybank2u', icon: '🟡' },
  { id: 'cimb', name: 'CIMB Clicks', icon: '🔴' },
  { id: 'pbb', name: 'Public Bank', icon: '🔵' },
  { id: 'rhb', name: 'RHB Now', icon: '🔵' },
  { id: 'hlb', name: 'Hong Leong Connect', icon: '🔴' },
  { id: 'pbe', name: 'AmOnline', icon: '🟡' },
]

export default function PaymentModal({ amount, fee, payout, onConfirm, onClose }: PaymentModalProps) {
  const [selectedBank, setSelectedBank] = useState('')
  const [step, setStep] = useState<'selection' | 'processing' | 'success'>('selection')

  const handlePay = () => {
    if (!selectedBank) return
    setStep('processing')
    setTimeout(() => {
      setStep('success')
      setTimeout(() => {
        onConfirm()
      }, 1500)
    }, 2000)
  }

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal-content">
        <button className="payment-modal-close" onClick={onClose}><X size={20} /></button>

        {step === 'selection' && (
          <>
            <div className="payment-modal-header">
              <h2>Secure Checkout</h2>
              <p>Select your preferred payment method</p>
            </div>

            <div className="payment-summary-card">
              <div className="summary-row total">
                <span>Total to Pay</span>
                <span>RM {amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="payment-methods">
              <label className="payment-method-label">Online Banking (FPX)</label>
              <div className="bank-grid">
                {banks.map(bank => (
                  <button
                    key={bank.id}
                    className={`bank-item ${selectedBank === bank.id ? 'active' : ''}`}
                    onClick={() => setSelectedBank(bank.id)}
                  >
                    <span className="bank-icon">{bank.icon}</span>
                    <span className="bank-name">{bank.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="payment-security-badge">
              <ShieldCheck size={16} />
              <span>Payments are held in Escrow and released only after delivery confirmation.</span>
            </div>

            <button
              className="payment-pay-btn"
              disabled={!selectedBank}
              onClick={handlePay}
            >
              Pay RM {amount.toFixed(2)} via FPX
            </button>
          </>
        )}

        {step === 'processing' && (
          <div className="payment-status-view">
            <div className="loading-spinner-large"></div>
            <h3>Processing Payment</h3>
            <p>Connecting to {banks.find(b => b.id === selectedBank)?.name}...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="payment-status-view">
            <div className="success-icon-anim">
              <CheckCircle2 size={64} color="var(--success)" />
            </div>
            <h3>Payment Successful!</h3>
            <p>Your reward has been placed in escrow.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .payment-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .payment-modal-content {
          background: #06150a;
          background: linear-gradient(135deg, #06150a 0%, #0c2615 100%);
          width: 100%;
          max-width: 450px;
          border-radius: 24px;
          padding: 32px;
          position: relative;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(94, 196, 130, 0.05);
          border: 1px solid rgba(94, 196, 130, 0.15);
          color: #ffffff;
        }

        .payment-modal-close {
          position: absolute;
          top: 24px;
          right: 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .payment-modal-close:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          transform: rotate(90deg);
        }

        .payment-modal-header h2 {
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 6px;
          color: #ffffff;
        }

        .payment-modal-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 24px;
        }

        .payment-summary-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }

        .summary-row.total {
          font-weight: 700;
          font-size: 1.2rem;
          color: #ffffff;
          margin-bottom: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .payment-method-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 12px;
          color: #5ec482;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .bank-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .bank-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
        }

        .bank-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        .bank-item.active {
          background: rgba(94, 196, 130, 0.08);
          border-color: #5ec482;
          box-shadow: 0 0 15px rgba(94, 196, 130, 0.1);
        }

        .bank-icon {
          font-size: 1.2rem;
        }

        .bank-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #ffffff;
        }

        .payment-security-badge {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 14px;
          background: rgba(94, 196, 130, 0.05);
          border: 1px solid rgba(94, 196, 130, 0.1);
          border-radius: 12px;
          color: #a7f3d0;
          font-size: 0.8rem;
          line-height: 1.4;
          margin-bottom: 24px;
        }

        .payment-pay-btn {
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          border: none;
          background: #5ec482;
          color: #020d06;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(94, 196, 130, 0.2);
        }

        .payment-pay-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(94, 196, 130, 0.3);
          filter: brightness(1.05);
        }

        .payment-pay-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.3);
          box-shadow: none;
        }

        .payment-status-view {
          padding: 40px 0;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .loading-spinner-large {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid #5ec482;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
