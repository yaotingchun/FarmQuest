'use client';

import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '@/context/AuthContext'
import { Sprout, LogOut } from 'lucide-react'

export const Navbar = () => {
  const { profile, loading } = useAuth();
  
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
        <li><a href="/explore">Explore Plants</a></li>
        <li><a href="/diagnosis">Health Detection</a></li>
        <li><a href="/preferences">Find My Plants</a></li>
        {profile ? (
          <li>
            <a href="/profile" className="nav-profile-link">
              <div className="nav-profile-info">
                <span className="nav-profile-name">{profile.username}</span>
                <span className="nav-profile-status">{profile.archetype || 'GROWER'}</span>
              </div>
              <div className="nav-profile-avatar">{profile.avatar}</div>
            </a>
          </li>
        ) : (
          !loading && <li><a href="/login" className="nav-cta">Log In</a></li>
        )}
      </ul>
    </nav>
  )
}

