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
    const stored = localStorage.getItem('user');
    if (warning && stored) {
      try {
        const user = JSON.parse(stored);
        if (!user.emailVerified) {
          setShow(true);
          setEmail(user.email);
          sessionStorage.removeItem('emailWarning');
        }
      } catch {}
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
    } catch {
      setSent(false);
    } finally {
      setSending(false);
    }
  };

  if (!show) return null;

  return (
    <div style={{
      background: 'rgba(255,193,7,0.1)',
      border: '1px solid rgba(255,193,7,0.2)',
      borderBottom: '1px solid rgba(255,193,7,0.2)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      fontSize: '13px',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.75)' }}>
        Verify your email address to secure your account.
      </span>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
        {sent ? (
          <span style={{ color: '#00ff88', fontSize: '13px' }}>
            Sent! Check your inbox.
          </span>
        ) : (
          <button
            onClick={resend}
            disabled={sending}
            style={{
              background: 'none',
              border: '1px solid rgba(255,193,7,0.35)',
              borderRadius: '6px',
              color: '#ffc107',
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? 'Sending...' : 'Resend email'}
          </button>
        )}
        <button
          onClick={() => setShow(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
