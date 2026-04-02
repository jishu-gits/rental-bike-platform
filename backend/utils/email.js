// RidePulse — Email sending via Brevo HTTP API (avoids SMTP port blocks)
const Brevo = require('@getbrevo/brevo');

const client = Brevo.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const sendEmail = async ({ to, subject, html }) => {
  const apiInstance = new Brevo.TransactionalEmailsApi();

  const email = new Brevo.SendSmtpEmail();
  email.to = [{ email: to }];
  email.sender = { email: process.env.EMAIL_FROM_ADDRESS, name: 'RidePulse' };
  email.subject = subject;
  email.htmlContent = html;

  await apiInstance.sendTransacEmail(email);
};

// ─── Email templates ─────────────────────────────────────────────────────────

function verifyEmailTemplate(name, verificationUrl) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#0f0f1a;color:#fff;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1);">
    <h1 style="font-size:28px;margin:0 0 8px;background:linear-gradient(135deg,#667eea,#f65164);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
      RidePulse 🏍️
    </h1>
    <p style="color:#aaa;margin-top:4px;margin-bottom:32px;">Verify your email address</p>
    <p>Hi <strong>${name}</strong>,</p>
    <p style="color:#ccc;line-height:1.6;">
      Thanks for joining RidePulse! Please verify your email address to activate your account
      and start exploring bikes near you.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verificationUrl}"
         style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#667eea,#764ba2);
                color:#fff;text-decoration:none;border-radius:30px;font-weight:600;font-size:15px;">
        Verify My Email
      </a>
    </div>
    <p style="color:#888;font-size:13px;">
      This link expires in 24 hours. If you did not create an account, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;"/>
    <p style="color:#555;font-size:12px;text-align:center;">
      RidePulse — India's peer-to-peer bike rental marketplace
    </p>
  </div>
</body>
</html>`;
}

function bookingConfirmedTemplate(name, bookingDetails) {
  const { bikeModel, startDate, endDate, totalCost, bookingId } = bookingDetails;
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#0f0f1a;color:#fff;margin:0;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1);">
    <h1 style="font-size:28px;margin:0 0 8px;background:linear-gradient(135deg,#667eea,#f65164);
               -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
      RidePulse 🏍️
    </h1>
    <p style="color:#4ade80;font-weight:600;font-size:20px;margin-top:24px;">✅ Booking Confirmed!</p>
    <p>Hi <strong>${name}</strong>, your booking is confirmed. Here are the details:</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
        <td style="padding:10px 0;color:#aaa;">Bike</td>
        <td style="padding:10px 0;text-align:right;font-weight:600;">${bikeModel}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
        <td style="padding:10px 0;color:#aaa;">Start Date</td>
        <td style="padding:10px 0;text-align:right;">${new Date(startDate).toLocaleDateString('en-IN')}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
        <td style="padding:10px 0;color:#aaa;">End Date</td>
        <td style="padding:10px 0;text-align:right;">${new Date(endDate).toLocaleDateString('en-IN')}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#aaa;">Total Cost</td>
        <td style="padding:10px 0;text-align:right;font-weight:700;color:#4ade80;">₹${totalCost.toLocaleString('en-IN')}</td>
      </tr>
    </table>
    <p style="color:#888;font-size:13px;">Booking ID: ${bookingId}</p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;"/>
    <p style="color:#555;font-size:12px;text-align:center;">RidePulse — Ride Smart. Ride Green.</p>
  </div>
</body>
</html>`;
}

module.exports = { sendEmail, verifyEmailTemplate, bookingConfirmedTemplate };
