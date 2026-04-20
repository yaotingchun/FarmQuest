'use client';

import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '@/context/AuthContext'
import { Sprout, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { LoginModal } from './LoginModal'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export const Navbar = () => {
  const { profile, loading } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('modal') === 'login' && !profile && !loading) {
      setIsLoginModalOpen(true);
    }
  }, [searchParams, profile, loading]);
  
  return (
    <>
    <nav className="navbar">
      <Link href="/" className="nav-logo">
        <div className="nav-logo-icon">
          <Sprout size={24} color="var(--accent)" strokeWidth={1.75} fill="var(--accent)" fillOpacity={0.2} />
        </div>
        <span className="nav-logo-text">Farm<span>Quest</span></span>
      </Link>

      <ul className="nav-links">
        <li><Link href="/#features">Features</Link></li>
        <li><Link href="/#how-it-works">How It Works</Link></li>
        <li><Link href="/#forum">Forum</Link></li>
        <li><Link href="/explore">Explore Plants</Link></li>
        {profile && (
          <>
            <li><Link href="/diagnosis">Health Detection</Link></li>
            <li><Link href="/preferences">Find My Plants</Link></li>
          </>
        )}
        {profile ? (
          <li>
            <Link href="/profile" className="nav-profile-link">
              <div className="nav-profile-info">
                <span className="nav-profile-name">{profile.username}</span>
                <span className="nav-profile-status">{profile.archetype || 'GROWER'}</span>
              </div>
              <div className="nav-profile-avatar">{profile.avatar}</div>
            </Link>
          </li>
        ) : (
          !loading && (
            <li>
              <button 
                onClick={() => setIsLoginModalOpen(true)} 
                className="nav-cta"
                style={{ background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Log In
              </button>
            </li>
          )
        )}
      </ul>
    </nav>
      
    <LoginModal 
      isOpen={isLoginModalOpen} 
      onClose={() => setIsLoginModalOpen(false)} 
    />
  </>
  )
}

