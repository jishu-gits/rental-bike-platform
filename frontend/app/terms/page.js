import '../static-page.css';

export const metadata = { title: 'Terms of Service — RidePulse', description: 'Read the RidePulse terms of service for renters and providers.' };

export default function TermsPage() {
  return (
    <div className="static-page container section">
      <div className="static-hero">
        <p className="static-tag">Legal</p>
        <h1>Terms of <span className="text-gradient">Service</span></h1>
        <p className="static-lead">Last updated: April 2026. Please read these terms carefully before using RidePulse.</p>
      </div>

      <div className="legal-body glass">
        {[
          { title: '1. Acceptance of Terms', body: 'By creating an account or using the RidePulse platform, you agree to be bound by these Terms of Service and all applicable laws. If you do not agree, please do not use our platform.' },
          { title: '2. Eligibility', body: 'You must be at least 18 years old with a valid government-issued ID and a valid motorcycle licence to rent a bike on RidePulse. Providers must own the vehicles they list and ensure they are roadworthy.' },
          { title: '3. Account Responsibility', body: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to notify RidePulse immediately of any unauthorized use of your account. RidePulse is not liable for losses from unauthorized account use.' },
          { title: '4. Booking & Payments', body: 'All bookings are confirmed only upon successful payment. RidePulse facilitates payments between renters and providers. The platform fee (10% for providers) is deducted before payout. All amounts are in Indian Rupees (INR) and are inclusive of GST.' },
          { title: '5. Cancellations', body: 'Renters may cancel for a full refund up to 24 hours before the booking start time. Cancellations within 24 hours forfeit 50% of the booking cost. Providers who cancel a confirmed booking may face penalties including temporary suspension.' },
          { title: '6. Prohibited Conduct', body: 'Users must not misuse the platform, list fraudulent vehicles, provide false identity documents, use bikes for illegal activities, or engage in any behaviour that harms other users or the platform.' },
          { title: '7. Liability Limitation', body: 'RidePulse acts as a marketplace and is not liable for accidents, injuries, or disputes between providers and renters. We strongly recommend all users take the optional RideSafe insurance cover.' },
          { title: '8. Changes to Terms', body: 'RidePulse reserves the right to modify these terms at any time. Users will be notified via email of material changes. Continued use of the platform constitutes acceptance of the updated terms.' },
          { title: '9. Contact', body: 'For questions about these terms, contact us at legal@ridepulse.in.' },
        ].map((s, i) => (
          <div key={i} className="legal-section">
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
