'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import './search.css';

const CATEGORIES = ['all', 'sports', 'cruiser', 'scooter', 'standard'];

export default function SearchPage() {
  const [bikes, setBikes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBikes = async () => {
      setLoading(true);
      setError('');
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) throw new Error('API URL not configured');
        const url =
          filter === 'all'
            ? `${baseUrl}/api/bikes`
            : `${baseUrl}/api/bikes?category=${filter}`;
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
  }, [filter]);

  return (
    <div className="container section search-page">
      <div className="search-header">
        <h1 className="heading-md">
          Find Your <span className="text-gradient">Perfect Ride</span>
        </h1>

        <div className="filter-bar glass">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat === 'all' ? 'All Bikes' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading bikes...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <p>⚠️ {error}</p>
        </div>
      )}

      {!loading && !error && bikes.length === 0 && (
        <div className="empty-state">
          <p>No bikes available in this category yet. Check back soon!</p>
        </div>
      )}

      {!loading && !error && bikes.length > 0 && (
        <div className="grid-container">
          {bikes.map((bike) => (
            <div key={bike._id} className="bike-card glass">
              <div className="bike-img-wrapper">
                {bike.images && bike.images.length > 0 ? (
                  <Image
                    src={bike.images[0]}
                    alt={`${bike.brand} ${bike.model}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="bike-img-placeholder">
                    <span>No Image</span>
                  </div>
                )}
              </div>
              <div className="bike-info">
                <span className="badge">{bike.category}</span>
                <h3>{bike.brand} {bike.model}</h3>
                <p className="bike-meta">{bike.year} · {bike.location}</p>
                <div className="bike-footer">
                  <span className="price">
                    ₹{bike.pricePerDay.toLocaleString('en-IN')}{' '}
                    <small>/day</small>
                  </span>
                  <button
                    className="btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
