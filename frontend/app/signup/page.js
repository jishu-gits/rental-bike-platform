'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Loader } from 'lucide-react';
import '../auth.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function SignupPage() {
  const router = useRouter();
  const [signUpMethod, setSignUpMethod] = useState('mobile');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
            if (index === 5 && e.target.value.replace(/\D/g, '').length) {
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

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please complete all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      saveSession(data);
    } catch {
      setError('Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    if (!name.trim() || phone.length !== 10) {
      setError('Enter your name and a valid 10-digit mobile number.');
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
      startResendTimer('phone-signup-resend', 60);
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
        body: JSON.stringify({ name, phone, otp }),
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

  const doRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (signUpMethod === 'email_password') {
      await handleEmailSignup(e);
      return;
    }
    if (!otpSent) {
      await sendPhoneOtp();
      return;
    }
    await verifyPhoneOtp();
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
    <div className="auth-container section">
      <div className="auth-card glass">
        <div className="auth-header">
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">Choose the signup method that works best for you.</p>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          background: 'rgba(255,255,255,0.06)',
          padding: '4px',
          borderRadius: '14px',
        }}>
          {['mobile', 'email_password'].map((methodOption) => (
            <button
              key={methodOption}
              type="button"
              onClick={() => {
                setSignUpMethod(methodOption);
                setError('');
                setOtpSent(false);
                clearOtp();
                setSuccessMsg('');
              }}
              style={{
                flex: 1,
                borderRadius: '11px',
                border: 'none',
                padding: '12px',
                cursor: 'pointer',
                background: signUpMethod === methodOption ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: signUpMethod === methodOption ? 'white' : 'rgba(255,255,255,0.55)',
                fontWeight: signUpMethod === methodOption ? 600 : 400,
              }}
            >
              {methodOption === 'mobile' ? 'Mobile OTP' : 'Email & Password'}
            </button>
          ))}
        </div>

        {error && <div style={{ color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.95rem', textAlign: 'left', border: '1px solid rgba(255, 77, 77, 0.2)' }}>{error}</div>}
        {successMsg && <div style={{ color: '#00ff88', background: 'rgba(0, 255, 136, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.95rem', textAlign: 'left', border: '1px solid rgba(0, 255, 136, 0.2)' }}>{successMsg}</div>}

        <form className="auth-form" onSubmit={doRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" />
              <input
                type="text"
                id="name"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {signUpMethod === 'mobile' ? (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Mobile Number</label>
                <div className="input-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', padding: '0 14px' }}>+91</span>
                  <input
                    type="tel"
                    id="phone"
                    className="form-input"
                    placeholder="98765 43210"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>

              {!otpSent ? (
                <button type="submit" className="btn-primary btn-submit" disabled={otpLoading || phone.length !== 10 || !name.trim()}>
                  {otpLoading ? <Loader className="animate-spin" size={18} /> : 'Send OTP'}
                </button>
              ) : (
                <>
                  <div style={{
                    background: 'rgba(0,255,136,0.08)',
                    border: '1px solid rgba(0,255,136,0.2)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: '#00ff88',
                    marginBottom: '16px',
                  }}>
                    OTP sent to +91 {phone}. Enter the code below.
                  </div>
                  {renderOtpBoxes('signup-phone-otp', verifyPhoneOtp)}
                  <button type="button" className="btn-primary btn-submit" onClick={verifyPhoneOtp} disabled={loading || otp.length !== 6} style={{ opacity: loading || otp.length !== 6 ? 0.6 : 1 }}>
                    {loading ? <Loader className="animate-spin" size={18} /> : 'Verify & Continue'}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); clearOtp(); setError(''); setSuccessMsg(''); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Change number
                    </button>
                    <button
                      type="button"
                      onClick={sendPhoneOtp}
                      disabled={countdown > 0}
                      style={{ background: 'none', border: 'none', color: countdown > 0 ? 'rgba(255,255,255,0.3)' : '#00ff88', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: '13px' }}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input
                    type="password"
                    id="confirmPassword"
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary btn-submit" disabled={loading}>
                {loading ? <Loader className="animate-spin" size={18} /> : (
                  <>Sign Up <ArrowRight size={18} /></>
                )}
              </button>
            </>
          )}
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link href="/login" className="auth-link">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
}
