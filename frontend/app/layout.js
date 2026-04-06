import './globals.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';

export const metadata = {
  title: 'RidePulse - Premium Bike Rentals',
  description: 'Rent top-tier bikes instantly or list yours for earning.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <script src="https://checkout.razorpay.com/v1/checkout.js" />
      </head>
      <body>
        <Navbar />
        <EmailVerificationBanner />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
