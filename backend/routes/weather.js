const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/weather?city=Anand&state=Gujarat
//     /api/weather?lat=22.55&lon=72.97
//
// Uses Open-Meteo (free, no API key) + Open-Meteo Geocoding API
// Docs: https://open-meteo.com/en/docs
// ─────────────────────────────────────────────────────────────────────────────

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// WMO weather code → emoji icon + description
// https://open-meteo.com/en/docs#weathervariables
function decodeWMO(code) {
  if (code === 0)                return { icon: '☀️',  desc: 'Clear Sky' };
  if (code === 1)                return { icon: '🌤️',  desc: 'Mainly Clear' };
  if (code === 2)                return { icon: '⛅',  desc: 'Partly Cloudy' };
  if (code === 3)                return { icon: '☁️',  desc: 'Overcast' };
  if ([45,48].includes(code))   return { icon: '🌫️',  desc: 'Foggy' };
  if ([51,53,55].includes(code)) return { icon: '🌦️', desc: 'Drizzle' };
  if ([61,63,65].includes(code)) return { icon: '🌧️', desc: 'Rain' };
  if ([71,73,75].includes(code)) return { icon: '❄️',  desc: 'Snow' };
  if ([80,81,82].includes(code)) return { icon: '🌧️', desc: 'Rain Showers' };
  if ([95,96,99].includes(code)) return { icon: '⛈️', desc: 'Thunderstorm' };
  return { icon: '🌡️', desc: 'Unknown' };
}

/** Build farm advisories from forecast */
function buildFarmAdvisories(forecast) {
  const advisories = [];

  const frostDay = forecast.find(d => d.low <= 5);
  if (frostDay) {
    advisories.push({
      date: frostDay.day,
      action: `Frost risk (${frostDay.low}°C). Irrigate fields the evening before. Cover nursery seedlings.`,
      priority: 'high', icon: '❄️',
    });
  }

  const rainDay = forecast.find(d => d.rain >= 60);
  if (rainDay) {
    advisories.push({
      date: rainDay.day,
      action: `Heavy rain expected (${rainDay.rain}%). Avoid spraying pesticides. Ensure field drainage is clear.`,
      priority: 'medium', icon: '🌧️',
    });
  }

  const windDay = forecast.find(d => d.wind >= 30);
  if (windDay) {
    advisories.push({
      date: windDay.day,
      action: `Strong winds (${windDay.wind} km/h). Avoid burning crop residue. Secure greenhouse covers.`,
      priority: 'medium', icon: '💨',
    });
  }

  advisories.push(
    { date: 'This week', action: 'Scout fields for early pest activity',   priority: 'low', icon: '🐛' },
    { date: 'Next week', action: 'Soil sampling for next season planning', priority: 'low', icon: '🪱' },
  );

  return advisories;
}

