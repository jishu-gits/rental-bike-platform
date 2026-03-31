'use client';
import { useState } from 'react';
import './search.css';

// Mock data to visualize UI state
const MOCK_BIKES = [
  { id: 1, brand: 'Ducati', model: 'Panigale V4', category: 'sports', price: 199 },
  { id: 2, brand: 'Harley-Davidson', model: 'Iron 883', category: 'cruiser', price: 120 },
  { id: 3, brand: 'BMW', model: 'R 1250 GS', category: 'standard', price: 160 },
  { id: 4, brand: 'Vespa', model: 'Primavera 150', category: 'scooter', price: 45 },
];

export default function SearchPage() {
  const [filter, setFilter] = useState('all');

  const filteredBikes = filter === 'all' ? MOCK_BIKES : MOCK_BIKES.filter(b => b.category === filter);

  return (
    <div className="container section search-page">
      <div className="search-header">
        <h1 className="heading-md">Find Your <span className="text-gradient">Perfect Ride</span></h1>
        
        <div className="filter-bar glass">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Bikes</button>
          <button className={`filter-btn ${filter === 'sports' ? 'active' : ''}`} onClick={() => setFilter('sports')}>Sports</button>
          <button className={`filter-btn ${filter === 'cruiser' ? 'active' : ''}`} onClick={() => setFilter('cruiser')}>Cruiser</button>
          <button className={`filter-btn ${filter === 'scooter' ? 'active' : ''}`} onClick={() => setFilter('scooter')}>Scooter</button>
        </div>
      </div>

      <div className="grid-container">
        {filteredBikes.map(bike => (
          <div key={bike.id} className="bike-card glass">
            <div className="bike-img-placeholder"></div>
            <div className="bike-info">
              <span className="badge">{bike.category}</span>
              <h3>{bike.brand} {bike.model}</h3>
              <div className="bike-footer">
                <span className="price">${bike.price} <small>/day</small></span>
                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Book Now</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
