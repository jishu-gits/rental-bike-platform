'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.css';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token missing. Please use the link sent to your email.');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    fetch(`${apiUrl}/api/auth/verify-email/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const errText = data.message || 'Unable to verify email.';
          throw new Error(errText);
        }
        setStatus('success');
        setMessage(data.message || 'Email verified successfully! Redirecting to login...');
        setTimeout(() => router.push('/login'), 2500);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed.');
      });
  }, [token, router]);

  const isLoading = status === 'pending';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  const statusColor = isSuccess ? '#29d391' : isError ? '#ff5e6c' : '#7c7c7c';

  return (
    <div className="auth-window">
      <div className="auth-inner">
        <h1>Verify Your Email</h1>
        <p style={{ color: statusColor, minHeight: '2rem' }}>{message}</p>

        {isLoading && <p>One moment...</p>}

        {(isSuccess || isError) && (
          <div style={{ marginTop: '1.25rem' }}>
            <Link href="/login" className="button">
              Go to login
            </Link>
            <Link href="/" className="link-secondary" style={{ marginLeft: '1rem' }}>
              Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
