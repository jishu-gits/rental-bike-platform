'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Calendar, Clock, CheckCircle, AlertCircle, Loader, Wallet, MapPin, Zap } from 'lucide-react';
import './booking-modal.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const PLAN_TABS = ['hourly', 'daily', 'weekly', 'monthly'];
const DELIVERY_SLOTS = [
  { value: 'morning',   label: '🌅 Morning (8am – 12pm)' },
  { value: 'afternoon', label: '☀️ Afternoon (12pm – 4pm)' },
  { value: 'evening',   label: '🌆 Evening (4pm – 8pm)' },
];
const PLAN_DISCOUNTS = { hourly: null, daily: null, weekly: '15% off', monthly: '30% off' };

function computeTotal(bike, plan, startDate, endDate, hours) {
  if (!bike) return 0;
  const ppd = bike.pricePerDay;
  switch (plan) {
    case 'hourly': {
      const h = Math.max(1, hours);
      return Math.round((ppd / 24) * h);
    }
    case 'weekly': {
      if (!startDate || !endDate) return 0;
      const days = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000));
      const weeks = Math.max(1, Math.ceil(days / 7));
      return Math.round(ppd * 7 * weeks * 0.85);
    }
    case 'monthly': {
      if (!startDate || !endDate) return 0;
      const days = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000));
      const months = Math.max(1, Math.ceil(days / 30));
      return Math.round(ppd * 30 * months * 0.70);
    }
    default: {
      if (!startDate || !endDate) return 0;
      const days = Math.max(0, Math.round((new Date(endDate) - new Date(startDate)) / 86400000));
      return Math.round(ppd * days);
    }
  }
}

