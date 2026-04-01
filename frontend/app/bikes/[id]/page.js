'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Star, MapPin, Calendar, Zap, ArrowLeft } from 'lucide-react';
import BookingModal from '../../components/BookingModal';
import './bike-detail.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function BikeDetailPage() {
  const { id } = useParams();
  const [bike, setBike] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBike, setSelectedBike] = useState(null);

  useEffect(() => {
    const fetchBike = async () => {
      try {
        const res = await fetch(`${API}/api/bikes/${id}`);
        if (!res.ok) throw new Error('Bike not found');
        const bikeData = await res.json();
        setBike(bikeData);

        // Fetch reviews
        const reviewsRes = await fetch(`${API}/api/reviews/bike/${id}`);
        const reviewsData = await reviewsRes.json();
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchBike();
  }, [id]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        fill={i < rating ? '#f59e0b' : 'none'}
        color={i < rating ? '#f59e0b' : '#d1d5db'}
      />
    ));
  };

  if (loading) {
    return (
      <div className="bike-detail-page container section">
        <div className="loading-state"><div className="spinner" /><p>Loading bike details...</p></div>
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="bike-detail-page container section">
        <div className="error-state">
          <p>⚠️ {error || 'Bike not found'}</p>
          <a href="/search" className="btn-primary">Back to Search</a>
        </div>
      </div>
    );
  }

  return (
    <div className="bike-detail-page container section">
      {/* Back Button */}
      <div className="back-button">
        <a href="/search" className="back-link">
          <ArrowLeft size={16} /> Back to Search
        </a>
      </div>

      <div className="bike-detail-content">
        {/* Image Gallery */}
        <div className="bike-gallery">
          {bike.images?.length > 0 ? (
            <div className="main-image">
              <Image
                src={bike.images[0]}
                alt={`${bike.brand} ${bike.model}`}
                fill
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
          ) : (
            <div className="main-image placeholder">
              <span>No Image Available</span>
            </div>
          )}
          {bike.images?.length > 1 && (
            <div className="thumbnail-grid">
              {bike.images.slice(1).map((img, i) => (
                <div key={i} className="thumbnail">
                  <Image src={img} alt={`View ${i + 2}`} fill style={{ objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bike Info */}
        <div className="bike-info-section">
          <div className="bike-header">
            <div>
              <span className="badge">{bike.category}</span>
              {bike.fuelType === 'electric' && <span className="badge ev-badge"><Zap size={11} /> EV</span>}
              <h1>{bike.brand} {bike.model}</h1>
              <p className="bike-meta">{bike.year} · {bike.city || bike.location}</p>
              {bike.averageRating > 0 && (
                <div className="rating-display">
                  {renderStars(Math.round(bike.averageRating))}
                  <span className="rating-text">{bike.averageRating.toFixed(1)} ({bike.reviewCount} reviews)</span>
                </div>
              )}
            </div>
            <div className="price-section">
              <p className="price">₹{bike.pricePerDay.toLocaleString('en-IN')}<small>/day</small></p>
              <button
                className="btn-primary book-btn"
                onClick={() => setSelectedBike(bike)}
              >
                Book Now
              </button>
            </div>
          </div>

          {/* Specs */}
          <div className="bike-specs">
            <h3>Specifications</h3>
            <div className="specs-grid">
              <div className="spec-item">
                <span className="spec-label">Brand</span>
                <span className="spec-value">{bike.brand}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Model</span>
                <span className="spec-value">{bike.model}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Year</span>
                <span className="spec-value">{bike.year}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Category</span>
                <span className="spec-value">{bike.category}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Fuel Type</span>
                <span className="spec-value">{bike.fuelType}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Location</span>
                <span className="spec-value">{bike.city}, {bike.state}</span>
              </div>
            </div>
          </div>

          {/* Provider Info */}
          <div className="provider-info">
            <h3>Listed by</h3>
            <div className="provider-card">
              <div className="provider-avatar">
                {bike.providerId?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="provider-name">{bike.providerId?.name}</p>
                <p className="provider-meta">Verified Provider</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <div className="reviews-section">
          <h2>Reviews ({reviews.length})</h2>
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <div className="reviewer-info">
                    <div className="reviewer-avatar">
                      {review.reviewerId?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="reviewer-name">{review.reviewerId?.name}</p>
                      <div className="review-rating">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>
                  <span className="review-date">
                    {new Date(review.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p className="review-comment">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedBike && (
        <BookingModal bike={selectedBike} onClose={() => setSelectedBike(null)} onSuccess={() => setSelectedBike(null)} />
      )}
    </div>
  );
}