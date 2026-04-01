'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './provider.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState('add');
  const [myBikes, setMyBikes] = useState([]);
  const [bikesLoading, setBikesLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    category: 'sports',
    pricePerDay: '',
    location: '',
  });
  const [images, setImages] = useState([]); // File objects
  const [imagePreviews, setImagePreviews] = useState([]); // Data URLs for preview
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [submitMsg, setSubmitMsg] = useState('');
  const fileInputRef = useRef(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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

  useEffect(() => {
    if (activeTab === 'bikes') fetchMyBikes();
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

      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="dashboard-sidebar glass">
          <button className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
            List a Bike
          </button>
          <button className={`nav-btn ${activeTab === 'bikes' ? 'active' : ''}`} onClick={() => setActiveTab('bikes')}>
            My Listings
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
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price Per Day (₹) *</label>
                    <input
                      type="number" name="pricePerDay" className="form-input"
                      placeholder="e.g. 800"
                      min="1"
                      value={formData.pricePerDay} onChange={handleChange} required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <input
                      type="text" name="location" className="form-input"
                      placeholder="e.g. Mumbai, Maharashtra"
                      value={formData.location} onChange={handleChange} required
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
        </div>
      </div>
    </div>
  );
}
