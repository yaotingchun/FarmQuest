import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export const CTA = () => {
  const { profile } = useAuth()
  const router = useRouter()

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault()
    if (profile) {
      router.push('/preferences')
    } else {
      router.push('/?modal=login')
    }
  }
  return (
    <section className="cta-section">
      <div className="cta-inner">
        <h2 className="cta-title">Ready to start<br />your first quest?</h2>
        <p className="cta-sub">Join thousands growing real food at home. Free forever for your first 3 plants.</p>
        <div className="cta-actions">
          <button onClick={handleAction} className="btn-primary" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            🌱 {profile ? 'Start Your Next Quest' : 'Create Free Account'}
          </button>
          <a href="#" className="btn-secondary">
            Download the App
          </a>
        </div>
      </div>
    </section>
  )
}
