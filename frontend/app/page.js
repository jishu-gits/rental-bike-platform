'use client';
import Link from 'next/link';
import { useState } from 'react';
import './home.css';

export default function Home() {
  const [activeAudience, setActiveAudience] = useState('renter');

  const steps = {
    renter: [
      {
        num: '01',
        icon: '🪪',
        title: 'Verify Identity',
        body: 'Create a free account and upload your driving licence. Our team verifies your identity within minutes to ensure a safe community for everyone.',
      },
      {
        num: '02',
        icon: '🏍️',
        title: 'Book Your Ride',
        body: 'Browse hundreds of premium bikes near you. Filter by category, set your dates, and confirm instantly. All prices in INR — no hidden charges.',
      },
      {
        num: '03',
        icon: '🛣️',
        title: 'Hit the Road',
        body: 'Meet the provider at the agreed location, pick up your bike, and ride. Basic insurance is included on every booking — RideSafe cover optional.',
      },
    ],
    provider: [
      {
        num: '01',
        icon: '📋',
        title: 'List Your Bike',
        body: 'Sign up and upgrade to a Provider account for free. Upload your bike details, set your daily rate in ₹, and go live in under 5 minutes.',
      },
      {
        num: '02',
        icon: '✅',
        title: 'Get Verified',
        body: 'Upload your registration certificate and government ID for one-time verification. This builds trust with renters and unlocks all provider features.',
      },
      {
        num: '03',
        icon: '💰',
        title: 'Earn on Your Terms',
        body: 'Receive booking requests, manage availability from your dashboard, and get paid within 2 business days. You keep 90% of every booking.',
      },
    ],
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="heading-lg">
            Experience the <br />
            <span className="text-gradient">Ultimate Ride</span>
          </h1>
          <p className="hero-subtitle">
            Rent high-end motorcycles from local enthusiasts or earn by listing your own bike.
            Verified riders, premium bikes, unforgettable journeys.
          </p>
          <div className="hero-actions">
            <Link href="/search" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Find a Bike
            </Link>
            <Link href="/provider" className="btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              List Your Bike
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="glass hero-card">
            <div className="card-image placeholder-img"></div>
            <div className="card-details">
              <h3>Royal Enfield Thunderbird</h3>
              <p className="price"><span className="text-gradient">₹800</span> / day</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container section how-it-works">
        <h2 className="heading-md" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          How <span className="text-gradient">RidePulse</span> Works
        </h2>
        <p className="how-subtitle">Whether you're renting a bike or listing yours — we've made it simple.</p>

        {/* Audience Toggle */}
        <div className="audience-toggle">
          <button
            className={`toggle-btn ${activeAudience === 'renter' ? 'active' : ''}`}
            onClick={() => setActiveAudience('renter')}
          >
            🏍️ I want to rent a bike
          </button>
          <button
            className={`toggle-btn ${activeAudience === 'provider' ? 'active' : ''}`}
            onClick={() => setActiveAudience('provider')}
          >
            💰 I want to list my bike
          </button>
        </div>

        <div className="features-grid">
          {steps[activeAudience].map((step) => (
            <div key={step.num} className="feature-item glass">
              <div className="feature-emoji">{step.icon}</div>
              <div className="feature-icon text-gradient">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          {activeAudience === 'renter' ? (
            <Link href="/search" className="btn-primary" style={{ padding: '0.9rem 2.5rem' }}>Browse Bikes Now</Link>
          ) : (
            <Link href="/provider" className="btn-primary" style={{ padding: '0.9rem 2.5rem' }}>Start Listing Free</Link>
          )}
        </div>
      </section>

      {/* Stats Strip */}
      <section className="stats-strip glass">
        <div className="container stats-inner">
          <div className="stat"><span className="stat-num text-gradient">500+</span><span>Bikes Listed</span></div>
          <div className="stat"><span className="stat-num text-gradient">10,000+</span><span>Happy Riders</span></div>
          <div className="stat"><span className="stat-num text-gradient">₹200</span><span>Starting per Day</span></div>
          <div className="stat"><span className="stat-num text-gradient">50+</span><span>Cities</span></div>
        </div>
      </section>
    </div>
  );
}
