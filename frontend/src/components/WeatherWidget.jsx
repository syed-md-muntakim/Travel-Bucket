// frontend/src/components/WeatherWidget.jsx
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.
//
// Reusable widget: pass it a `district` prop and it live-fetches current
// conditions + a 5-day forecast from our backend's /api/weather endpoint
// (which itself wraps the OpenWeatherMap API). Any page can drop this in —
// it needs no other component's state.

import { useEffect, useState } from "react";
import api from "../api/axios";

export default function WeatherWidget({ district }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = (district || "").trim();
    if (trimmed.length < 2) {
      setData(null);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    // Debounce so typing a district name doesn't fire an API call per keystroke
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get("/weather", { params: { district: trimmed } });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Weather unavailable for this location right now");
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [district]);

  const trimmed = (district || "").trim();
  if (trimmed.length < 2) return null;

  return (
    <div className="weather-widget">
      {loading && <p className="weather-status">Checking weather for {trimmed}...</p>}
      {error && <p className="weather-status weather-error">{error}</p>}

      {data && !loading && !error && (
        <>
          <div className="weather-current">
            <img
              src={`https://openweathermap.org/img/wn/${data.current.icon}@2x.png`}
              alt={data.current.description}
              className="weather-icon-lg"
            />
            <div>
              <div className="weather-temp">{data.current.temp}°C</div>
              <div className="weather-desc">{data.current.description}</div>
              <div className="weather-place">{data.current.locationName}</div>
              <div className="weather-feels">Feels like {data.current.feelsLike}°C</div>
            </div>
          </div>

          {data.forecast?.length > 0 && (
            <div className="weather-forecast-row">
              {data.forecast.map((f) => (
                <div className="weather-forecast-item" key={f.date}>
                  <div className="wf-date">
                    {new Date(f.date).toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <img src={`https://openweathermap.org/img/wn/${f.icon}.png`} alt={f.description} />
                  <div className="wf-temp">{f.tempMax}° / {f.tempMin}°</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
