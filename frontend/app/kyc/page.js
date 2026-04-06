'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function KYCPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [step, setStep] = useState(1); // 1=DL, 2=PAN, 3=Selfie, 4=Done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kycStatus, setKycStatus] = useState(null);

  // Step 1 — DL
  const [dlNumber, setDlNumber] = useState('');
  const [dob, setDob] = useState('');
  const [dlResult, setDlResult] = useState(null);

  // Step 2 — PAN
  const [panNumber, setPanNumber] = useState('');
  const [panResult, setPanResult] = useState(null);

  // Step 3 — Face
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
        setKycStatus(d.data);
        if (d.data.status === 'verified') setStep(4);
        else if (d.data.steps.pan) setStep(3);
        else if (d.data.steps.dl) setStep(2);
      });
  }, []);

  const authFetch = (url, body) => fetch(`${API}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const handleVerifyDL = async () => {
    setLoading(true); setError('');
    const res = await authFetch('/api/kyc/verify-dl', { dlNumber, dob });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.message); return; }
    setDlResult(data.data);
    setStep(2);
  };

  const handleVerifyPAN = async () => {
    setLoading(true); setError('');
    const res = await authFetch('/api/kyc/verify-pan', { panNumber });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.message); return; }
    setPanResult(data.data);
    setStep(3);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setError('Camera access denied. Please allow camera permissions.');
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
    setLoading(true); setError('');
    const res = await authFetch('/api/kyc/face-match', { selfieBase64 });
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
    setStep(1); setDlResult(null); setPanResult(null);
    setSelfieBase64(''); setSelfiePreview(''); setError('');
    setKycStatus(null);
  };

  // Styles matching your glassmorphic design
  const card = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '16px',
  };

  const input = {
    width: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: 'white',
    fontSize: '15px',
    marginTop: '8px',
    boxSizing: 'border-box',
  };

  const btn = {
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

  const stepIndicator = (num, label, active, done) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: done ? '#00ff88' : active ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.1)',
        border: `2px solid ${done || active ? '#00ff88' : 'rgba(255,255,255,0.2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: done ? '#000' : active ? '#00ff88' : 'rgba(255,255,255,0.4)',
        fontSize: '13px', fontWeight: 600, flexShrink: 0,
      }}>
        {done ? '✓' : num}
      </div>
      <span style={{
        fontSize: '12px',
        color: done || active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
      }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ color: 'white', marginBottom: '8px' }}>Identity Verification</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '32px', fontSize: '14px' }}>
        Required to rent bikes. Your data is verified against government databases.
      </p>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        {stepIndicator(1, 'Driving License', step === 1, step > 1)}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center', flex: 0.3 }} />
        {stepIndicator(2, 'PAN Card', step === 2, step > 2)}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)', alignSelf: 'center', flex: 0.3 }} />
        {stepIndicator(3, 'Face Match', step === 3, step > 3)}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
          color: '#ff6b6b', fontSize: '14px',
        }}>
          {error}
          {kycStatus?.status === 'rejected' && (
            <button onClick={handleReset} style={{
              display: 'block', marginTop: '8px', background: 'none',
              border: '1px solid #ff6b6b', borderRadius: '6px',
              color: '#ff6b6b', padding: '4px 12px', cursor: 'pointer', fontSize: '12px',
            }}>
              Start Over
            </button>
          )}
        </div>
      )}

      {/* STEP 1 — Driving License */}
      {step === 1 && (
        <div style={card}>
          <h2 style={{ color: 'white', marginBottom: '4px', fontSize: '18px' }}>
            Driving License
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '20px' }}>
            Verified against the Parivahan government database in real time.
          </p>

          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
            DL Number
          </label>
          <input
            style={input}
            placeholder="e.g. MH0120110012345"
            value={dlNumber}
            onChange={e => setDlNumber(e.target.value.toUpperCase())}
          />

          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', display: 'block', marginTop: '16px' }}>
            Date of Birth (as on DL)
          </label>
          <input
            type="date"
            style={input}
            value={dob}
            onChange={e => setDob(e.target.value)}
          />

          <button
            style={{ ...btn, opacity: loading || !dlNumber || !dob ? 0.6 : 1 }}
            onClick={handleVerifyDL}
            disabled={loading || !dlNumber || !dob}
          >
            {loading ? 'Verifying with government database...' : 'Verify Driving License →'}
          </button>
        </div>
      )}

      {/* STEP 2 — PAN */}
      {step === 2 && (
        <div style={card}>
          {dlResult && (
            <div style={{
              background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            }}>
              <p style={{ color: '#00ff88', fontSize: '13px', margin: 0, fontWeight: 600 }}>
                DL Verified — {dlResult.name}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '4px 0 0' }}>
                Valid until {dlResult.validity} · {dlResult.state}
              </p>
            </div>
          )}

          <h2 style={{ color: 'white', marginBottom: '4px', fontSize: '18px' }}>PAN Card</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '20px' }}>
            Verified against Income Tax database. Name must match your driving license.
          </p>

          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>PAN Number</label>
          <input
            style={input}
            placeholder="e.g. ABCDE1234F"
            maxLength={10}
            value={panNumber}
            onChange={e => setPanNumber(e.target.value.toUpperCase())}
          />

          <button
            style={{ ...btn, opacity: loading || panNumber.length !== 10 ? 0.6 : 1 }}
            onClick={handleVerifyPAN}
            disabled={loading || panNumber.length !== 10}
          >
            {loading ? 'Verifying PAN...' : 'Verify PAN →'}
          </button>
        </div>
      )}

      {/* STEP 3 — Selfie */}
      {step === 3 && (
        <div style={card}>
          {panResult && (
            <div style={{
              background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            }}>
              <p style={{ color: '#00ff88', fontSize: '13px', margin: 0, fontWeight: 600 }}>
                Name match confirmed — {panResult.nameMatchScore}% similarity
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '4px 0 0' }}>
                DL: {panResult.dlName} · PAN: {panResult.panName}
              </p>
            </div>
          )}

          <h2 style={{ color: 'white', marginBottom: '4px', fontSize: '18px' }}>Live Selfie</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '20px' }}>
            Take a clear selfie. It will be matched against your driving license photo.
          </p>

          {!selfiePreview && !cameraOn && (
            <button style={btn} onClick={startCamera}>
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
              <button style={btn} onClick={takeSelfie}>
                Take Selfie
              </button>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {selfiePreview && (
            <div style={{ textAlign: 'center' }}>
              <img
                src={selfiePreview}
                alt="selfie"
                style={{ width: '180px', height: '180px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #00ff88' }}
              />
              <button
                onClick={() => { setSelfiePreview(''); setSelfieBase64(''); startCamera(); }}
                style={{
                  display: 'block', margin: '12px auto 0', background: 'none',
                  border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px',
                }}
              >
                Retake
              </button>
              <button
                style={{ ...btn, opacity: loading ? 0.6 : 1 }}
                onClick={handleFaceMatch}
                disabled={loading}
              >
                {loading ? 'Matching face...' : 'Submit for Verification →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4 — Done */}
      {step === 4 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(0,255,136,0.15)', border: '2px solid #00ff88',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '32px',
          }}>
            ✓
          </div>
          <h2 style={{ color: '#00ff88', marginBottom: '8px' }}>KYC Verified</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px', fontSize: '14px' }}>
            Your identity has been verified. You can now book any bike on RidePulse.
          </p>
          <button
            style={{ ...btn, maxWidth: '200px', margin: '0 auto' }}
            onClick={() => router.push('/search')}
          >
            Browse Bikes →
          </button>
        </div>
      )}
    </div>
  );
}

              {/* Driving License Back (Optional) */}
              <div className="upload-section">
                <label className="upload-label">
                  <span>Driving License (Back)</span>
                  <div className="upload-box" onClick={() => dlBackRef.current?.click()}>
                    {previews.drivingLicenseBack ? (
                      <img src={previews.drivingLicenseBack} alt="DL Back" className="upload-preview" />
                    ) : (
                      <>
                        <UploadCloud size={32} />
                        <p>Click to upload back of driving license (optional)</p>
                        <span>JPG, PNG · Max 5MB</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={dlBackRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange('drivingLicenseBack', e)}
                  />
                </label>
              </div>

              {/* Government ID */}
              <div className="upload-section">
                <label className="upload-label">
                  <span>Government ID *</span>
                  <p className="upload-desc">Aadhaar, PAN, Voter ID, or Passport</p>
                  <div className="upload-box" onClick={() => govtIdRef.current?.click()}>
                    {previews.govtId ? (
                      <img src={previews.govtId} alt="Govt ID" className="upload-preview" />
                    ) : (
                      <>
                        <UploadCloud size={32} />
                        <p>Click to upload government ID</p>
                        <span>JPG, PNG · Max 5MB</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={govtIdRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange('govtId', e)}
                  />
                </label>
              </div>

              <button type="submit" className="btn-primary btn-submit" disabled={submitting}>
                {submitting ? <><Loader size={18} className="animate-spin" /> Submitting...</> : 'Submit for Verification'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}