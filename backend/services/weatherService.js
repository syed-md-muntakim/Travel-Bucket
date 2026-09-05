// backend/services/weatherService.js
//
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.
//
// Wraps OpenWeatherMap's free-tier APIs:
//   1. Geocoding API   — turns a district/city name into lat/lon
//   2. Current Weather API — live conditions for those coordinates
//   3. 5 Day / 3 Hour Forecast API — used to build a 5-day outlook
//
// Requires OPENWEATHER_API_KEY to be set in backend/.env (see .env.example).
// Uses the built-in `fetch` (Node 18+) — no extra npm dependency needed.

const OWM_BASE = "https://api.openweathermap.org";
const GEO_BASE = `${OWM_BASE}/geo/1.0`;
const DATA_BASE = `${OWM_BASE}/data/2.5`;

// Simple in-memory cache so repeated lookups for the same district (e.g. several
// trip cards showing the same destination, or a user re-typing) don't burn
// through the free API's daily call quota. Entries expire after 10 minutes.
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // districtKey (lowercase) -> { data, expiresAt }

const getFromCache = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.data;
};

const setCache = (key, data) => {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

// Turns a district/city name into lat/lon coordinates.
// Appends ",BD" by default since this app's districts are Bangladeshi districts.
// Pass a full "City,CountryCode" string yourself to override that default.
const geocodeDistrict = async (district) => {
  const query = district.includes(",") ? district : `${district},BD`;
  const url = `${GEO_BASE}/direct?q=${encodeURIComponent(query)}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not reach the weather service to look up that location");

  const results = await res.json();
  if (!results.length) throw new Error(`No location found for "${district}"`);

  const { lat, lon, name, state, country } = results[0];
  return { lat, lon, locationName: [name, state, country].filter(Boolean).join(", ") };
};

// OpenWeatherMap's free forecast endpoint returns one entry every 3 hours.
// This groups those into one summary per calendar day (min/max temp, and the
// icon/description from the reading closest to midday as the "representative" one).
const summarizeForecastByDay = (list) => {
  const byDate = {};
  for (const entry of list) {
    const date = entry.dt_txt.split(" ")[0]; // "YYYY-MM-DD"
    if (!byDate[date]) byDate[date] = { temps: [], entries: [] };
    byDate[date].temps.push(entry.main.temp);
    byDate[date].entries.push(entry);
  }

  return Object.entries(byDate)
    .slice(0, 5) // next 5 days
    .map(([date, { temps, entries }]) => {
      const midday = entries.reduce((best, e) => {
        const hour = Number(e.dt_txt.split(" ")[1].split(":")[0]);
        const bestHour = Number(best.dt_txt.split(" ")[1].split(":")[0]);
        return Math.abs(hour - 12) < Math.abs(bestHour - 12) ? e : best;
      }, entries[0]);

      return {
        date,
        tempMin: Math.round(Math.min(...temps)),
        tempMax: Math.round(Math.max(...temps)),
        icon: midday.weather[0].icon,
        description: midday.weather[0].description,
      };
    });
};

// Main entry point used by the controller: current conditions + a 5-day outlook
// for a given district/city name. Cached for 10 minutes per district.
const getWeatherForDistrict = async (district) => {
  const cacheKey = district.trim().toLowerCase();
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  if (!process.env.OPENWEATHER_API_KEY) {
    throw new Error("OPENWEATHER_API_KEY is not configured on the server (check backend/.env)");
  }

  const { lat, lon, locationName } = await geocodeDistrict(district);

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${DATA_BASE}/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`),
    fetch(`${DATA_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`),
  ]);

  if (!currentRes.ok || !forecastRes.ok) {
    throw new Error("The weather service did not respond as expected");
  }

  const currentJson = await currentRes.json();
  const forecastJson = await forecastRes.json();

  const result = {
    current: {
      temp: Math.round(currentJson.main.temp),
      feelsLike: Math.round(currentJson.main.feels_like),
      description: currentJson.weather[0].description,
      icon: currentJson.weather[0].icon,
      locationName,
    },
    forecast: summarizeForecastByDay(forecastJson.list || []),
  };

  setCache(cacheKey, result);
  return result;
};

module.exports = { getWeatherForDistrict };
