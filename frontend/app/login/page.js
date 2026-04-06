'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Show message if redirected after email verification
  useEffect(() => {
    const msg = params.get('message');
    if (msg === 'email_verified') setSuccessMsg('Email verified! You can now log in.');
    if (msg === 'already_verified') setSuccessMsg('Email already verified. Please log in.');
  }, []);

  const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/');
  };

  // Email + Password login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }

      // Save warning to show after redirect
      if (data.emailWarning) {
        sessionStorage.setItem('emailWarning', data.emailWarning);
      }
      saveSession(data);
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Request OTP
  const handleRequestOtp = async () => {
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setOtpLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setOtpSent(true);
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // OTP Login
  const handleOtpLogin = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      saveSession(data);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '13px 16px',
    color: 'white',
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const btnStyle = {
    width: '100%',
    background: 'linear-gradient(135deg, #00ff88, #00cc66)',
    color: '#000',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  };

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
        borderRadius: '20px',
        padding: '36px 32px',
        maxWidth: '440px',
        width: '100%',
      }}>
        <h1 style={{ color: 'white', marginBottom: '6px', fontSize: '26px' }}>Welcome Back</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '28px', fontSize: '14px' }}>
          Log in to your RidePulse account.
        </p>

        {/* Success message */}
        {successMsg && (
          <div style={{
            background: 'rgba(0,255,136,0.1)',
            border: '1px solid rgba(0,255,136,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#00ff88',
            fontSize: '14px',
          }}>
            {successMsg}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: 'rgba(255,59,48,0.12)',
            border: '1px solid rgba(255,59,48,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#ff6b6b',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Method toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {['email', 'phone'].map((m) => (
            <button
              key={m}
              onClick={() => { setMethod(m); setError(''); setOtpSent(false); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '9px',
                border: 'none',
                background: method === m ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: method === m ? 'white' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: method === m ? 500 : 400,
                transition: 'all 0.2s',
              }}
            >
              {m === 'email' ? 'Email & Password' : 'Mobile OTP'}
            </button>
          ))}
        </div>

        {/* EMAIL LOGIN */}
        {method === 'email' && (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                style={inputStyle}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                style={inputStyle}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <div style={{ textAlign: 'right', marginTop: '6px' }}>
                <Link href="/forgot-password" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  Forgot password?
                </Link>
              </div>
            </div>
            <button type="submit" style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Logging in...' : 'Log In →'}
            </button>
          </form>
        )}

        {/* PHONE OTP LOGIN */}
        {method === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Mobile Number
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  padding: '13px 14px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '15px',
                  flexShrink: 0,
                }}>
                  +91
                </div>
                <input
                  type="tel"
                  style={{ ...inputStyle }}
                  placeholder="98765 43210"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                style={{ ...btnStyle, opacity: otpLoading || phone.length !== 10 ? 0.6 : 1 }}
                onClick={handleRequestOtp}
                disabled={otpLoading || phone.length !== 10}
              >
                {otpLoading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            ) : (
              <>
                <div style={{
                  background: 'rgba(0,255,136,0.08)',
                  border: '1px solid rgba(0,255,136,0.2)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#00ff88',
                  fontSize: '13px',
                }}>
                  OTP sent to +91 {phone}
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                    Enter 6-digit OTP
                  </label>
                  <input
                    type="text"
                    style={{ ...inputStyle, letterSpacing: '6px', fontSize: '20px', textAlign: 'center' }}
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button
                  style={{ ...btnStyle, opacity: loading || otp.length !== 6 ? 0.6 : 1 }}
                  onClick={handleOtpLogin}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Log In →'}
                </button>
                <button
                  onClick={() => { setOtpSent(false); setOtp(''); setError(''); handleRequestOtp(); }}
                  style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', fontSize: '13px', textAlign: 'center',
                  }}
                >
                  Resend OTP
                </button>
              </>
            )}
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#00ff88', textDecoration: 'none', fontWeight: 500 }}>
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}
