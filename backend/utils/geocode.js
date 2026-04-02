// RidePulse — Geocoding helpers using Nominatim and Haversine distance calculation
const AppError = require('../utils/AppError');

const geocodeCity = async (cityName) => {
  if (!cityName) throw new AppError('City name is required for geocoding', 400);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': process.env.NOMINATIM_USER_AGENT || 'ridepulse-backend/1.0' } });
  if (!res.ok) throw new AppError('Geocoding service error', 502);
  const data = await res.json();
  if (!data || !data[0]) throw new AppError('City not found', 404);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius km
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

module.exports = { geocodeCity, calculateDistanceKm };
