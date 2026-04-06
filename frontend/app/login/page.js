'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [method, setMethod] = useState('mobile_otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const timerRef = useRef(null);
  const otpInputsRef = useRef([]);

  useEffect(() => {
    const msg = params.get('message');
    if (msg === 'email_verified') setSuccessMsg('Email verified! You can now log in.');
    if (msg === 'already_verified') setSuccessMsg('Email already verified. Please log in.');
  }, [params]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const otp = otpDigits.join('');

  const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.emailWarning) {
      sessionStorage.setItem('emailWarning', data.emailWarning);
    }
    router.push('/');
  };

  const startResendTimer = (btnId, seconds) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearOtp = () => {
    setOtpDigits(['', '', '', '', '', '']);
    if (otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    if (index === 5 && digit) {
      setTimeout(() => {
        if (otpDigits.filter(Boolean).length === 5 || otp.length === 6) {
          if (method === 'mobile_otp') verifyPhoneOtp();
          if (method === 'email_otp') verifyEmailOtp();
        }
      }, 0);
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  };

  const renderOtpBoxes = (containerId, onComplete) => (
    <div id={containerId} style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
      {otpDigits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (otpInputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => {
            handleOtpChange(index, e.target.value);
            if (index === 5 && otpDigits.filter(Boolean).length === 5 && !digit) {
              onComplete();
            }
          }}
          onKeyDown={(e) => handleOtpKeyDown(index, e)}
          style={{
            width: '48px',
            height: '56px',
            borderRadius: '14px',
            border: 'none',
            background: 'rgba(255,255,255,0.08)',
            color: 'white',
            fontSize: '24px',
            textAlign: 'center',
            fontWeight: 700,
            outline: 'none',
            borderBottom: '3px solid rgba(0,255,136,0.3)',
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      saveSession(data);
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setOtpLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      setOtpSent(true);
      clearOtp();
      startResendTimer('phone-resend', 60);
      setSuccessMsg(data.message);
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      saveSession(data);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailOtp = async () => {
    if (!email) {
      setError('Enter your email address');
      return;
    }
    setOtpLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      setOtpSent(true);
      clearOtp();
      startResendTimer('email-resend', 60);
      setSuccessMsg(data.message);
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-email-otp-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      saveSession(data);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const doLogin = async (event) => {
    event?.preventDefault();
    setError('');
    if (method === 'email_password') {
      await handleEmailLogin(event);
      return;
    }

    if (method === 'mobile_otp') {
      if (!otpSent) {
        await sendPhoneOtp();
      } else {
        await verifyPhoneOtp();
      }
      return;
    }

    if (method === 'email_otp') {
      if (!otpSent) {
        await sendEmailOtp();
      } else {
        await verifyEmailOtp();
      }
    }
  };

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

        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {['mobile_otp', 'email_password', 'email_otp'].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMethod(m);
                setError('');
                setOtpSent(false);
                clearOtp();
                setSuccessMsg('');
              }}
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
              {m === 'email_password' ? 'Email + Password' : m === 'mobile_otp' ? 'Mobile OTP' : 'Email OTP'}
            </button>
          ))}
        </div>

        {method === 'email_password' && (
          <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                style={inputStyle}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Logging in...' : 'Log In →'}
            </button>
          </form>
        )}

        {(method === 'mobile_otp' || method === 'email_otp') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                {method === 'mobile_otp' ? 'Mobile Number' : 'Email Address'}
              </label>
              {method === 'mobile_otp' ? (
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
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              ) : (
                <input
                  type="email"
                  style={inputStyle}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </div>

            {!otpSent ? (
              <button
                style={{ ...btnStyle, opacity: otpLoading || (method === 'mobile_otp' ? phone.length !== 10 : !email) ? 0.6 : 1 }}
                onClick={doLogin}
                disabled={otpLoading || (method === 'mobile_otp' ? phone.length !== 10 : !email)}
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
                  OTP sent {method === 'mobile_otp' ? `to +91 ${phone}` : `to ${email}`}
                </div>
                {renderOtpBoxes('login-otp-boxes', method === 'mobile_otp' ? verifyPhoneOtp : verifyEmailOtp)}
                <button
                  style={{ ...btnStyle, opacity: loading || otp.length !== 6 ? 0.6 : 1 }}
                  onClick={method === 'mobile_otp' ? verifyPhoneOtp : verifyEmailOtp}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Log In →'}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setOtpSent(false);
                      clearOtp();
                      setError('');
                      setSuccessMsg('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Change {method === 'mobile_otp' ? 'number' : 'email'}
                  </button>
                  <button
                    onClick={() => {
                      if (method === 'mobile_otp') sendPhoneOtp(); else sendEmailOtp();
                    }}
                    disabled={countdown > 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: countdown > 0 ? 'rgba(255,255,255,0.3)' : '#00ff88',
                      cursor: countdown > 0 ? 'default' : 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>
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
