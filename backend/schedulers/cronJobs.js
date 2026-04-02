// RidePulse — Cron schedulers for booking-related tasks
const cron = require('node-cron');
const Booking = require('../models/Booking');
const { notify } = require('../utils/notify');
const { sendEmail } = require('../utils/email');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Function for checking expired bookings
async function checkExpiredBookings() {
  const now = new Date();
  const expired = await Booking.find({ endDate: { $lt: now }, status: 'confirmed', returned: { $ne: true } }).populate('bikeId');
  if (!expired.length) {
    console.log('[cronJobs] checkExpiredBookings: no expired bookings');
    return;
  }

  for (const b of expired) {
    b.status = 'pending_return';
    await b.save();
    try {
      const server = require('../server');
      const io = server && server.io ? server.io : null;
      await notify(io, b.customerId, 'booking_pending_return', `Your booking ${b._id} is pending return.`);
      if (b.bikeId?.providerId) {
        await notify(io, b.bikeId.providerId, 'booking_pending_return', `Booking ${b._id} requires return from renter.`);
      }
    } catch (e) {
      console.error('[cronJobs] notify error:', e.message);
    }
  }

  console.log(`[cronJobs] checkExpiredBookings: processed ${expired.length} bookings`);
}

// Function for sending booking reminders
async function sendBookingReminder(booking) {
  const emailTarget = booking.customerId?.email;
  try {
    if (emailTarget) {
      await sendEmail({
        to: emailTarget,
        subject: 'RidePulse — Booking reminder',
        html: `<p>Hi ${booking.customerId.name}, this is a reminder for your booking ${booking._id} starting on ${new Date(booking.startDate).toLocaleString('en-IN')}.</p>`,
      });
    }
  } catch (e) {
    console.error('[cronJobs] sendEmail error:', e.message);
  }

  // Optional SMS reminder if Twilio configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && booking.customerId?.phone) {
    try {
      const to = booking.customerId.phone.startsWith('+') ? booking.customerId.phone : `+91${booking.customerId.phone}`;
      await twilio.messages.create({
        body: `Reminder: Your RidePulse booking ${booking._id} starts on ${new Date(booking.startDate).toLocaleString('en-IN')}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
    } catch (e) {
      console.error('[cronJobs] twilio send error:', e.message);
    }
  }
}

// Every hour: check for expired bookings
cron.schedule('0 * * * *', async () => {
  try {
    await checkExpiredBookings();
  } catch (err) {
    console.error('[cronJobs] Failed to checkExpiredBookings:', err.message);
  }
});

// Every day at 8am: send reminders for tomorrow's bookings
cron.schedule('0 8 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const nextDay = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      startDate: { $gte: tomorrow, $lt: nextDay },
      status: 'confirmed',
    }).populate('customerId').populate('bikeId');

    for (const b of bookings) {
      await sendBookingReminder(b);
    }
    console.log(`[cronJobs] Sent reminders for ${bookings.length} bookings for ${tomorrow.toDateString()}`);
  } catch (err) {
    console.error('[cronJobs] Failed to send reminders:', err.message);
  }
});
