'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Smartphone, CheckCircle, AlertCircle, Loader, Copy } from 'lucide-react';
import './payment.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const txnId = searchParams.get('txnId');
  const amount = searchParams.get('amount');

  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!txnId || !amount) {
      setStatus('error');
      setLoading(false);
      return;
    }

    // In a real app, this would be fetched from the server
    // For demo, we'll simulate the payment data
    setPaymentData({
      txnId,
      amount: Number(amount),
      upiId: 'ridepulse@upi',
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=ridepulse@upi&pn=RidePulse&am=${amount}&cu=INR&tn=Wallet%20Top-up&tr=${txnId}`,
    });
    setLoading(false);
  }, [txnId, amount]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(paymentData.upiId);
    alert('UPI ID copied to clipboard!');
  };

  const handleConfirmPayment = async () => {
    setConfirming(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/payment/upi/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ txnId: paymentData.txnId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        alert(data.message || 'Payment verification failed');
      }
    } catch (err) {
      setStatus('error');
      alert('Error verifying payment');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-page container section">
        <div className="loading-state"><div className="spinner" /><p>Loading payment details...</p></div>
      </div>
    );
  }

  if (status === 'error' || !paymentData) {
    return (
      <div className="payment-page container section">
        <div className="payment-card glass">
          <AlertCircle size={48} className="error-icon" />
          <h2>Payment Error</h2>
          <p>Invalid or expired payment link.</p>
          <a href="/account?tab=wallet" className="btn-primary">Back to Wallet</a>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="payment-page container section">
        <div className="payment-card glass">
          <CheckCircle size={48} className="success-icon" />
          <h2>Payment Successful!</h2>
          <p>₹{paymentData.amount.toLocaleString('en-IN')} has been added to your wallet.</p>
          <div className="payment-details">
            <p><strong>Transaction ID:</strong> {paymentData.txnId}</p>
            <p><strong>Amount:</strong> ₹{paymentData.amount.toLocaleString('en-IN')}</p>
          </div>
          <a href="/account?tab=wallet" className="btn-primary">View Wallet Balance</a>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page container section">
      <div className="payment-header">
        <h1 className="heading-md">Complete Your Payment</h1>
        <p>Scan the QR code or use the UPI ID to pay ₹{paymentData.amount.toLocaleString('en-IN')}</p>
      </div>

      <div className="payment-content">
        <div className="payment-card glass">
          <div className="payment-amount">
            <span className="amount">₹{paymentData.amount.toLocaleString('en-IN')}</span>
            <span className="label">Wallet Top-up</span>
          </div>

          <div className="payment-methods">
            <div className="upi-section">
              <h3>UPI Payment</h3>
              <div className="upi-details">
                <div className="upi-id">
                  <Smartphone size={20} />
                  <span>{paymentData.upiId}</span>
                  <button className="copy-btn" onClick={copyUpiId}>
                    <Copy size={16} />
                  </button>
                </div>
                <p className="upi-instruction">
                  Open your UPI app (Google Pay, PhonePe, Paytm, etc.) and pay to this UPI ID
                </p>
              </div>
            </div>

            <div className="qr-section">
              <h3>Or Scan QR Code</h3>
              <div className="qr-code">
                <img src={paymentData.qrCodeUrl} alt="UPI QR Code" />
              </div>
              <p className="qr-instruction">Scan with any UPI app</p>
            </div>
          </div>

          <div className="payment-actions">
            <p className="confirm-note">
              After completing the payment in your UPI app, click "I've Paid" to confirm.
            </p>
            <button
              className="btn-primary confirm-btn"
              onClick={handleConfirmPayment}
              disabled={confirming}
            >
              {confirming ? (
                <><Loader size={16} className="animate-spin" /> Verifying...</>
              ) : (
                <>I've Paid - Confirm</>
              )}
            </button>
          </div>
        </div>

        <div className="payment-info glass">
          <h3>Payment Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Transaction ID</span>
              <span className="info-value">{paymentData.txnId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Amount</span>
              <span className="info-value">₹{paymentData.amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Purpose</span>
              <span className="info-value">Wallet Top-up</span>
            </div>
          </div>
          <div className="security-note">
            <ShieldCheck size={16} />
            <span>Your payment is secured with bank-level encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}