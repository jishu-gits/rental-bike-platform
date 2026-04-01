import Link from 'next/link';
import '../static-page.css';

export const metadata = { title: 'Insurance — RidePulse', description: 'Learn about insurance coverage on RidePulse bike rentals.' };

export default function InsurancePage() {
  return (
    <div className="static-page container section">
      <div className="static-hero">
        <p className="static-tag">Insurance</p>
        <h1>Ride with <span className="text-gradient">Confidence</span></h1>
        <p className="static-lead">Every booking on RidePulse includes basic coverage. Upgrade to RideSafe for complete peace of mind.</p>
      </div>

      {/* Coverage Cards */}
      <div className="insurance-grid">
        <div className="insurance-card glass">
          <div className="insurance-card-header">
            <span className="plan-label">Included Free</span>
            <h2>Basic Cover</h2>
          </div>
          <ul className="pricing-features">
            <li>✓ Third-party liability (up to ₹5 lakh)</li>
            <li>✓ Theft protection (60% of bike value)</li>
            <li>✓ 24/7 emergency helpline</li>
            <li>✗ Personal accident cover</li>
            <li>✗ Roadside assistance</li>
            <li>✗ Zero excess on claims</li>
          </ul>
        </div>

        <div className="insurance-card glass insurance-featured">
          <div className="featured-badge">Recommended</div>
          <div className="insurance-card-header">
            <span className="plan-label">Add-on · ₹99/day</span>
            <h2>RideSafe Cover</h2>
          </div>
          <ul className="pricing-features">
            <li>✓ Everything in Basic</li>
            <li>✓ Personal accident cover (up to ₹10 lakh)</li>
            <li>✓ 24/7 roadside assistance</li>
            <li>✓ <strong>Zero excess</strong> on all claims</li>
            <li>✓ Helmet & gear damage cover</li>
            <li>✓ Medical expenses up to ₹2 lakh</li>
          </ul>
          <p className="insurance-note">Add RideSafe during booking checkout.</p>
        </div>
      </div>

      {/* How Claims Work */}
      <div className="legal-body glass" style={{ marginTop: '3rem' }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>How Claims Work</h3>
        <div className="claim-steps">
          {[
            { step: '01', title: 'Report Immediately', body: 'In case of an accident or theft, call our 24/7 helpline at 1800-RIDEPULSE within 2 hours of the incident.' },
            { step: '02', title: 'Document the Incident', body: 'Take photos of the scene, any damage, and obtain a police FIR reference number if applicable.' },
            { step: '03', title: 'Submit Your Claim', body: 'Fill out the online claim form in your account dashboard. Attach photos and FIR number. Expected resolution: 5-7 working days.' },
            { step: '04', title: 'Receive Settlement', body: 'Approved claims are settled directly to your bank account within 48 hours of approval.' },
          ].map((c) => (
            <div key={c.step} className="claim-step">
              <div className="claim-number text-gradient">{c.step}</div>
              <div>
                <h4>{c.title}</h4>
                <p>{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="insurance-cta glass">
        <h2>Ready to ride safely?</h2>
        <p>Browse available bikes and add RideSafe at checkout for just ₹99/day.</p>
        <Link href="/search" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block', padding: '0.85rem 2.5rem' }}>
          Browse Bikes
        </Link>
      </div>
    </div>
  );
}
