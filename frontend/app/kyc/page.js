'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function KYCPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kycStatus, setKycStatus] = useState(null);

  const [dlNumber, setDlNumber] = useState('');
  const [dob, setDob] = useState('');
  const [dlResult, setDlResult] = useState(null);

  const [panNumber, setPanNumber] = useState('');
  const [panResult, setPanResult] = useState(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [selfieBase64, setSelfieBase64] = useState('');
  const [selfiePreview, setSelfiePreview] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetch(`${API}/api/kyc/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (!d.data) return;
        setKycStatus(d.data);
        if (d.data.status === 'verified') setStep(4);
        else if (d.data.steps?.pan) setStep(3);
        else if (d.data.steps?.dl) setStep(2);
      })
      .catch(() => {});
  }, []);

  const authPost = async (url, body) => {
    const res = await fetch(`${API}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return res;
  };

  const handleVerifyDL = async () => {
    setLoading(true);
    setError('');
    const res = await authPost('/api/kyc/verify-dl', { dlNumber, dob });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.message); return; }
    setDlResult(data.data);
    setStep(2);
  };

  const handleVerifyPAN = async () => {
    setLoading(true);
    setError('');
    const res = await authPost('/api/kyc/verify-pan', { panNumber });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.message); return; }
    setPanResult(data.data);
    setStep(3);
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setError('Camera access denied. Please allow camera permissions and try again.');
    }
  };

  const takeSelfie = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setSelfieBase64(base64);
    setSelfiePreview(base64);
    video.srcObject?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  };

  const handleFaceMatch = async () => {
    if (!selfieBase64) { setError('Please take a selfie first'); return; }
    setLoading(true);
    setError('');
    const res = await authPost('/api/kyc/face-match', { selfieBase64 });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.message); return; }
    setStep(4);
  };

  const handleReset = async () => {
    await fetch(`${API}/api/kyc/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setStep(1);
    setDlResult(null);
    setPanResult(null);
    setSelfieBase64('');
    setSelfiePreview('');
    setError('');
    setKycStatus(null);
  };

  const card = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: 'white',
    fontSize: '15px',
    marginTop: '6px',
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
    marginTop: '16px',
  };

  const StepDot = ({ num, label, active, done }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: done ? '#00ff88' : active ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.08)',
        border: `2px solid ${done || active ? '#00ff88' : 'rgba(255,255,255,0.15)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: done ? '#000' : active ? '#00ff88' : 'rgba(255,255,255,0.3)',
        fontSize: '13px',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {done ? '✓' : num}
      </div>
      <span style={{
        fontSize: '12px',
        color: done || active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
      }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 16px 80px' }}>
      <h1 style={{ color: 'white', marginBottom: '8px' }}>Identity Verification</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '32px', fontSize: '14px' }}>
        Required to rent bikes. Verified against Indian government databases.
      </p>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '32px' }}>
        <StepDot num={1} label="Driving License" active={step === 1} done={step > 1} />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', flex: 0.4 }} />
        <StepDot num={2} label="PAN Card" active={step === 2} done={step > 2} />
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', flex: 0.4 }} />
        <StepDot num={3} label="Face Match" active={step === 3} done={step > 3} />
      </div>

      {error && (
        <div style={{
          background: 'rgba(255,59,48,0.12)',
          border: '1px solid rgba(255,59,48,0.25)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#ff6b6b',
          fontSize: '14px',
        }}>
          {error}
          {kycStatus?.status === 'rejected' && (
            <button
              onClick={handleReset}
              style={{
                display: 'block',
                marginTop: '8px',
                background: 'none',
                border: '1px solid #ff6b6b',
                borderRadius: '6px',
                color: '#ff6b6b',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Start Over
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <div style={card}>
          <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '4px' }}>
            Driving License
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '20px' }}>
            Verified against the Parivahan government database in real time.
          </p>

          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            DL Number
          </label>
          <input
            style={inputStyle}
            placeholder="e.g. MH0120110012345"
            value={dlNumber}
            onChange={e => setDlNumber(e.target.value.toUpperCase())}
          />

          <label style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            display: 'block',
            marginTop: '16px',
          }}>
            Date of Birth (as printed on DL)
          </label>
          <input
            type="date"
            style={inputStyle}
            value={dob}
            onChange={e => setDob(e.target.value)}
          />

          <button
            style={{ ...btnStyle, opacity: loading || !dlNumber || !dob ? 0.6 : 1 }}
            onClick={handleVerifyDL}
            disabled={loading || !dlNumber || !dob}
          >
            {loading ? 'Verifying with Parivahan...' : 'Verify Driving License →'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={card}>
          {dlResult && (
            <div style={{
              background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
            }}>
              <p style={{ color: '#00ff88', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                DL Verified — {dlResult.name}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '4px 0 0' }}>
                Valid until {dlResult.validity} · {dlResult.state}
              </p>
            </div>
          )}

          <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '4px' }}>PAN Card</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '20px' }}>
            Verified against Income Tax records. Name must match your driving license.
          </p>

          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            PAN Number
          </label>
          <input
            style={inputStyle}
            placeholder="e.g. ABCDE1234F"
            maxLength={10}
            value={panNumber}
            onChange={e => setPanNumber(e.target.value.toUpperCase())}
          />

          <button
            style={{ ...btnStyle, opacity: loading || panNumber.length !== 10 ? 0.6 : 1 }}
            onClick={handleVerifyPAN}
            disabled={loading || panNumber.length !== 10}
          >
            {loading ? 'Verifying PAN...' : 'Verify PAN →'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={card}>
          {panResult && (
            <div style={{
              background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
            }}>
              <p style={{ color: '#00ff88', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                Name match confirmed — {panResult.nameMatchScore}% similarity
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '4px 0 0' }}>
                DL: {panResult.dlName} · PAN: {panResult.panName}
              </p>
            </div>
          )}

          <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '4px' }}>Live Selfie</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '20px' }}>
            Take a clear selfie in good lighting. It will be matched against your DL photo.
          </p>

          {!selfiePreview && !cameraOn && (
            <button style={btnStyle} onClick={startCamera}>
              Open Camera
            </button>
          )}

          {cameraOn && (
            <div style={{ textAlign: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', borderRadius: '12px', marginBottom: '12px' }}
              />
              <button style={btnStyle} onClick={takeSelfie}>
                Take Selfie
              </button>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {selfiePreview && (
            <div style={{ textAlign: 'center' }}>
              <img
                src={selfiePreview}
                alt="Your selfie"
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #00ff88',
                }}
              />
              <button
                onClick={() => {
                  setSelfiePreview('');
                  setSelfieBase64('');
                  startCamera();
                }}
                style={{
                  display: 'block',
                  margin: '10px auto 0',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Retake
              </button>
              <button
                style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}
                onClick={handleFaceMatch}
                disabled={loading}
              >
                {loading ? 'Matching face...' : 'Submit for Verification →'}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(0,255,136,0.12)',
            border: '2px solid #00ff88',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '30px',
            color: '#00ff88',
          }}>
            ✓
          </div>
          <h2 style={{ color: '#00ff88', marginBottom: '8px' }}>KYC Verified</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '28px', fontSize: '14px' }}>
            Your identity has been verified. You can now book any bike on RidePulse.
          </p>
          <button
            style={{ ...btnStyle, maxWidth: '200px', margin: '0 auto' }}
            onClick={() => router.push('/search')}
          >
            Browse Bikes →
          </button>
        </div>
      )}
    </div>
  );
}