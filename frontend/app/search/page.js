'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, Zap } from 'lucide-react';
import BookingModal from '../components/BookingModal';
import './search.css';

const CATEGORIES = ['all', 'sports', 'cruiser', 'scooter', 'standard', 'electric'];
const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function SearchPage() {
  const [bikes, setBikes]           = useState([]);
  const [filter, setFilter]         = useState('all');
  const [cities, setCities]         = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [fuelType, setFuelType]     = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [selectedBike, setSelectedBike] = useState(null);
  const [isGuest, setIsGuest]       = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestTargetBike, setGuestTargetBike] = useState(null);

  // Load saved city from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedCity');
    if (saved) setSelectedCity(saved);

    const token = localStorage.getItem('token');
    setIsGuest(!token);

    // Fetch cities
    fetch(`${API}/api/bikes/cities`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) ? setCities(d) : [])
      .catch(() => {});
  }, []);

  // Persist city selection
  useEffect(() => {
    if (selectedCity) localStorage.setItem('selectedCity', selectedCity);
    else localStorage.removeItem('selectedCity');
  }, [selectedCity]);

  // Check URL params for fuelType
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fuelType')) setFuelType(params.get('fuelType'));
    if (params.get('category')) setFilter(params.get('category'));
  }, []);

  useEffect(() => {
    const fetchBikes = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('category', filter);
        if (selectedCity)     params.set('city', selectedCity);
        if (fuelType)         params.set('fuelType', fuelType);

        const url = `${API}/api/bikes${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load bikes');
        const data = await res.json();
        setBikes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBikes();
  }, [filter, selectedCity, fuelType]);

  const openModal = (bike) => {
    if (isGuest) { setGuestTargetBike(bike); setShowGuestModal(true); return; }
    setSelectedBike(bike);
  };

  const renderStars = (avg, count) => (
    <div className="bike-rating">
      <Star size={13} fill="#f59e0b" color="#f59e0b" />
      <span>{avg ? avg.toFixed(1) : '—'}</span>
      {count > 0 && <span className="review-count">({count})</span>}
    </div>
  );

  return (
    <div className="container section search-page">
      <div className="search-header">
        <h1 className="heading-md">Find Your <span className="text-gradient">Perfect Ride</span></h1>

        {/* City Selector */}
        {cities.length > 0 && (
          <div className="city-selector">
            <select
              className="city-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">📍 All Cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {selectedCity && (
              <button className="clear-city" onClick={() => setSelectedCity('')}>✕ Clear</button>
            )}
          </div>
        )}

        {/* Category Filters */}
        <div className="filter-bar glass">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => { setFilter(cat); if (cat === 'electric') setFuelType('electric'); else setFuelType(''); }}
            >
              {cat === 'electric' ? <><Zap size={13} /> Electric</> : cat === 'all' ? 'All Bikes' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="loading-state"><div className="spinner" /><p>Loading bikes...</p></div>}
      {error && !loading && <div className="error-state"><p>⚠️ {error}</p></div>}
      {!loading && !error && bikes.length === 0 && (
        <div className="empty-state"><p>No bikes found. Try changing your filters.</p></div>
      )}

      {!loading && !error && bikes.length > 0 && (
        <div className="grid-container">
          {bikes.map((bike) => (
            <div key={bike._id} className="bike-card glass">
              <div className="bike-img-wrapper">
                {bike.images?.length > 0 ? (
                  <Image src={bike.images[0]} alt={`${bike.brand} ${bike.model}`} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 33vw" />
                ) : (
                  <div className="bike-img-placeholder"><span>No Image</span></div>
                )}
                {bike.fuelType === 'electric' && (
                  <span className="ev-card-badge"><Zap size={11} /> EV</span>
                )}
              </div>
              <div className="bike-info">
                <span className="badge">{bike.category}</span>
                <h3>{bike.brand} {bike.model}</h3>
                <p className="bike-meta">{bike.year} · {bike.city || bike.location}</p>
                {renderStars(bike.averageRating, bike.reviewCount)}
                <div className="bike-footer">
                  <span className="price">₹{bike.pricePerDay.toLocaleString('en-IN')} <small>/day</small></span>
                  <button
                    className="btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                    onClick={() => openModal(bike)}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedBike && (
        <BookingModal bike={selectedBike} onClose={() => setSelectedBike(null)} onSuccess={() => setSelectedBike(null)} />
      )}

      {/* Guest Sign-In Modal */}
      {showGuestModal && (
        <div className="modal-overlay" onClick={() => setShowGuestModal(false)}>
          <div className="modal-card glass" style={{ maxWidth: 400, padding: '2.5rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem' }}>Sign In to Book</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Create a free account or log in to book {guestTargetBike?.brand} {guestTargetBike?.model}.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <a href="/login" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Log In</a>
              <a href="/signup" className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>Register</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
