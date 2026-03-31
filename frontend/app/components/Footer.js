import React from 'react';
import Link from 'next/link';
import './footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h2 className="logo">Ride<span className="text-gradient">Pulse</span></h2>
            <p>Premium bike rentals directly from verified local providers. Experience the ride you deserve.</p>
          </div>
          <div className="footer-links">
            <h3>Platform</h3>
            <ul>
              <li><Link href="/search">Browse Bikes</Link></li>
              <li><Link href="/provider">List Your Bike</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h3>Legal</h3>
            <ul>
              <li><Link href="#">Terms of Service</Link></li>
              <li><Link href="#">Privacy Policy</Link></li>
              <li><Link href="#">Insurance</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} RidePulse Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
