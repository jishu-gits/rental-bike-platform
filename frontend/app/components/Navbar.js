'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import './navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'nav-scrolled glass' : ''}`}>
      <div className="container nav-content">
        <Link href="/" className="logo">
          Ride<span className="text-gradient">Pulse</span>
        </Link>
        <div className="nav-links">
          <Link href="/search" className="nav-item">Browse Bikes</Link>
          <Link href="/provider" className="nav-item">List Your Bike</Link>
        </div>
        <div className="nav-auth">
          <Link href="/login" className="btn-secondary">Log In</Link>
          <Link href="/signup" className="btn-primary">Sign Up</Link>
        </div>
      </div>
    </nav>
  );
}
