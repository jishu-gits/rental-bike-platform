import Link from 'next/link';
import './home.css';

export default function Home() {
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
            <div className="card-image placeholder-img">
              {/* Note: Use a stunning real bike image here */}
            </div>
            <div className="card-details">
              <h3>Ducati Panigale V4</h3>
              <p className="price"><span className="text-gradient">$199</span> / day</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container section">
        <h2 className="heading-md" style={{ textAlign: 'center', marginBottom: '4rem' }}>How RidePulse Works</h2>
        <div className="features-grid">
          <div className="feature-item glass">
            <div className="feature-icon text-gradient">01</div>
            <h3>Verify Identity</h3>
            <p>Upload your ID and get approved within minutes to ensure a safe community.</p>
          </div>
          <div className="feature-item glass">
            <div className="feature-icon text-gradient">02</div>
            <h3>Book Your Ride</h3>
            <p>Browse premium bikes in your area and book instantly with secure payments.</p>
          </div>
          <div className="feature-item glass">
            <div className="feature-icon text-gradient">03</div>
            <h3>Hit the Road</h3>
            <p>Pick up the bike from the owner and enjoy your journey with full insurance coverage.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
