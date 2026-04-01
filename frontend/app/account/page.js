'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Mail, ShieldCheck, Calendar, Clock, Bike } from 'lucide-react';
import './account.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function AccountPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(stored);
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'bookings' && user) {
      const token = localStorage.getItem('token');
      setBookingsLoading(true);
      fetch(`${API}/api/bookings/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => setBookings(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setBookingsLoading(false));
    }
  }, [activeTab, user]);

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
                    </p>
                  </div>
                  <div className="booking-right">
                    <p className="booking-cost">₹{b.totalCost?.toLocaleString('en-IN')}</p>
                    <span className={`status-badge status-${b.status}`}>{b.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