export default function BookingModal({ bike, onClose, onSuccess }) {
  const [plan, setPlan] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [hours, setHours] = useState(4);

  const [step, setStep] = useState(1); // 1=plan, 2=delivery, 3=payment
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState({ street: '', city: '', pincode: '' });
  const [deliverySlot, setDeliverySlot] = useState('morning');

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [payMethod, setPayMethod] = useState('upi'); // 'upi' | 'wallet'

  const [kycStatus, setKycStatus] = useState('loading');
  const [bookingStatus, setBookingStatus] = useState(null);
  const [bookingMsg, setBookingMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const totalCost = computeTotal(bike, plan, startDate, endDate, hours);
  const deliverySurcharge = deliveryType === 'doorstep' ? 50 : 0;
  const grandTotal = totalCost + deliverySurcharge;
  const walletDeduction = useWallet ? Math.min(walletBalance, grandTotal) : 0;
  const remainingToPay = grandTotal - walletDeduction;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setIsGuest(true); setKycStatus('not_started'); return; }

    // Fetch KYC status
    fetch(`${API}/api/kyc/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setKycStatus(d.status || 'not_started'))
      .catch(() => setKycStatus('not_started'));

    // Fetch wallet balance
    fetch(`${API}/api/wallet`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setWalletBalance(d.balance || 0))
      .catch(() => {});
  }, []);

  const canProceed = () => {
    if (plan === 'hourly') return hours >= 1;
    return startDate && endDate && new Date(endDate) > new Date(startDate);
  };

  const handleBook = async () => {
    setLoading(true);
    setBookingStatus(null);
    const token = localStorage.getItem('token');
    try {
      const endDateVal = plan === 'hourly'
        ? new Date(new Date(`${startDate}T${startTime}`).getTime() + hours * 3600000).toISOString()
        : endDate;
      const startDateVal = plan === 'hourly' ? `${startDate}T${startTime}` : startDate;

      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bikeId: bike._id,
          planType: plan,
          startDate: startDateVal,
          endDate: endDateVal,
          hours: plan === 'hourly' ? hours : 0,
          deliveryType,
          deliveryAddress: deliveryType === 'doorstep' ? deliveryAddress : {},
          deliverySlot: deliveryType === 'doorstep' ? deliverySlot : '',
          useWallet,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.message === 'KYC_REQUIRED') throw new Error('KYC_REQUIRED');
        throw new Error(data.message || 'Booking failed');
      }
      setBookingStatus('success');
      setBookingMsg(`Booking confirmed! ₹${grandTotal.toLocaleString('en-IN')} total.${walletDeduction > 0 ? ` ₹${walletDeduction} paid from wallet.` : ''}`);
      if (onSuccess) onSuccess();
    } catch (err) {
      setBookingStatus('error');
      setBookingMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!bike) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>

        {/* Bike Header */}
        <div className="modal-bike-header">
          {bike.images?.[0] && (
            <div className="modal-img-wrapper">
              <Image src={bike.images[0]} alt={bike.brand} fill style={{ objectFit: 'cover' }} />
            </div>
          )}
          <div>
            <span className="badge">{bike.category}</span>
            {bike.fuelType === 'electric' && <span className="badge ev-badge"><Zap size={11} /> EV</span>}
            <h2>{bike.brand} {bike.model}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{bike.year} · {bike.city || bike.location}</p>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '0.4rem' }}>
              ₹{bike.pricePerDay.toLocaleString('en-IN')}<small style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>/day</small>
            </p>
          </div>
        </div>

        {/* Guest Gate */}
        {isGuest && (
          <div className="kyc-block">
            <AlertCircle size={18} />
            <p>Sign in to complete your booking. <a href="/login" style={{ color: 'var(--primary-color)' }}>Log In</a> or <a href="/signup" style={{ color: 'var(--primary-color)' }}>Sign Up</a></p>
          </div>
        )}

        {/* KYC Gate */}
        {!isGuest && kycStatus !== 'verified' && kycStatus !== 'loading' && (
          <div className="kyc-block">
            <AlertCircle size={18} />
            <p>
              {kycStatus === 'pending'
                ? 'Your KYC is under review. Booking will be available once verified.'
                : 'Complete identity verification before booking.'}{' '}
              <a href="/kyc" style={{ color: 'var(--primary-color)' }}>Complete KYC →</a>
            </p>
          </div>
        )}

        {/* Booking Success */}
        {bookingStatus === 'success' && (
          <div className="booking-success">
            <CheckCircle size={48} className="success-icon" />
            <h3>Booking Confirmed!</h3>
            <p>{bookingMsg}</p>
            <a href="/account?tab=bookings" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>View My Bookings</a>
            <button className="btn-secondary" style={{ marginTop: '0.75rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} onClick={onClose}>Close</button>
          </div>
        )}

        {/* Booking Form */}
        {bookingStatus !== 'success' && !isGuest && (
          <>
            {/* Step Indicators */}
            <div className="modal-steps">
              {['Select Plan', 'Delivery', 'Payment'].map((s, i) => (
                <div key={s} className={`step-indicator ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
                  <div className="step-dot">{step > i + 1 ? '✓' : i + 1}</div>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            {/* STEP 1 — Plan & Dates */}
            {step === 1 && (
              <div className="step-content">
                {/* Plan Tabs */}
                <div className="plan-tabs">
                  {PLAN_TABS.map((p) => (
                    <button key={p} className={`plan-tab ${plan === p ? 'active' : ''}`} onClick={() => setPlan(p)}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                      {PLAN_DISCOUNTS[p] && <span className="discount-pill">{PLAN_DISCOUNTS[p]}</span>}
                    </button>
                  ))}
                </div>

                {plan === 'hourly' ? (
                  <div className="modal-dates">
                    <div className="date-group">
                      <label><Calendar size={14} /> Date</label>
                      <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input" />
                    </div>
                    <div className="date-group">
                      <label><Clock size={14} /> Start Time</label>
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="date-input" />
                    </div>
                    <div className="date-group">
                      <label><Clock size={14} /> Duration (hours)</label>
                      <input type="number" min={1} max={24} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="date-input" />
                    </div>
                  </div>
                ) : (
                  <div className="modal-dates">
                    <div className="date-group">
                      <label><Calendar size={14} /> Start Date</label>
                      <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input" />
                    </div>
                    <div className="date-group">
                      <label><Calendar size={14} /> End Date</label>
                      <input type="date" min={startDate ? new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0] : today} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input" />
                    </div>
                  </div>
                )}

                {/* Cost Breakdown */}
                {totalCost > 0 && (
                  <div className="cost-summary">
                    <div className="cost-row">
                      <span>Base rate</span>
                      <span>₹{bike.pricePerDay.toLocaleString('en-IN')}/day</span>
                    </div>
                    {plan === 'weekly' && <div className="cost-row discount"><span>Weekly discount</span><span>−15%</span></div>}
                    {plan === 'monthly' && <div className="cost-row discount"><span>Monthly discount</span><span>−30%</span></div>}
                    <div className="cost-row total-cost">
                      <span>Subtotal</span><span>₹{totalCost.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}

                {bookingStatus === 'error' && (
                  <div className="booking-alert booking-error"><AlertCircle size={16} /> {bookingMsg}</div>
                )}

                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.9rem', marginTop: '1.5rem' }}
                  disabled={kycStatus !== 'verified' || !canProceed()}
                  onClick={() => setStep(2)}
                >
                  Continue to Delivery →
                </button>
              </div>
            )}

            {/* STEP 2 — Delivery */}
            {step === 2 && (
              <div className="step-content">
                <h3 style={{ marginBottom: '1.25rem' }}>Delivery Options</h3>
                <div className="delivery-options">
                  <button
                    className={`delivery-btn ${deliveryType === 'pickup' ? 'active' : ''}`}
                    onClick={() => setDeliveryType('pickup')}
                  >
                    <MapPin size={20} />
                    <div>
                      <strong>Pickup from location</strong>
                      <p>{bike.city || bike.location}</p>
                    </div>
                  </button>
                  <button
                    className={`delivery-btn ${deliveryType === 'doorstep' ? 'active' : ''}`}
                    onClick={() => setDeliveryType('doorstep')}
                  >
                    <MapPin size={20} />
                    <div>
                      <strong>Doorstep Delivery</strong>
                      <p>+₹50 delivery charge</p>
                    </div>
                  </button>
                </div>

                {deliveryType === 'doorstep' && (
                  <>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label className="form-label">Street Address *</label>
                      <input className="date-input" placeholder="House no., Street, Area" value={deliveryAddress.street}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">City *</label>
                        <input className="date-input" placeholder="City" value={deliveryAddress.city}
                          onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Pincode *</label>
                        <input className="date-input" placeholder="Pincode" value={deliveryAddress.pincode}
                          onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label className="form-label">Delivery Slot</label>
                      <div className="slot-options">
                        {DELIVERY_SLOTS.map((s) => (
                          <button key={s.value} className={`slot-btn ${deliverySlot === s.value ? 'active' : ''}`}
                            onClick={() => setDeliverySlot(s.value)}>{s.label}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="cost-summary" style={{ marginTop: '1rem' }}>
                  <div className="cost-row"><span>Subtotal</span><span>₹{totalCost.toLocaleString('en-IN')}</span></div>
                  {deliverySurcharge > 0 && <div className="cost-row"><span>Doorstep delivery</span><span>+₹50</span></div>}
                  <div className="cost-row total-cost"><span>Grand Total</span><span>₹{grandTotal.toLocaleString('en-IN')}</span></div>
                </div>

                <div className="modal-nav">
                  <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn-primary" onClick={() => setStep(3)}>Continue to Payment →</button>
                </div>
              </div>
            )}

            {/* STEP 3 — Payment */}
            {step === 3 && (
              <div className="step-content">
                <h3 style={{ marginBottom: '1.25rem' }}>Payment</h3>

                {/* Wallet Toggle */}
                {walletBalance > 0 && (
                  <div className={`wallet-toggle ${useWallet ? 'active' : ''}`} onClick={() => setUseWallet(!useWallet)}>
                    <Wallet size={18} />
                    <div>
                      <strong>Use Wallet Balance</strong>
                      <p>Available: ₹{walletBalance.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="toggle-switch">{useWallet ? '✓' : '○'}</div>
                  </div>
                )}

                {/* Payment Method */}
                {remainingToPay > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Pay remaining ₹{remainingToPay.toLocaleString('en-IN')} via:</p>
                    <div className="pay-methods">
                      <button className={`pay-method-btn ${payMethod === 'upi' ? 'active' : ''}`} onClick={() => setPayMethod('upi')}>
                        📱 UPI
                      </button>
                      <button className={`pay-method-btn ${payMethod === 'card' ? 'active' : ''}`} onClick={() => setPayMethod('card')}>
                        💳 Card
                      </button>
                    </div>
                    {payMethod === 'upi' && (
                      <div className="upi-info">
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>UPI ID: <strong style={{ color: 'var(--primary-color)' }}>ridepulse@upi</strong></p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>After payment confirmation, click "Confirm Booking" below.</p>
                      </div>
                    )}
                    {payMethod === 'card' && (
                      <div className="upi-info">
                        <input className="date-input" placeholder="Card number (simulated)" style={{ marginBottom: '0.5rem' }} readOnly />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Payment gateway integration — click Confirm to simulate.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Final Summary */}
                <div className="cost-summary">
                  <div className="cost-row"><span>Grand Total</span><span>₹{grandTotal.toLocaleString('en-IN')}</span></div>
                  {useWallet && <div className="cost-row discount"><span>Wallet deducted</span><span>−₹{walletDeduction.toLocaleString('en-IN')}</span></div>}
                  <div className="cost-row total-cost"><span>To pay now</span><span>₹{remainingToPay.toLocaleString('en-IN')}</span></div>
                </div>

                {bookingStatus === 'error' && (
                  <div className="booking-alert booking-error"><AlertCircle size={16} /> {bookingMsg}</div>
                )}

                <div className="modal-nav">
                  <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                  <button className="btn-primary" onClick={handleBook} disabled={loading}>
                    {loading ? <><Loader size={16} className="animate-spin" /> Confirming...</> : `Confirm Booking · ₹${grandTotal.toLocaleString('en-IN')}`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
