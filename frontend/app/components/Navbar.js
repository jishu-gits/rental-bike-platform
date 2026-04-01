'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { User, ChevronDown, LogOut, Settings } from 'lucide-react';
import './navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(stored);
    } catch {}

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          {user ? (
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
                  <div className="dropdown-divider" />
                  <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              )}
            </div>
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
