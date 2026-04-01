import Link from 'next/link';
import '../static-page.css';

export const metadata = { title: 'Pricing — RidePulse', description: 'Transparent pricing for renters and bike providers on RidePulse.' };

export default function PricingPage() {
  return (
    <div className="static-page container section">
      <div className="static-hero">
        <p className="static-tag">Pricing</p>
        <h1>Simple, <span className="text-gradient">Transparent</span> Pricing</h1>
        <p className="static-lead">No hidden fees. Pay only for what you ride. Providers keep more of what they earn.</p>
      </div>

      <div className="pricing-grid">
        <div className="pricing-card glass">
          <div className="pricing-header">
            <span className="plan-label">For Renters</span>
            <h2>Pay Per Ride</h2>
            <p>You only pay the daily rate set by the provider. No subscription needed.</p>
          </div>
          <ul className="pricing-features">
            <li>✓ Starting from <strong>₹200/day</strong></li>
            <li>✓ Price set by individual providers</li>
            <li>✓ No booking fees from RidePulse</li>
            <li>✓ Basic insurance included</li>
            <li>✓ Cancel up to 24 hrs before for free</li>
          </ul>
          <Link href="/search" className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: '2rem' }}>Browse Bikes</Link>
        </div>

        <div className="pricing-card glass pricing-featured">
          <div className="featured-badge">Popular</div>
          <div className="pricing-header">
            <span className="plan-label">For Providers</span>
            <h2>List & Earn</h2>
            <p>List your bike for free. We take a small platform fee when you earn.</p>
          </div>
          <ul className="pricing-features">
            <li>✓ <strong>Free</strong> listing — always</li>
            <li>✓ Set your own daily price</li>
            <li>✓ 10% platform fee on each booking</li>
            <li>✓ Payout within 2 business days</li>
            <li>✓ Provider dashboard &amp; analytics</li>
          </ul>
          <Link href="/provider" className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: '2rem' }}>Start Listing</Link>
        </div>

        <div className="pricing-card glass">
          <div className="pricing-header">
            <span className="plan-label">Insurance Add-on</span>
            <h2>RideSafe Cover</h2>
            <p>Optional enhanced coverage for complete peace of mind on every ride.</p>
          </div>
          <ul className="pricing-features">
            <li>✓ <strong>₹99/day</strong> add-on</li>
            <li>✓ Third-party damage cover</li>
            <li>✓ Personal accident cover</li>
            <li>✓ 24/7 roadside assistance</li>
            <li>✓ Zero excess on claims</li>
          </ul>
          <Link href="/insurance" className="btn-secondary" style={{ display: 'block', textAlign: 'center', marginTop: '2rem' }}>Learn More</Link>
        </div>
      </div>

      <div className="pricing-faq glass">
        <h2>Common Questions</h2>
        <div className="faq-list">
          {[
            { q: 'Are there any joining fees?', a: 'No. Signing up is completely free for both renters and providers.' },
            { q: 'When do providers get paid?', a: 'Providers receive their payout (minus the 10% platform fee) within 2 business days of a completed booking.' },
            { q: 'What if a booking is cancelled?', a: 'Renters can cancel up to 24 hours before the start date for a full refund. Cancellations within 24 hours are subject to a 50% charge.' },
            { q: 'Is GST included in prices?', a: 'All prices shown include applicable GST. No surprise charges at checkout.' },
          ].map((f, i) => (
            <div key={i} className="faq-item">
              <h4>{f.q}</h4>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
