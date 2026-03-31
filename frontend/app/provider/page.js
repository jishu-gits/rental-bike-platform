'use client';
import { useState } from 'react';
import './provider.css';

export default function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container section provider-page">
      <div className="dashboard-header">
        <h1 className="heading-md">Provider <span className="text-gradient">Dashboard</span></h1>
        <p>Manage your bikes, track earnings, and complete verifications.</p>
      </div>

      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="dashboard-sidebar glass">
          <button className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`nav-btn ${activeTab === 'bikes' ? 'active' : ''}`} onClick={() => setActiveTab('bikes')}>My Bikes</button>
          <button className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>Add New Bike</button>
          <button className={`nav-btn ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')}>Verification</button>
        </aside>

        {/* Content Area */}
        <div className="dashboard-content glass">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <h2>Welcome back, Provider!</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Earnings</h3>
                  <p className="text-gradient stat-value">$1,250</p>
                </div>
                <div className="stat-card">
                  <h3>Active Rentals</h3>
                  <p className="text-gradient stat-value">3</p>
                </div>
                <div className="stat-card">
                  <h3>Total Bikes</h3>
                  <p className="text-gradient stat-value">5</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="add-bike-tab form-container">
              <h2>List a New Bike</h2>
              <form className="bike-form">
                <div className="form-group">
                  <label>Brand</label>
                  <input type="text" placeholder="e.g. Ducati, BMW" className="input-field" />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input type="text" placeholder="e.g. Panigale V4" className="input-field" />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="input-field">
                    <option value="sports">Sports</option>
                    <option value="cruiser">Cruiser</option>
                    <option value="scooter">Scooter</option>
                    <option value="standard">Standard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price Per Day ($)</label>
                  <input type="number" placeholder="99" className="input-field" />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Submit Listing</button>
              </form>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="verification-tab form-container">
              <h2>Identity Verification</h2>
              <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                Please upload your government-issued ID to get verified and start renting out your bikes safely.
              </p>
              <div className="upload-box">
                <p>Drag & Drop your ID document here</p>
                <button className="btn-secondary" style={{ marginTop: '1rem' }}>Browse Files</button>
              </div>
              <button className="btn-primary" style={{ marginTop: '2rem' }}>Request Verification</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
