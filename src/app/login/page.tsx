'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page with modal flag
    router.replace('/?modal=login');
  }, [router]);

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: 'var(--text-secondary)'
    }}>
      <p>Redirecting to secure login gateway...</p>
    </div>
  );
}
