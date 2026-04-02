// RidePulse — Final verification script for automated health checks
// Usage: cd backend && node ../scripts/final-validation.js

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const fetch = global.fetch || require('node-fetch');
const mongoose = require('mongoose');
const User = require('../backend/models/User');
const Bike = require('../backend/models/Bike');
const Booking = require('../backend/models/Booking');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const out = [];
function pass(msg) { console.log('✅', msg); out.push({ msg, ok: true }); }
function fail(msg) { console.error('❌', msg); out.push({ msg, ok: false }); }

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    // Phase 1 check: unknown route
    const res1 = await fetch(`${BASE_URL}/api/nonexistent-route`);
    if (res1.status === 404) pass('Unknown route returns 404'); else fail(`Unknown route status ${res1.status}`);

    // Phase 2 check: validation on register
    const randomEmail = `testuser${Date.now()}@example.com`;
    const zodRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x', email: randomEmail, password: 'weak', role: 'customer' }),
    });
    const zodBody = await zodRes.json();
    if (zodRes.status === 400 && zodBody.success === false) pass('Weak password rejected with 400'); else fail(`Weak password test returned ${zodRes.status}, body=${JSON.stringify(zodBody)}`);

    // Phase 5 check: registration + login-block before verify
    const userEmail = `vuser-${Date.now()}@example.com`;
    const reg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Validator', email: userEmail, password: 'StrongPass123', role: 'customer' }),
    });
    const regJson = await reg.json();
    if (reg.status === 201 && regJson.success) pass('Registration succeeded'); else fail(`Registration failed: ${reg.status} ${JSON.stringify(regJson)}`);

    const createdUser = await User.findOne({ email: userEmail });
    if (!createdUser) { fail('Created user not found in DB'); throw new Error('Cannot continue tests'); }

    const preLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: 'StrongPass123' }),
    });
    const preBody = await preLogin.json();
    if (preLogin.status === 403) pass('Login blocked before email verification'); else fail(`Login before verify status ${preLogin.status} body=${JSON.stringify(preBody)}`);

    // Mark emailVerified true and try login again
    createdUser.emailVerified = true;
    await createdUser.save();
    const loginOk = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: 'StrongPass123' }),
    });
    const loginOkBody = await loginOk.json();
    if (loginOk.status === 200 && loginOkBody.token) pass('Login works after email verification'); else fail(`Login after verify failed ${loginOk.status} ${JSON.stringify(loginOkBody)}`);
    const userToken = loginOkBody.token;

    // provider setup
    const providerEmail = `puser-${Date.now()}@example.com`;
    const providerReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Provider', email: providerEmail, password: 'StrongPass123', role: 'provider' }),
    });
    const providerUser = await User.findOne({ email: providerEmail });
    providerUser.emailVerified = true;
    await providerUser.save();
    const providerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: providerEmail, password: 'StrongPass123' }),
    });
    const providerToken = (await providerLogin.json()).token;
    if (!providerToken) fail('Provider login fails'); else pass('Provider login OK');

    // create bike
    const bikeRes = await fetch(`${BASE_URL}/api/bikes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerToken}` },
      body: JSON.stringify({ name: 'TestBike', category: 'Standard', fuelType: 'petrol', pricePerDay: 100, city: 'Mumbai' }),
    });
    const bikeJson = await bikeRes.json();
    if (bikeRes.status === 201 && bikeJson._id) pass('Bike created'); else fail(`Bike create failed: ${bikeRes.status} ${JSON.stringify(bikeJson)}`);

    const bikeId = bikeJson._id;
    if (!bikeJson.coordinates || !bikeJson.coordinates.lat) fail('Bike coordinates missing'); else pass('Bike coordinates saved');

    // create booking first successful
    const now = new Date();
    const tomorrow = new Date(true ? new Date().getTime() + 24*3600*1000 : null);
    const dayAfter = new Date(tomorrow.getTime() + 24*3600*1000);
    const bookingBody = {
      bikeId,
      startDate: tomorrow.toISOString(),
      endDate: dayAfter.toISOString(),
      planType: 'daily',
      deliveryType: 'pickup',
      useWallet: false,
    };
    const createBooking1 = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify(bookingBody),
    });
    const bookingA = await createBooking1.json();
    if (createBooking1.status === 201 && bookingA.booking) pass('First booking created'); else fail(`Booking creation failed: ${createBooking1.status} ${JSON.stringify(bookingA)}`);

    // Create overlapping booking should fail 409
    const createBooking2 = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify(bookingBody),
    });
    if (createBooking2.status === 409) pass('Overlapping booking rejected with 409'); else fail(`Overlapping booking status ${createBooking2.status}`);

    // Rate limit test: 11 tries bad creds
    let lastStatus = null;
    for (let i = 0; i < 11; i++) {
      const r = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: 'WrongPass123' }),
      });
      lastStatus = r.status;
    }
    if (lastStatus === 429) pass('auth/login rate limited at 11th request'); else fail(`auth login rate test final status ${lastStatus}`);

    // Payment verify tampered signature test
    const payVerify = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ razorpay_order_id: 'order_dummy', razorpay_payment_id: 'pay_dummy', razorpay_signature: 'bad_sig' }),
    });
    if (payVerify.status === 400) pass('Payment verify tampered signature returns 400'); else fail(`Payment verify status ${payVerify.status}`);

    // Webhook invalid signature
    const webhook = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'bad' },
      body: JSON.stringify({ event: 'payment.failed', payload: {} }),
    });
    if (webhook.status === 403) pass('Webhook invalid signature returns 403'); else fail(`Webhook status ${webhook.status}`);

    // KYC and admin route tests
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const adminLoginJson = await adminLogin.json();
      if (adminLogin.status === 200 && adminLoginJson.token) {
        const dashboard = await fetch(`${BASE_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${adminLoginJson.token}` },
        });
        if (dashboard.status === 200) pass('Admin dashboard accessible with admin token'); else fail(`Admin dashboard status ${dashboard.status}`);

        const nonAdminDash = await fetch(`${BASE_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (nonAdminDash.status === 403) pass('Non-admin gets 403 on admin routes'); else fail(`Non-admin dashboard status ${nonAdminDash.status}`);
      } else {
        fail('Admin login failed. Ensure ADMIN_EMAIL and ADMIN_PASSWORD are set and the admin exists.');
      }
    } else {
      pass('Admin test skipped because ADMIN_EMAIL or ADMIN_PASSWORD not configured');
    }

  } catch (err) {
    fail(`Exception encountered: ${err.message}`);
  } finally {
    await mongoose.disconnect();
    const failed = out.filter((x) => !x.ok).length;
    console.log('---');
    console.log(`Passed: ${out.filter((x) => x.ok).length}, Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

run().catch((err) => {
  console.error('Fatal error', err);
  process.exit(1);
});
