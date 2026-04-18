import { Sprout } from 'lucide-react'

export const Navbar = () => {
  return (
    <nav className="navbar">
      <a href="/" className="nav-logo">
        <div className="nav-logo-icon">
          <Sprout size={24} color="var(--accent)" strokeWidth={1.75} fill="var(--accent)" fillOpacity={0.2} />
        </div>
        <span className="nav-logo-text">Farm<span>Quest</span></span>
      </a>

      <ul className="nav-links">
        <li><a href="/#features">Features</a></li>
        <li><a href="/#how-it-works">How It Works</a></li>
        <li><a href="/#forum">Forum</a></li>
        <li><a href="/recommendations" className="nav-cta">Start Growing →</a></li>
        <li>
          <a href="/profile" className="nav-profile-link">
            <div className="nav-profile-info">
              <span className="nav-profile-name">yaoting_25</span>
              <span className="nav-profile-status">ELITE GROWER</span>
            </div>
            <div className="nav-profile-avatar">🧑‍🌾</div>
          </a>
        </li>
      </ul>
    </nav>
  )
}

