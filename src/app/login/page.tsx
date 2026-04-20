'use client';

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Sprout } from 'lucide-react';
import './login.css'; // Let's inline styling or use existing classes

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      router.push('/profile');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon-wrap">
          <Sprout size={48} color="var(--accent)" />
        </div>
        <h1 className="login-title">Welcome to FarmQuest</h1>
        <p className="login-subtitle">Grow Food, Level Up Life</p>

        {error && <div className="login-error">{error}</div>}

        <button 
          className="login-btn-google" 
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="google-icon"
          />
          {loading ? 'Connecting...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
