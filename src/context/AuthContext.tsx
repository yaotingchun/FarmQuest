'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface UserProfile {
  username: string;
  displayName?: string;
  handle?: string;
  email: string | null;
  avatar: string;
  level: number;
  xp: number;
  xpNext: number;
  followers: number;
  following: number;
  friends: number;
  badges: number;
  streak: { current: number; best: number };
  plantsGrown: number;
  harvested: number;
  joined: string;
  createdAt: any; // Firestore timestamp
  bio: string;
  archetype?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

const createDefaultProfile = (user: User): UserProfile => {
  const username = user.displayName?.split(' ')[0] || 'FarmQuester';
  return {
    username: username,
    displayName: user.displayName || 'FarmQuester',
    handle: `@${username.toLowerCase()}_${Math.floor(Math.random() * 100)}`,
    email: user.email,
    avatar: '🧑‍🌾',
    level: 1,
    xp: 0,
    xpNext: 1000,
    followers: 0,
    following: 0,
    friends: 0,
    badges: 0,
    streak: { current: 0, best: 0 },
    plantsGrown: 0,
    harvested: 0,
    joined: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    createdAt: serverTimestamp(),
    bio: '"Ready to grow! 🌱"',
    archetype: 'NOVICE GROWER'
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Document doesn't exist, this is a new user
            const newProfile = createDefaultProfile(firebaseUser);
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching or creating user profile:", error);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
