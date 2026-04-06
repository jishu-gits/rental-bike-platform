// RidePulse — Surepass KYC API integration using native fetch (Node 18+)

const SUREPASS_BASE = 'https://kyc-api.surepass.io/api/v1';

const surepassHeaders = {
  'Authorization': `Bearer ${process.env.SUREPASS_TOKEN}`,
  'Content-Type': 'application/json',
};

// Verify Driving License against Parivahan government database
const verifyDrivingLicense = async (dlNumber, dob) => {
  const res = await fetch(`${SUREPASS_BASE}/driving-license/driving-license`, {
    method: 'POST',
    headers: surepassHeaders,
    body: JSON.stringify({ id_number: dlNumber, dob }),
  });

  const data = await res.json();

  if (!res.ok || data.status_code !== 200 || !data.success) {
    throw new Error(data.message || 'Driving license verification failed');
  }

  const d = data.data;
  return {
    name: d.name,
    dob: d.dob,
    validity: d.validity?.non_transport || d.validity?.transport || 'N/A',
    vehicleClasses: d.vehicle_classes || [],
    issueDate: d.issue_date,
    state: d.state,
    dlNumber: d.dl_number,
    rawResponse: d,
  };
};

// Verify PAN against Income Tax database
const verifyPAN = async (panNumber) => {
  const res = await fetch(`${SUREPASS_BASE}/pan/pan`, {
    method: 'POST',
    headers: surepassHeaders,
    body: JSON.stringify({ id_number: panNumber.toUpperCase() }),
  });

  const data = await res.json();

  if (!res.ok || data.status_code !== 200 || !data.success) {
    throw new Error(data.message || 'PAN verification failed');
  }

  const d = data.data;
  return {
    name: d.first_name
      ? `${d.first_name} ${d.middle_name || ''} ${d.last_name || ''}`.trim()
      : d.name,
    panNumber: d.pan_number,
    type: d.pan_type,
    rawResponse: d,
  };
};

// Face match — compares selfie (base64) against reference image URL from DL
const faceMatch = async (selfieBase64, referenceImageUrl) => {
  // Build multipart form
  const boundary = '----RidePulseBoundary' + Date.now();

  const selfieBuffer = Buffer.from(selfieBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file1"; filename="selfie.jpg"\r\n`;
  body += `Content-Type: image/jpeg\r\n\r\n`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(body, 'utf8'),
    selfieBuffer,
    Buffer.from(`\r\n--${boundary}\r\n`, 'utf8'),
  ]);

  let part2 = '';
  part2 += `Content-Disposition: form-data; name="file2_url"\r\n\r\n`;
  part2 += `${referenceImageUrl}\r\n`;
  part2 += `--${boundary}--\r\n`;

  const finalBuffer = Buffer.concat([bodyBuffer, Buffer.from(part2, 'utf8')]);

  const res = await fetch(`${SUREPASS_BASE}/face/face-match`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUREPASS_TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: finalBuffer,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Face match failed');
  }

  return {
    matched: data.data?.match ?? false,
    confidence: data.data?.confidence ?? 0,
  };
};

// Fuzzy name match — checks if DL name and PAN name are the same person
// Handles minor OCR differences like "BIDHAN MANNA" vs "Bidhan Kumar Manna"
const nameMatchScore = (name1, name2) => {
  const normalize = (n) => n.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/);
  const words1 = normalize(name1);
  const words2 = normalize(name2);

  const common = words1.filter(w => w.length > 2 && words2.includes(w));
  const score = common.length / Math.max(words1.length, words2.length);
  return Math.round(score * 100);
};

module.exports = { verifyDrivingLicense, verifyPAN, faceMatch, nameMatchScore };