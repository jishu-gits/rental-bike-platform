'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

export function EmailVerificationBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const warning = sessionStorage.getItem('emailWarning');
    const user = localStorage.getItem('user');
    if (warning && user) {
      const parsed = JSON.parse(user);
      if (!parsed.emailVerified) {
        setShow(true);
        setEmail(parsed.email);
        sessionStorage.removeItem('emailWarning');
      }
    }
  }, []);

  const resend = async () => {
    setSending(true);
    try {
      await fetch(`${API}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (!show) return null;

  return (
    <div style={{
      background: 'rgba(255,193,7,0.12)',
      border: '1px solid rgba(255,193,7,0.25)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      fontSize: '13px',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.8)' }}>
        Verify your email to secure your account.
      </span>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
        {sent ? (
          <span style={{ color: '#00ff88', fontSize: '13px' }}>Sent! Check your inbox.</span>
        ) : (
          <button onClick={resend} disabled={sending} style={{
            background: 'none', border: '1px solid rgba(255,193,7,0.4)',
            borderRadius: '6px', color: '#ffc107',
            padding: '4px 12px', cursor: 'pointer', fontSize: '12px',
          }}>
            {sending ? 'Sending...' : 'Resend email'}
          </button>
        )}
        <button onClick={() => setShow(false)} style={{
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px',
        }}>
          ×
        </button>
      </div>
    </div>
  );
}

export { EmailVerificationBanner };