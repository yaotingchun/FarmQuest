import React from 'react'

const steps = [
  { num: '🌍', label: 'Step 01', title: 'Set Up Your Space', desc: 'Tell us about your growing environment — balcony, kitchen, backyard. We\'ll tailor recommendations just for you.' },
  { num: '🌿', label: 'Step 02', title: 'Pick Your Plants', desc: 'Browse 200+ crops sorted by difficulty, space, and season. Start easy with herbs, or go bold with tomatoes.' },
  { num: '📅', label: 'Step 03', title: 'Follow the Plan', desc: 'Daily tasks, smart reminders, and care guides keep your plants thriving without the guesswork.' },
  { num: '🎉', label: 'Step 04', title: 'Harvest & Share', desc: 'Log your yield, earn XP, and share your harvest with the community. Every meal tastes better home-grown.' }
]

export const HowItWorks = () => {
  return (
    <section id="how-it-works">
      <p className="section-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        How It Works
      </p>
      <h2 className="section-title">From zero to harvest<br />in four steps</h2>
      <p className="section-desc">Getting started takes less than 5 minutes. Your first harvest? That's up to you and your plants.</p>

      <div className="steps-container">
        {steps.map((s, i) => (
          <div className="step-item" key={i}>
            <div className="step-num">{s.num}</div>
            <div>
              <p className="step-label">{s.label}</p>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
