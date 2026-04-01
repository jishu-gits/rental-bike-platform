'use client';
import { useState, useEffect } from 'react';
import { Bell, Calendar, CreditCard, ShieldCheck, Gift, Star, Bike } from 'lucide-react';
import './notifications.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch {}
    finally { setLoading(false); }
  };

  const getNotificationIcon = (type) => {
    if (type?.includes('booking')) return <Calendar size={20} />;
    if (type?.includes('kyc')) return <ShieldCheck size={20} />;
    if (type?.includes('wallet')) return <CreditCard size={20} />;
    if (type?.includes('review')) return <Star size={20} />;
    if (type?.includes('referral')) return <Gift size={20} />;
    return <Bell size={20} />;
  };

  const getNotificationColor = (type) => {
    if (type?.includes('booking')) return '#3b82f6';
    if (type?.includes('kyc')) return '#10b981';
    if (type?.includes('wallet')) return '#f59e0b';
    if (type?.includes('review')) return '#8b5cf6';
    if (type?.includes('referral')) return '#ec4899';
    return '#6b7280';
  };

  if (!user) {
    return (
      <div className="notifications-page container section">
        <div className="loading-state"><div className="spinner" /><p>Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="notifications-page container section">
      <div className="notifications-header">
        <h1 className="heading-md">Notifications</h1>
        <p>Stay updated with your bookings, payments, and account activity.</p>
      </div>

      <div className="notifications-content glass">
        {loading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading notifications...</p></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>No notifications yet</h3>
            <p>When you book bikes, receive payments, or get updates, they'll appear here.</p>
            <a href="/search" className="btn-primary">Browse Bikes</a>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notif) => (
              <div key={notif._id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                <div
                  className="notification-icon"
                  style={{ backgroundColor: getNotificationColor(notif.type) }}
                >
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="notification-content">
                  <p className="notification-message">{notif.message}</p>
                  <span className="notification-time">
                    {new Date(notif.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {!notif.read && <div className="unread-dot" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}