/** Geocode city name → { lat, lon, displayName } */
async function geocodeCity(city, state) {
  const query = state ? `${city}, ${state}, India` : `${city}, India`;
  const url   = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;

  console.log('[Weather] Geocoding:', query);
  const res  = await fetch(url);
  const data = await res.json();

  if (!data.results?.length) {
    // Retry with just city name if state+city didn't match
    const url2  = `${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res2  = await fetch(url2);
    const data2 = await res2.json();
    if (!data2.results?.length) throw new Error(`Location "${city}" not found`);
    const r = data2.results[0];
    return { lat: r.latitude, lon: r.longitude, displayName: `${r.name}, ${r.admin1 || 'India'}` };
  }

  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, displayName: `${r.name}, ${r.admin1 || state || 'India'}` };
}

// ── Main route ───────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { city, state } = req.query;
  let { lat, lon }      = req.query;

  // Reject if nothing provided
  if (!city && !lat && !lon) {
    return res.status(400).json({
      success: false,
      error: 'No location provided. Please set your district and state in your profile.',
    });
  }

  let displayName = city ? `${city}${state ? `, ${state}` : ''}` : `${lat}, ${lon}`;

  try {
    // ── Step 1: Resolve lat/lon via geocoding if not provided ────────
    if (!lat || !lon) {
      const geo   = await geocodeCity(city, state);
      lat         = geo.lat;
      lon         = geo.lon;
      displayName = geo.displayName;
    }

    console.log('[Weather] Fetching Open-Meteo for %s (%s, %s)', displayName, lat, lon);

    // ── Step 2: Fetch current + 7-day forecast from Open-Meteo ──────
    const params = new URLSearchParams({
      latitude:  lat,
      longitude: lon,
      current: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'windspeed_10m',
        'weathercode',
        'visibility',
      ].join(','),
      daily: [
        'weathercode',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
        'windspeed_10m_max',
        'relative_humidity_2m_max',
      ].join(','),
      timezone:      'Asia/Kolkata',
      forecast_days: 7,
    });

    const weatherRes = await fetch(`${WEATHER_URL}?${params}`);
    if (!weatherRes.ok) throw new Error(`Open-Meteo HTTP ${weatherRes.status}`);
    const weatherData = await weatherRes.json();

    // ── Step 3: Parse current weather ───────────────────────────────
    const c   = weatherData.current;
    const wmo = decodeWMO(c.weathercode);

    const current = {
      temp:       Math.round(c.temperature_2m),
      feelsLike:  Math.round(c.apparent_temperature),
      humidity:   Math.round(c.relative_humidity_2m),
      wind:       Math.round(c.windspeed_10m),
      condition:  wmo.desc,
      icon:       wmo.icon,
      visibility: c.visibility ? Math.round(c.visibility / 1000) : 10,
    };

    // ── Step 4: Parse 7-day daily forecast ──────────────────────────
    const daily = weatherData.daily;
    const today = new Date();

    const forecast = daily.time.map((dateStr, i) => {
      const date    = new Date(dateStr);
      const isToday = date.toDateString() === today.toDateString();
      const dWmo    = decodeWMO(daily.weathercode[i]);

      return {
        day:      isToday ? 'Today' : DAY_NAMES[date.getDay()],
        icon:     dWmo.icon,
        desc:     dWmo.desc,
        high:     Math.round(daily.temperature_2m_max[i]),
        low:      Math.round(daily.temperature_2m_min[i]),
        rain:     Math.round(daily.precipitation_probability_max[i] || 0),
        humidity: Math.round(daily.relative_humidity_2m_max[i] || 0),
        wind:     Math.round(daily.windspeed_10m_max[i]),
      };
    });

    // ── Step 5: Build alerts ─────────────────────────────────────────
    const alerts = [];
    let alertId  = 1;

    forecast.forEach(d => {
      if (d.low <= 5) {
        alerts.push({
          id: alertId++, type: 'frost', severity: 'warning',
          title: 'Frost Advisory',
          message: `Temperature may drop to ${d.low}°C on ${d.day}. Irrigate fields the evening before. Cover nursery seedlings.`,
          crops: ['Wheat', 'Mustard', 'Vegetables'],
        });
      }
      if (d.rain >= 70) {
        alerts.push({
          id: alertId++, type: 'rain', severity: 'watch',
          title: 'Heavy Rain Expected',
          message: `${d.rain}% rain probability on ${d.day}. Avoid spraying pesticides. Ensure field drainage.`,
          crops: ['All Crops'],
        });
      }
      if (d.wind >= 35) {
        alerts.push({
          id: alertId++, type: 'wind', severity: 'advisory',
          title: 'High Wind Advisory',
          message: `Winds up to ${d.wind} km/h on ${d.day}. Avoid burning crop residue. Secure greenhouse covers.`,
          crops: ['Cotton', 'Sunflower'],
        });
      }
    });

    console.log('[Weather] ✓ %s → %d°C %s | alerts: %d',
      displayName, current.temp, wmo.icon, alerts.length);

    return res.json({
      success:        true,
      location:       displayName,
      source:         'Real-Time Weather Updates',
      current,
      forecast,
      alerts,
      farmAdvisories: buildFarmAdvisories(forecast),
    });

  } catch (err) {
    console.error('[Weather] Error:', err.message);
    return res.status(500).json({
      success: false,
      error:   err.message,
    });
  }
});

module.exports = router;