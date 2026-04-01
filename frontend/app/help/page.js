'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, Send, MessageSquare, HelpCircle, Loader } from 'lucide-react';
import './help.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const FAQ_DATA = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" and provide your name, email, and password. You\'ll receive a referral code to share with friends for bonus credits.'
      },
      {
        q: 'What is KYC verification?',
        a: 'KYC (Know Your Customer) is required to book bikes. Upload your driving license and government ID for verification, which takes about 5 minutes.'
      },
      {
        q: 'How do I become a bike provider?',
        a: 'Sign up as a customer first, then go to your account and upgrade to provider. It\'s free and instant.'
      }
    ]
  },
  {
    category: 'Booking & Payment',
    questions: [
      {
        q: 'What payment methods are accepted?',
        a: 'We accept UPI payments and wallet balance. You can top up your wallet using UPI for faster bookings.'
      },
      {
        q: 'Can I cancel my booking?',
        a: 'Yes, you can cancel up to 24 hours before pickup. Cancellations within 24 hours may not be refundable.'
      },
      {
        q: 'What is doorstep delivery?',
        a: 'For ₹50 extra, we\'ll deliver the bike to your address and pick it up when you\'re done. Available in select cities.'
      },
      {
        q: 'Are there different pricing plans?',
        a: 'Yes! Choose from hourly, daily, weekly, or monthly plans. Weekly and monthly plans offer discounts.'
      }
    ]
  },
  {
    category: 'Bike & Safety',
    questions: [
      {
        q: 'Are the bikes insured?',
        a: 'Basic insurance is included with every booking. Optional RideSafe coverage provides additional protection.'
      },
      {
        q: 'What if the bike breaks down?',
        a: 'Contact support immediately. We\'ll arrange for a replacement bike or refund based on the situation.'
      },
      {
        q: 'Can I ride on highways?',
        a: 'Please follow local traffic laws. Some bikes may have restrictions on highway usage.'
      }
    ]
  },
  {
    category: 'Provider Questions',
    questions: [
      {
        q: 'How do I list my bike?',
        a: 'Go to the Provider Dashboard, click "List a Bike", and fill in the details. Upload photos for better visibility.'
      },
      {
        q: 'When do I get paid?',
        a: 'Payments are processed within 2 business days after the booking ends, minus our 10% service fee.'
      },
      {
        q: 'How do I manage availability?',
        a: 'Use the Provider Dashboard to mark bikes as available/unavailable. You can also see all your bookings.'
      }
    ]
  },
  {
    category: 'Referral Program',
    questions: [
      {
        q: 'How does the referral program work?',
        a: 'Share your referral code with friends. When they sign up and book their first ride, both you and your friend get ₹150 in wallet credit.'
      },
      {
        q: 'Where can I find my referral code?',
        a: 'Go to your Account → Refer & Earn tab to see your code and track referrals.'
      }
    ]
  }
];

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [userTickets, setUserTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserTickets();
    }
  }, []);

  const fetchUserTickets = async () => {
    const token = localStorage.getItem('token');
    setTicketsLoading(true);
    try {
      const res = await fetch(`${API}/api/support/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setUserTickets(data.tickets || []);
    } catch {}
    finally { setTicketsLoading(false); }
  };

  const toggleQuestion = (index) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to submit a support ticket.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/support/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Support ticket submitted successfully!');
        setFormData({ subject: '', message: '' });
        setShowForm(false);
        fetchUserTickets();
      } else {
        alert(data.message || 'Failed to submit ticket');
      }
    } catch (err) {
      alert('Error submitting ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="help-page container section">
      <div className="help-header">
        <h1 className="heading-md">Help Center</h1>
        <p>Find answers to common questions or contact our support team.</p>
      </div>

      <div className="help-content">
        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>

          {/* Category Tabs */}
          <div className="faq-tabs">
            {FAQ_DATA.map((cat, i) => (
              <button
                key={cat.category}
                className={`faq-tab ${activeCategory === i ? 'active' : ''}`}
                onClick={() => setActiveCategory(i)}
              >
                {cat.category}
              </button>
            ))}
          </div>

          {/* Questions */}
          <div className="faq-list">
            {FAQ_DATA[activeCategory].questions.map((faq, i) => {
              const globalIndex = `${activeCategory}-${i}`;
              const isExpanded = expandedQuestions.has(globalIndex);
              return (
                <div key={i} className="faq-item">
                  <button
                    className="faq-question"
                    onClick={() => toggleQuestion(globalIndex)}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`chevron ${isExpanded ? 'open' : ''}`} size={16} />
                  </button>
                  {isExpanded && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Support Section */}
        <div className="support-section">
          <div className="support-card glass">
            <MessageSquare size={32} className="support-icon" />
            <h3>Need More Help?</h3>
            <p>Can't find what you're looking for? Submit a support ticket and we'll get back to you within 24 hours.</p>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Contact Support'}
            </button>
          </div>

          {/* Support Form */}
          {showForm && (
            <div className="support-form glass">
              <h3>Submit Support Ticket</h3>
              <form onSubmit={handleSubmitTicket}>
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief description of your issue"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message *</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Describe your issue in detail..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <><Loader size={16} className="animate-spin" /> Submitting...</> : <>Submit Ticket</>}
                </button>
              </form>
            </div>
          )}

          {/* User Tickets */}
          {userTickets.length > 0 && (
            <div className="user-tickets glass">
              <h3>Your Support Tickets</h3>
              <div className="tickets-list">
                {userTickets.map((ticket) => (
                  <div key={ticket._id} className="ticket-item">
                    <div className="ticket-header">
                      <h4>{ticket.subject}</h4>
                      <span className={`status-badge ${ticket.status}`}>{ticket.status}</span>
                    </div>
                    <p className="ticket-message">{ticket.message}</p>
                    <span className="ticket-date">
                      {new Date(ticket.createdAt).toLocaleDateString('en-IN')}
                    </span>
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