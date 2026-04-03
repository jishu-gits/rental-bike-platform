'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Loader } from 'lucide-react';
import '../auth.css';

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error('API URL is not configured.');
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error('API URL is not configured.');
      const response = await fetch(`${baseUrl}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to send OTP. Try again.');
    }
    setOtpLoading(false);
  };

  const handleOtpLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) throw new Error('API URL is not configured.');
      const response = await fetch(`${baseUrl}/api/auth/login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/';
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Login failed. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container section">
      <div className="auth-card glass">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Log in to your RidePulse account.</p>
        </div>

        {error && <div style={{ color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'left', border: '1px solid rgba(255, 77, 77, 0.2)' }}>{error}</div>}

        {/* Login method toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          <button
            onClick={() => setLoginMethod('email')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: loginMethod === 'email' ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Email & Password
          </button>
          <button
            onClick={() => setLoginMethod('phone')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: loginMethod === 'phone' ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Mobile OTP
          </button>
        </div>

        {/* Email/Password form */}
        {loginMethod === 'email' && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <Link href="#" className="forgot-password">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn-primary btn-submit" disabled={loading}>
              {loading ? <Loader className="animate-spin" size={18} /> : (
                <>Log In <LogIn size={18} /></>
              )}
            </button>
          </form>
        )}

        {/* Phone OTP form */}
        {loginMethod === 'phone' && (
          <div>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                onClick={handleRequestOtp}
                disabled={otpLoading || phone.length < 10}
                className="btn-primary btn-submit"
              >
                {otpLoading ? <Loader className="animate-spin" size={18} /> : 'Send OTP'}
              </button>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Enter OTP</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder="6-digit OTP"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                <button
                  onClick={handleOtpLogin}
                  disabled={loading || otp.length !== 6}
                  className="btn-primary btn-submit"
                >
                  {loading ? <Loader className="animate-spin" size={18} /> : 'Log In with OTP'}
                </button>
                <p
                  onClick={handleRequestOtp}
                  style={{
                    textAlign: 'center',
                    marginTop: '12px',
                    fontSize: '13px',
                    opacity: 0.6,
                    cursor: 'pointer',
                  }}
                >
                  Resend OTP
                </p>
              </>
            )}
          </div>
        )}

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link href="/signup" className="auth-link">
            Sign up here
          </Link>
        </div>
      </div>
    </div>
  );
}
