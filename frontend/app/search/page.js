'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Calendar, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './search.css';

const CATEGORIES = ['all', 'sports', 'cruiser', 'scooter', 'standard'];
const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function SearchPage() {
  const [bikes, setBikes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking modal state
  const [selectedBike, setSelectedBike] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bookingStatus, setBookingStatus] = useState(null); // 'success' | 'error' | null
  const [bookingMsg, setBookingMsg] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const fetchBikes = async () => {
      setLoading(true);
      setError('');
      try {
        if (!API) throw new Error('API URL not configured');
        const url =
          filter === 'all' ? `${API}/api/bikes` : `${API}/api/bikes?category=${filter}`;
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

  // Calculate number of days and total cost
  const calcDays = () => {
    if (!startDate || !endDate) return 0;
    const diff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : 0;
  };
  const days = calcDays();
  const totalCost = selectedBike ? days * selectedBike.pricePerDay : 0;

  const openModal = (bike) => {
    setSelectedBike(bike);
    setStartDate('');
    setEndDate('');
    setBookingStatus(null);
    setBookingMsg('');
  };

  const closeModal = () => {
    setSelectedBike(null);
    setBookingStatus(null);
  };

  const handleBook = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setBookingStatus('error');
      setBookingMsg('You must be logged in to book a bike.');
      return;
    }
    if (days <= 0) {
      setBookingStatus('error');
      setBookingMsg('Please select valid start and end dates.');
      return;
    }

    setBookingLoading(true);
    setBookingStatus(null);

    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bikeId: selectedBike._id,
          startDate,
          endDate,
          totalCost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking failed');
      setBookingStatus('success');
      setBookingMsg(`Booking confirmed! ₹${totalCost.toLocaleString('en-IN')} for ${days} day${days > 1 ? 's' : ''}.`);
    } catch (err) {
      setBookingStatus('error');
      setBookingMsg(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Min date = today
  const today = new Date().toISOString().split('T')[0];

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
      {error && !loading && <div className="error-state"><p>⚠️ {error}</p></div>}
      {!loading && !error && bikes.length === 0 && (
        <div className="empty-state"><p>No bikes available in this category yet. Check back soon!</p></div>
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
                  <div className="bike-img-placeholder"><span>No Image</span></div>
                )}
              </div>
              <div className="bike-info">
                <span className="badge">{bike.category}</span>
                <h3>{bike.brand} {bike.model}</h3>
                <p className="bike-meta">{bike.year} · {bike.location}</p>
                <div className="bike-footer">
                  <span className="price">
                    ₹{bike.pricePerDay.toLocaleString('en-IN')} <small>/day</small>
                  </span>
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

      {/* ── BOOKING MODAL ── */}
      {selectedBike && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}><X size={20} /></button>

            <div className="modal-bike-header">
              {selectedBike.images && selectedBike.images[0] && (
                <div className="modal-img-wrapper">
                  <Image src={selectedBike.images[0]} alt={selectedBike.brand} fill style={{ objectFit: 'cover' }} />
                </div>
              )}
              <div>
                <span className="badge">{selectedBike.category}</span>
                <h2>{selectedBike.brand} {selectedBike.model}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {selectedBike.year} · {selectedBike.location}
                </p>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.5rem' }}>
                  ₹{selectedBike.pricePerDay.toLocaleString('en-IN')}<small style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>/day</small>
                </p>
              </div>
            </div>

            {bookingStatus !== 'success' && (
              <>
                <div className="modal-dates">
                  <div className="date-group">
                    <label><Calendar size={14} /> Start Date</label>
                    <input
                      type="date"
                      min={today}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <div className="date-group">
                    <label><Calendar size={14} /> End Date</label>
                    <input
                      type="date"
                      min={startDate || today}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                </div>

                {days > 0 && (
                  <div className="cost-summary">
                    <span>{days} day{days > 1 ? 's' : ''} × ₹{selectedBike.pricePerDay.toLocaleString('en-IN')}</span>
                    <span className="total-cost">₹{totalCost.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {bookingStatus === 'error' && (
                  <div className="booking-alert booking-error">
                    <AlertCircle size={16} /> {bookingMsg}
                  </div>
                )}

                <button
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.9rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={handleBook}
                  disabled={bookingLoading || days <= 0}
                >
                  {bookingLoading ? <><Loader size={16} className="animate-spin" /> Booking...</> : `Confirm Booking · ₹${totalCost.toLocaleString('en-IN')}`}
                </button>
              </>
            )}

            {bookingStatus === 'success' && (
              <div className="booking-success">
                <CheckCircle size={48} className="success-icon" />
                <h3>Booking Confirmed!</h3>
                <p>{bookingMsg}</p>
                <button className="btn-secondary" style={{ marginTop: '1.5rem' }} onClick={closeModal}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
