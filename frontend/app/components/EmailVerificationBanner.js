'use client';
import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

export function EmailVerificationBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const timerRef = useRef(null);
  const otpInputsRef = useRef([]);

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const otp = otpDigits.join('');

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

  const sendEmailOtp = async () => {
    if (!email) {
      setError('Email is required to verify.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
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
      setSent(true);
      setSuccess(data.message);
      startResendTimer('email-banner-resend', 60);
      clearOtp();
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setSending(true);
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
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.removeItem('emailWarning');
      setShow(false);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleLater = () => {
    sessionStorage.removeItem('emailWarning');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      background: 'rgba(255,193,7,0.1)',
      border: '1px solid rgba(255,193,7,0.2)',
      borderBottom: '1px solid rgba(255,193,7,0.2)',
      padding: '14px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      fontSize: '13px',
      color: 'rgba(255,255,255,0.9)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{ color: 'rgba(255,255,255,0.85)' }}>
          Verify your email to unlock all features.
        </span>
        {!verifying && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => { setVerifying(true); sendEmailOtp(); }}
              style={{
                background: 'none',
                border: '1px solid rgba(255,193,7,0.35)',
                borderRadius: '6px',
                color: '#ffc107',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Verify Now
            </button>
            <button
              onClick={handleLater}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Later
            </button>
          </div>
        )}
      </div>

      {verifying && (
        <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '14px', padding: '14px' }}>
          <div style={{ marginBottom: '10px', color: 'rgba(255,255,255,0.8)' }}>
            Enter the 6-digit code sent to <strong>{email}</strong>
          </div>
          {success && (
            <div style={{ color: '#00ff88', marginBottom: '10px', fontSize: '13px' }}>{success}</div>
          )}
          {error && (
            <div style={{ color: '#ff9f1c', marginBottom: '10px', fontSize: '13px' }}>{error}</div>
          )}
          {renderOtpBoxes('email-verification-otp', verifyEmailOtp)}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
            <button
              onClick={() => { setVerifying(false); setError(''); setSuccess(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Cancel
            </button>
            <button
              onClick={verifyEmailOtp}
              disabled={otp.length !== 6 || sending}
              style={{
                background: 'none',
                border: '1px solid rgba(255,193,7,0.35)',
                borderRadius: '6px',
                color: '#ffc107',
                padding: '6px 12px',
                cursor: otp.length !== 6 || sending ? 'not-allowed' : 'pointer',
                opacity: otp.length !== 6 || sending ? 0.6 : 1,
                fontSize: '12px',
              }}
            >
              {sending ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>
              {countdown > 0 ? `Resend in ${countdown}s` : ''}
            </span>
            <button
              onClick={sendEmailOtp}
              disabled={countdown > 0 || sending}
              style={{
                background: 'none',
                border: 'none',
                color: countdown > 0 ? 'rgba(255,255,255,0.3)' : '#00ff88',
                cursor: countdown > 0 ? 'default' : 'pointer',
                fontSize: '12px',
              }}
            >
              Resend code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
