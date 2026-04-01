'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X, CheckCircle, AlertCircle, Loader, ShieldCheck } from 'lucide-react';
import './provider.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState('add');
  const [myBikes, setMyBikes] = useState([]);
  const [bikesLoading, setBikesLoading] = useState(false);
  const [providerBookings, setProviderBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [userRole, setUserRole] = useState('customer');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    category: 'sports',
    fuelType: 'petrol',
    pricePerDay: '',
    location: '',
    city: '',
    state: '',
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMsg, setSubmitMsg] = useState('');
  const fileInputRef = useRef(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Read role from stored user object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        if (stored.role) setUserRole(stored.role);
      } catch {}
    }
  }, []);

  // Upgrade to provider
  const becomeProvider = async () => {
    setUpgrading(true);
    setUpgradeError('');
    try {
      const res = await fetch(`${API}/api/auth/become-provider`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upgrade');
      // Refresh token and user in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUserRole('provider');
    } catch (err) {
      setUpgradeError(err.message);
    } finally {
      setUpgrading(false);
    }
  };

  // Fetch provider's own bikes
  const fetchMyBikes = async () => {
    setBikesLoading(true);
    try {
      const res = await fetch(`${API}/api/bikes/my-bikes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setMyBikes(data);
    } catch {}
    finally { setBikesLoading(false); }
  };

  // Fetch provider's bookings
  const fetchProviderBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await fetch(`${API}/api/bookings/provider`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setProviderBookings(data);
    } catch {}
    finally { setBookingsLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'bikes') fetchMyBikes();
    if (activeTab === 'bookings') fetchProviderBookings();
  }, [activeTab]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      alert('You can upload a maximum of 5 images.');
      return;
    }
    setImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews((prev) => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const body = new FormData();
      Object.entries(formData).forEach(([k, v]) => body.append(k, v));
      images.forEach((img) => body.append('images', img));

      const res = await fetch(`${API}/api/bikes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to list bike');

      setSubmitStatus('success');
      setSubmitMsg('Your bike has been listed successfully!');
      // Reset form
      setFormData({ brand: '', model: '', year: '', category: 'sports', pricePerDay: '', location: '' });
      setImages([]);
      setImagePreviews([]);
    } catch (err) {
      setSubmitStatus('error');
      setSubmitMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container section provider-page">
      <div className="dashboard-header">
        <h1 className="heading-md">
          Provider <span className="text-gradient">Dashboard</span>
        </h1>
        <p>List your bikes, track your listings, and manage availability.</p>
      </div>

      {/* ── PROVIDER GATE ── */}
      {userRole !== 'provider' && (
        <div className="provider-gate glass">
          <ShieldCheck size={52} className="gate-icon" />
          <h2>Become a Bike Provider</h2>
          <p>
            Your account is currently registered as a <strong>customer</strong>.
            Upgrade to a provider account to list bikes and earn on RidePulse. This is free and instant.
          </p>
          {upgradeError && (
            <div className="alert alert-error" style={{ marginTop: '1rem' }}>
              <AlertCircle size={16} /> {upgradeError}
            </div>
          )}
          <button
            className="btn-primary"
            style={{ marginTop: '1.5rem', padding: '0.9rem 2.5rem' }}
            onClick={becomeProvider}
            disabled={upgrading}
          >
            {upgrading ? <><Loader size={16} className="animate-spin" /> Upgrading...</> : 'Become a Provider — It\'s Free'}
          </button>
        </div>
      )}

      {/* ── MAIN DASHBOARD (only if provider) ── */}
      {userRole === 'provider' && (
      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="dashboard-sidebar glass">
          <button className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
            List a Bike
          </button>
          <button className={`nav-btn ${activeTab === 'bikes' ? 'active' : ''}`} onClick={() => setActiveTab('bikes')}>
            My Listings
          </button>
          <button className={`nav-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
            Bookings
          </button>
        </aside>

        {/* Content Area */}
        <div className="dashboard-content glass">

          {/* ── ADD BIKE TAB ── */}
          {activeTab === 'add' && (
            <div className="add-bike-tab">
              <h2>List a New Bike</h2>
              <p className="tab-subtitle">Fill in the details below and upload photos to attract renters.</p>

              {submitStatus === 'success' && (
                <div className="alert alert-success">
                  <CheckCircle size={18} /> {submitMsg}
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="alert alert-error">
                  <AlertCircle size={18} /> {submitMsg}
                </div>
              )}

              <form className="bike-form" onSubmit={handleSubmit} encType="multipart/form-data">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Brand *</label>
                    <input
                      type="text" name="brand" className="form-input"
                      placeholder="e.g. Royal Enfield, Bajaj"
                      value={formData.brand} onChange={handleChange} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model *</label>
                    <input
                      type="text" name="model" className="form-input"
                      placeholder="e.g. Thunderbird 350"
                      value={formData.model} onChange={handleChange} required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Year *</label>
                    <input
                      type="number" name="year" className="form-input"
                      placeholder="e.g. 2022"
                      min="1990" max={new Date().getFullYear()}
                      value={formData.year} onChange={handleChange} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select name="category" className="form-input" value={formData.category} onChange={handleChange} required>
                      <option value="sports">Sports</option>
                      <option value="cruiser">Cruiser</option>
                      <option value="scooter">Scooter</option>
                      <option value="standard">Standard</option>
                      <option value="electric">Electric</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fuel Type *</label>
                    <select name="fuelType" className="form-input" value={formData.fuelType} onChange={handleChange} required>
                      <option value="petrol">Petrol</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price Per Day (₹) *</label>
                    <input
                      type="number" name="pricePerDay" className="form-input"
                      placeholder="e.g. 800"
                      min="1"
                      value={formData.pricePerDay} onChange={handleChange} required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <input
                      type="text" name="location" className="form-input"
                      placeholder="e.g. Mumbai, Maharashtra"
                      value={formData.location} onChange={handleChange} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text" name="city" className="form-input"
                      placeholder="e.g. Mumbai"
                      value={formData.city} onChange={handleChange} required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      type="text" name="state" className="form-input"
                      placeholder="e.g. Maharashtra"
                      value={formData.state} onChange={handleChange} required
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div className="form-group">
                  <label className="form-label">Photos (up to 5)</label>
                  <div
                    className="upload-zone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={32} className="upload-icon" />
                    <p>Click to upload or drag & drop</p>
                    <span>JPG, PNG, WEBP · Max 5 images</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="image-previews">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="preview-wrapper">
                        <Image src={src} alt={`Preview ${i + 1}`} fill style={{ objectFit: 'cover' }} />
                        <button type="button" className="remove-img" onClick={() => removeImage(i)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" className="btn-primary btn-submit" disabled={submitting}>
                  {submitting ? <><Loader size={18} className="animate-spin" /> Listing...</> : 'Submit Listing'}
                </button>
              </form>
            </div>
          )}

          {/* ── MY BIKES TAB ── */}
          {activeTab === 'bikes' && (
            <div className="my-bikes-tab">
              <h2>My Listings</h2>
              {bikesLoading && <p className="tab-subtitle">Loading your bikes...</p>}
              {!bikesLoading && myBikes.length === 0 && (
                <p className="tab-subtitle">You haven't listed any bikes yet. Go to "List a Bike" to get started.</p>
              )}
              <div className="my-bikes-grid">
                {myBikes.map((bike) => (
                  <div key={bike._id} className="my-bike-card glass">
                    <div className="my-bike-img">
                      {bike.images && bike.images[0] ? (
                        <Image src={bike.images[0]} alt={`${bike.brand} ${bike.model}`} fill style={{ objectFit: 'cover' }} />
                      ) : (
                        <div className="bike-img-placeholder"><span>No Image</span></div>
                      )}
                    </div>
                    <div className="my-bike-info">
                      <span className="badge">{bike.category}</span>
                      <h3>{bike.brand} {bike.model} ({bike.year})</h3>
                      <p>₹{bike.pricePerDay.toLocaleString('en-IN')}/day · {bike.location}</p>
                      <p className={`availability-tag ${bike.isAvailable ? 'available' : 'unavailable'}`}>
                        {bike.isAvailable ? '● Available' : '● Unavailable'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BOOKINGS TAB ── */}
          {activeTab === 'bookings' && (
            <div className="bookings-tab">
              <h2>Bookings on My Bikes</h2>
              {bookingsLoading && <p className="tab-subtitle">Loading bookings...</p>}
              {!bookingsLoading && providerBookings.length === 0 && (
                <p className="tab-subtitle">No bookings yet. Your bikes will start appearing here once rented.</p>
              )}
              <div className="provider-bookings-list">
                {providerBookings.map((b) => (
                  <div key={b._id} className="provider-booking-card glass">
                    <div className="booking-header">
                      <h3>{b.bikeId?.brand} {b.bikeId?.model}</h3>
                      <span className={`status-badge status-${b.status}`}>{b.status}</span>
                    </div>
                    <div className="booking-details">
                      <p><strong>Renter:</strong> {b.customerId?.name} ({b.customerId?.email})</p>
                      <p><strong>Dates:</strong> {new Date(b.startDate).toLocaleDateString('en-IN')} → {new Date(b.endDate).toLocaleDateString('en-IN')}</p>
                      {b.planType && <p><strong>Plan:</strong> {b.planType.charAt(0).toUpperCase() + b.planType.slice(1)}</p>}
                      {b.deliveryType === 'doorstep' && (
                        <p><strong>Delivery:</strong> {b.deliveryAddress?.street}, {b.deliveryAddress?.city}, {b.deliveryAddress?.pincode} at {b.deliverySlot}</p>
                      )}
                      <p><strong>Total:</strong> ₹{b.totalCost?.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
