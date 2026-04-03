'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, LogOut, Settings, Bell, HelpCircle } from 'lucide-react';
import './navbar.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function Navbar() {
  const [scrolled, setScrolled]         = useState(false);
  const [user, setUser]                 = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]             = useState(0);
  const dropdownRef = useRef(null);
  const notifRef    = useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(stored);
    } catch {}

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current    && !notifRef.current.contains(e.target))    setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications when user is set
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    fetch(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setNotifications(d.notifications?.slice(0, 10) || []);
          setUnread(d.unreadCount || 0);
        }
      })
      .catch(() => {});
  }, [user]);

  const markAllRead = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${API}/api/notifications/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const notifIcon = (type) => {
    if (type?.includes('booking')) return '📅';
    if (type?.includes('kyc'))     return '🪪';
    if (type?.includes('wallet'))  return '💰';
    if (type?.includes('review'))  return '⭐';
    if (type?.includes('referral'))return '🎁';
    return '🔔';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <nav className={`navbar ${scrolled ? 'nav-scrolled glass' : ''}`}>
      <div className="container nav-content">
        <Link href="/" className="logo">
          Ride<span className="text-gradient">Pulse</span>
        </Link>

        <div className="nav-links">
          <Link href="/search" className="nav-item">Browse Bikes</Link>
          <Link href="/provider" className="nav-item">List Your Bike</Link>
          <Link href="/pricing" className="nav-item">Pricing</Link>
        </div>

        <div className="nav-auth">
          {/* Help Button */}
          <Link href="/help" className="nav-icon-btn" title="Help Center">
            <HelpCircle size={20} />
          </Link>

          {user ? (
            <>
              {/* Notification Bell */}
              <div className="notif-wrap" ref={notifRef}>
                <button
                  className="nav-icon-btn notif-btn"
                  onClick={() => { setNotifOpen((p) => !p); if (!notifOpen && unread > 0) markAllRead(); }}
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
                </button>

                {notifOpen && (
                  <div className="notif-dropdown glass">
                    <div className="notif-header">
                      <span>Notifications</span>
                      {unread > 0 && <button className="mark-read-btn" onClick={markAllRead}>Mark all read</button>}
                    </div>
                    {notifications.length === 0 && (
                      <p className="notif-empty">No notifications yet.</p>
                    )}
                    {notifications.map((n) => (
                      <div key={n._id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                        <span className="notif-icon">{notifIcon(n.type)}</span>
                        <div className="notif-body">
                          <p>{n.message}</p>
                          <span className="notif-time">{timeAgo(n.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                    <Link href="/notifications" className="notif-see-all" onClick={() => setNotifOpen(false)}>
                      See all notifications →
                    </Link>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="user-menu" ref={dropdownRef}>
                <button
                  className="user-trigger"
                  onClick={() => setDropdownOpen((p) => !p)}
                  aria-label="Account menu"
                >
                  <div className="user-avatar">{initials}</div>
                  <span className="user-name">{user.name?.split(' ')[0]}</span>
                  <ChevronDown size={16} className={`chevron ${dropdownOpen ? 'open' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="dropdown glass">
                    <div className="dropdown-header">
                      <p className="dropdown-name">{user.name}</p>
                      <p className="dropdown-email">{user.email}</p>
                      <span className="dropdown-role">{user.role}</span>
                    </div>
                    <div className="dropdown-divider" />
                    <Link href="/account" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <User size={15} /> My Account
                    </Link>
                    <Link href="/account?tab=bookings" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <Settings size={15} /> My Bookings
                    </Link>
                    <Link href="/kyc" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      🪪 KYC Verification
                    </Link>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                      <LogOut size={15} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">Log In</Link>
              <Link href="/signup" className="btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
