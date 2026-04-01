'use client';
import { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader, ShieldCheck } from 'lucide-react';
import './kyc.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function KYCPage() {
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState('loading');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMsg, setSubmitMsg] = useState('');

  const dlFrontRef = useRef(null);
  const dlBackRef = useRef(null);
  const govtIdRef = useRef(null);

  const [files, setFiles] = useState({
    drivingLicenseFront: null,
    drivingLicenseBack: null,
    govtId: null,
  });

  const [previews, setPreviews] = useState({
    drivingLicenseFront: null,
    drivingLicenseBack: null,
    govtId: null,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(stored);
    } catch {}

    // Check current KYC status
    fetch(`${API}/api/kyc/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setKycStatus(d.status || 'not_started'))
      .catch(() => setKycStatus('not_started'));
  }, []);

  const handleFileChange = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('File size must be less than 5MB.');
      return;
    }

    setFiles(prev => ({ ...prev, [field]: file }));

    const reader = new FileReader();
    reader.onload = (ev) => setPreviews(prev => ({ ...prev, [field]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.drivingLicenseFront || !files.govtId) {
      alert('Please upload all required documents.');
      return;
    }

    setSubmitting(true);
    setSubmitStatus(null);

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('drivingLicenseFront', files.drivingLicenseFront);
    if (files.drivingLicenseBack) formData.append('drivingLicenseBack', files.drivingLicenseBack);
    formData.append('govtId', files.govtId);

    try {
      const res = await fetch(`${API}/api/kyc/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      setSubmitStatus('success');
      setSubmitMsg('Your documents have been submitted successfully! Verification usually takes 5 minutes.');
      setKycStatus('pending');

      // Clear form
      setFiles({ drivingLicenseFront: null, drivingLicenseBack: null, govtId: null });
      setPreviews({ drivingLicenseFront: null, drivingLicenseBack: null, govtId: null });
    } catch (err) {
      setSubmitStatus('error');
      setSubmitMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="kyc-page container section">
        <div className="loading-state"><div className="spinner" /><p>Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="kyc-page container section">
      <div className="kyc-header">
        <h1 className="heading-md">Identity Verification</h1>
        <p>Complete your KYC to start booking bikes. All documents are securely stored and verified.</p>
      </div>

      <div className="kyc-content glass">
        {/* Status Display */}
        {kycStatus === 'verified' && (
          <div className="kyc-status-card verified">
            <CheckCircle size={48} className="status-icon" />
            <h2>Verification Complete!</h2>
            <p>Your identity has been verified. You can now book bikes.</p>
            <a href="/search" className="btn-primary">Browse Bikes</a>
          </div>
        )}

        {kycStatus === 'pending' && (
          <div className="kyc-status-card pending">
            <Loader size={48} className="status-icon animate-spin" />
            <h2>Verification in Progress</h2>
            <p>Your documents are being reviewed. This usually takes 5 minutes.</p>
            <p className="status-note">You'll receive a notification once verified.</p>
          </div>
        )}

        {kycStatus === 'rejected' && (
          <div className="kyc-status-card rejected">
            <AlertCircle size={48} className="status-icon" />
            <h2>Verification Failed</h2>
            <p>Please check your documents and try again.</p>
            <button className="btn-primary" onClick={() => setKycStatus('not_started')}>Retry Verification</button>
          </div>
        )}

        {kycStatus === 'not_started' && (
          <>
            <div className="kyc-intro">
              <ShieldCheck size={32} />
              <h2>Complete Your Profile</h2>
              <p>Upload your driving license and government ID for verification.</p>
            </div>

            {submitStatus === 'success' && (
              <div className="alert alert-success">
                <CheckCircle size={18} /> {submitMsg}
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="alert alert-error">
                <AlertCircle size={18} /> {submitMsg}
              </div>
            )}

            <form className="kyc-form" onSubmit={handleSubmit}>
              {/* Driving License Front */}
              <div className="upload-section">
                <label className="upload-label">
                  <span>Driving License (Front) *</span>
                  <div className="upload-box" onClick={() => dlFrontRef.current?.click()}>
                    {previews.drivingLicenseFront ? (
                      <img src={previews.drivingLicenseFront} alt="DL Front" className="upload-preview" />
                    ) : (
                      <>
                        <UploadCloud size={32} />
                        <p>Click to upload front of driving license</p>
                        <span>JPG, PNG · Max 5MB</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={dlFrontRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange('drivingLicenseFront', e)}
                  />
                </label>
              </div>

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