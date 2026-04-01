import '../static-page.css';

export const metadata = { title: 'Privacy Policy — RidePulse', description: 'How RidePulse collects, uses, and protects your personal data.' };

export default function PrivacyPage() {
  return (
    <div className="static-page container section">
      <div className="static-hero">
        <p className="static-tag">Legal</p>
        <h1>Privacy <span className="text-gradient">Policy</span></h1>
        <p className="static-lead">Last updated: April 2026. Your privacy matters to us. Here's exactly what we collect and why.</p>
      </div>

      <div className="legal-body glass">
        {[
          { title: '1. What We Collect', body: 'We collect information you provide directly: your name, email, phone number, profile photo, government-issued ID (for verification), and payment information. We also automatically collect usage data, device type, and IP address when you use our platform.' },
          { title: '2. How We Use Your Data', body: 'We use your data to: create and manage your account, facilitate bookings between renters and providers, process payments and payouts, verify identity as required by law, send booking confirmations and important updates, and improve our platform.' },
          { title: '3. Data Sharing', body: "We share your name and contact details with the counterparty in a confirmed booking (e.g., renters receive the provider's contact information for pick-up). We do not sell your personal data to third parties. We use Cloudinary for image storage and MongoDB Atlas for data storage — both are GDPR-compliant." },
          { title: '4. Identity Verification', body: 'Government-issued ID documents uploaded for provider verification are stored encrypted and accessed only by our trust and safety team. They are deleted after successful verification or account closure.' },
          { title: '5. Cookies', body: 'We use essential cookies only for session management and authentication (JWT). We do not use third-party advertising cookies.' },
          { title: '6. Data Retention', body: 'We retain your data as long as your account is active. You may request deletion of your account and associated data by emailing privacy@ridepulse.in. Booking records may be retained for up to 7 years for tax and legal compliance.' },
          { title: '7. Your Rights', body: 'You have the right to access, correct, or delete your personal data. You can update most information in your account settings. For data deletion requests, contact privacy@ridepulse.in.' },
          { title: '8. Security', body: 'We implement industry-standard security including HTTPS encryption, bcrypt password hashing, and JWT-based authentication. Your payment information is processed securely and is never stored on our servers.' },
          { title: '9. Contact', body: 'For privacy concerns, contact our Data Protection Officer at privacy@ridepulse.in.' },
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
