'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  AuthError 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { GoogleAuthProvider } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { Sprout, X, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { setAccessToken } = useAuth();

  // Clear state on open/close
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setLoading(false);
      setIsLogin(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getErrorMessage = (err: AuthError) => {
    switch (err.code) {
      case 'auth/user-not-found':
        return 'No account exists with this email. Try signing up!';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try logging in.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      default:
        return err.message;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please try again.');
          setLoading(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/dashboard');
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err as AuthError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setAccessToken(token);
      }
      router.push('/dashboard');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="login-modal-header">
          <div className="login-modal-icon-wrap">
            <Sprout size={32} color="#020d06" />
          </div>
          <h2 className="login-modal-title">
            {isLogin ? 'Welcome Back' : 'Join FarmQuest'}
          </h2>
          <p className="login-modal-subtitle">
            {isLogin ? 'Continue your growth journey' : 'Start your digital farm today'}
          </p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth}>
          <div className="login-form-group">
            <label htmlFor="modal-email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                id="modal-email"
                type="email"
                className="login-input"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-form-group">
            <label htmlFor="modal-password">Password</label>
            <input
              id="modal-password"
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="login-form-group">
              <label htmlFor="modal-confirm-password">Confirm Password</label>
              <input
                id="modal-confirm-password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button className="login-submit-btn" type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="login-divider">or continue with</div>

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
          Google Sign In
        </button>

        <div className="login-toggle">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            className="login-toggle-btn" 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setConfirmPassword('');
              setError(null);
            }}
          >
            {isLogin ? 'Join now' : 'Log in here'}
          </button>
        </div>
      </div>
    </div>
  );
};
