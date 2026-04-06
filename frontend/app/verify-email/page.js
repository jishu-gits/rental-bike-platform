'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email?token=${token}`)
      .then(res => {
        if (res.redirected || res.ok) {
          setStatus('success');
          // Update localStorage if user is already logged in
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.emailVerified = true;
            localStorage.setItem('user', JSON.stringify(u));
          }
          setTimeout(() => router.push('/login?message=email_verified'), 2000);
        } else {
          return res.json().then(d => {
            setStatus('error');
            setMessage(d.message || 'Verification failed.');
          });
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '40px 32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ color: 'white' }}>Verifying your email...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(0,255,136,0.15)',
              border: '2px solid #00ff88',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '28px',
            }}>✓</div>
            <h2 style={{ color: '#00ff88', marginBottom: '8px' }}>Email Verified!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
              Redirecting you to login...
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✗</div>
            <h2 style={{ color: '#ff6b6b', marginBottom: '8px' }}>Verification Failed</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>
              {message}
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                background: 'linear-gradient(135deg, #00ff88, #00cc66)',
                color: '#000', border: 'none', borderRadius: '10px',
                padding: '12px 24px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
