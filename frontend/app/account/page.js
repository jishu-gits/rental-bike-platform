'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Mail, ShieldCheck, Calendar, Clock, Bike, Wallet, CreditCard, Gift, Bell, Star, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import './account.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function AccountPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [kycStatus, setKycStatus] = useState('not_started');
  const [referral, setReferral] = useState({ code: '', count: 0, earned: 0 });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(stored);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    setLoading(true);

    const fetchData = async () => {
      try {
        if (activeTab === 'bookings') {
          const res = await fetch(`${API}/api/bookings/my-bookings`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          setBookings(Array.isArray(d) ? d : []);
        } else if (activeTab === 'wallet') {
          const res = await fetch(`${API}/api/wallet`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          if (d.success) setWallet({ balance: d.balance || 0, transactions: d.transactions || [] });
        } else if (activeTab === 'kyc') {
          const res = await fetch(`${API}/api/kyc/status`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          setKycStatus(d.status || 'not_started');
        } else if (activeTab === 'referral') {
          const res = await fetch(`${API}/api/referral/code`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          if (d.success) setReferral({ code: d.referralCode, count: d.referralCount, earned: d.totalEarned });
        } else if (activeTab === 'notifications') {
          const res = await fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          if (d.success) setNotifications(d.notifications || []);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, user]);

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking? Cancellations within 24 hours may not be refundable.')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Booking cancelled. ${data.refundAmount > 0 ? `₹${data.refundAmount} refunded to wallet.` : 'No refund applicable.'}`);
        // Refresh bookings
        const res2 = await fetch(`${API}/api/bookings/my-bookings`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res2.json();
        setBookings(Array.isArray(d) ? d : []);
      } else {
        alert(data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      alert('Error cancelling booking');
    }
  };

  const handleLeaveReview = async (bookingId, bikeId) => {
    const rating = prompt('Rate your experience (1-5 stars):');
    if (!rating || rating < 1 || rating > 5) return;
    const comment = prompt('Leave a comment (optional):') || '';
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId, rating: Number(rating), comment }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Review submitted successfully!');
        // Refresh bookings
        const res2 = await fetch(`${API}/api/bookings/my-bookings`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await res2.json();
        setBookings(Array.isArray(d) ? d : []);
      } else {
        alert(data.message || 'Failed to submit review');
      }
    } catch (err) {
      alert('Error submitting review');
    }
  };

  const handleTopup = async () => {
    const amount = prompt('Enter top-up amount (₹):');
    if (!amount || amount < 1) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/wallet/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`₹${amount} added to wallet!`);
        setWallet(prev => ({ ...prev, balance: data.balance }));
      } else {
        alert(data.message || 'Top-up failed');
      }
    } catch (err) {
      alert('Error topping up wallet');
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referral.code);
    alert('Referral code copied to clipboard!');
  };

  if (!user) {
    return (
      <div className="account-page container section">
        <div className="not-logged-in glass">
          <User size={48} />
          <h2>You're not logged in</h2>
          <p>Please log in to view your account.</p>
          <a href="/login" className="btn-primary" style={{ marginTop: '1.5rem', padding: '0.75rem 2rem' }}>Log In</a>
        </div>
      </div>
    );
  }

  const initials = user.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="account-page container section">
      {/* Header */}
      <div className="account-header glass">
        <div className="account-avatar">{initials}</div>
        <div>
          <h1 className="account-name">{user.name}</h1>
          <p className="account-email">{user.email}</p>
          <span className="account-role-badge">{user.role}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="account-tabs">
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          Profile
        </button>
        <button className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
          My Bookings
        </button>
        <button className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>
          <Wallet size={16} /> Wallet
        </button>
        <button className={`tab-btn ${activeTab === 'kyc' ? 'active' : ''}`} onClick={() => setActiveTab('kyc')}>
          <ShieldCheck size={16} /> KYC
        </button>
        <button className={`tab-btn ${activeTab === 'referral' ? 'active' : ''}`} onClick={() => setActiveTab('referral')}>
          <Gift size={16} /> Refer & Earn
        </button>
        <button className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={16} /> Notifications
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="tab-content glass">
          <h2>Account Details</h2>
          <div className="detail-list">
            <div className="detail-item">
              <User size={18} className="detail-icon" />
              <div>
                <p className="detail-label">Full Name</p>
                <p className="detail-value">{user.name}</p>
              </div>
            </div>
            <div className="detail-item">
              <Mail size={18} className="detail-icon" />
              <div>
                <p className="detail-label">Email</p>
                <p className="detail-value">{user.email}</p>
              </div>
            </div>
            <div className="detail-item">
              <ShieldCheck size={18} className="detail-icon" />
              <div>
                <p className="detail-label">Account Type</p>
                <p className="detail-value" style={{ textTransform: 'capitalize' }}>{user.role}</p>
              </div>
            </div>
          </div>

          {user.role === 'customer' && (
            <div className="upgrade-hint">
              <p>Want to list your own bike? <a href="/provider" className="auth-link">Become a Provider →</a></p>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="tab-content glass">
          <h2>My Bookings</h2>
          {bookingsLoading && <p className="loading-hint">Loading bookings...</p>}
          {!bookingsLoading && bookings.length === 0 && (
            <div className="empty-bookings">
              <Bike size={40} />
              <p>No bookings yet. <a href="/search" className="auth-link">Browse bikes →</a></p>
            </div>
          )}
          <div className="bookings-list">
            {bookings.map((b) => (
              <div key={b._id} className="booking-card">
                <div className="booking-top">
                  <div>
                    <h3>{b.bikeId?.brand} {b.bikeId?.model}</h3>
                    <p className="booking-meta">
                      <Calendar size={13} /> {new Date(b.startDate).toLocaleDateString('en-IN')} →{' '}
                      {new Date(b.endDate).toLocaleDateString('en-IN')}
                      {b.planType && <span> · {b.planType.charAt(0).toUpperCase() + b.planType.slice(1)}</span>}
                      {b.deliveryType === 'doorstep' && <span> · Doorstep Delivery</span>}
                    </p>
                  </div>
                  <div className="booking-right">
                    <p className="booking-cost">₹{b.totalCost?.toLocaleString('en-IN')}</p>
                    <span className={`status-badge status-${b.status}`}>{b.status}</span>
                  </div>
                </div>
                <div className="booking-actions">
                  {b.status === 'confirmed' && new Date(b.startDate) > new Date() && (
                    <button className="btn-secondary" onClick={() => handleCancelBooking(b._id)}>Cancel Booking</button>
                  )}
                  {b.status === 'completed' && (
                    <button className="btn-primary" onClick={() => handleLeaveReview(b._id, b.bikeId?._id)}>
                      <Star size={14} /> Leave a Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallet Tab */}
      {activeTab === 'wallet' && (
        <div className="tab-content glass">
          <h2>Wallet</h2>
          <div className="wallet-balance">
            <Wallet size={32} />
            <div>
              <p className="balance-amount">₹{wallet.balance.toLocaleString('en-IN')}</p>
              <p className="balance-label">Available Balance</p>
            </div>
            <button className="btn-primary" onClick={handleTopup}>Add Money</button>
          </div>
          <h3>Transaction History</h3>
          {wallet.transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <div className="transactions-list">
              {wallet.transactions.map((t, i) => (
                <div key={i} className="transaction-item">
                  <div className="txn-icon">{t.type === 'credit' ? '➕' : '➖'}</div>
                  <div className="txn-details">
                    <p>{t.description}</p>
                    <span className="txn-date">{new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <span className={`txn-amount ${t.type}`}>₹{t.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className="tab-content glass">
          <h2>KYC Verification</h2>
          <div className="kyc-status">
            {kycStatus === 'verified' && (
              <div className="status-verified">
                <CheckCircle size={24} />
                <p>Your identity is verified. You can book bikes now!</p>
              </div>
            )}
            {kycStatus === 'pending' && (
              <div className="status-pending">
                <Clock size={24} />
                <p>Your documents are under review. We'll notify you once verified.</p>
              </div>
            )}
            {kycStatus === 'rejected' && (
              <div className="status-rejected">
                <AlertCircle size={24} />
                <p>Verification failed. Please check your documents and try again.</p>
              </div>
            )}
            {kycStatus === 'not_started' && (
              <div className="status-not-started">
                <ShieldCheck size={24} />
                <p>Complete KYC to start booking bikes.</p>
                <a href="/kyc" className="btn-primary">Start Verification</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Referral Tab */}
      {activeTab === 'referral' && (
        <div className="tab-content glass">
          <h2>Refer & Earn</h2>
          <div className="referral-card">
            <Gift size={32} />
            <div>
              <p className="referral-code">{referral.code}</p>
              <p>Your referral code</p>
              <button className="btn-secondary" onClick={copyReferralCode}>Copy Code</button>
            </div>
          </div>
          <div className="referral-stats">
            <div className="stat">
              <p className="stat-num">{referral.count}</p>
              <p>Friends referred</p>
            </div>
            <div className="stat">
              <p className="stat-num">₹{referral.earned.toLocaleString('en-IN')}</p>
              <p>Total earned</p>
            </div>
          </div>
          <p>Share your code with friends. Both you and your friend get ₹150 when they sign up and book their first ride!</p>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="tab-content glass">
          <h2>Notifications</h2>
          {notifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            <div className="notifications-list">
              {notifications.map((n) => (
                <div key={n._id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                  <span className="notif-icon">
                    {n.type?.includes('booking') ? '📅' : n.type?.includes('kyc') ? '🪪' : n.type?.includes('wallet') ? '💰' : '🔔'}
                  </span>
                  <div className="notif-body">
                    <p>{n.message}</p>
                    <span className="notif-time">{new Date(n.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
