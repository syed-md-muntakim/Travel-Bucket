import { useEffect, useState } from "react";
import api from "../api/axios";

// Liza — Travel Statistics Dashboard (Module 3)
export default function TravelStats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/stats");
        setStats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load travel statistics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p className="page-loading">Crunching your travel stats...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!stats) return null;

  const { totals, tripType, destinations, completionRate, monthlyActivity, insights } = stats;
  const soloVsCompanionTotal = tripType.solo + tripType.companion || 1;
  const maxMonthCount = Math.max(1, ...monthlyActivity.map((m) => m.count));
  const maxDestinationCount = Math.max(1, ...destinations.mostVisited.map((d) => d.count));

  return (
    <div>
      <h1>Travel Statistics Dashboard</h1>
      <p>A breakdown of your travel behavior — how much you travel, where you go, and how it's trending.</p>

      {/* Top-line numbers */}
      <div className="stats-row">
        <div className="stat-box"><div className="num">{totals.totalTrips}</div><div className="label">Total Trips</div></div>
        <div className="stat-box"><div className="num">{totals.active}</div><div className="label">Active</div></div>
        <div className="stat-box"><div className="num">{totals.completed}</div><div className="label">Completed</div></div>
        <div className="stat-box"><div className="num">{totals.cancelled}</div><div className="label">Cancelled</div></div>
        <div className="stat-box"><div className="num">{destinations.uniqueVisited}</div><div className="label">Unique Destinations</div></div>
        <div className="stat-box"><div className="num">{completionRate}%</div><div className="label">Completion Rate</div></div>
      </div>

      {/* Solo vs Companion */}
      <div className="card">
        <h3>Solo vs Companion Trips</h3>
        {soloVsCompanionTotal === 0 ? (
          <p>No trips yet — plan one to see this breakdown.</p>
        ) : (
          <div className="split-bar">
            <div
              className="split-bar-solo"
              style={{ width: `${(tripType.solo / soloVsCompanionTotal) * 100}%` }}
            >
              {tripType.solo > 0 && `Solo (${tripType.solo})`}
            </div>
            <div
              className="split-bar-companion"
              style={{ width: `${(tripType.companion / soloVsCompanionTotal) * 100}%` }}
            >
              {tripType.companion > 0 && `Companion (${tripType.companion})`}
            </div>
          </div>
        )}
      </div>

      {/* Most visited destinations */}
      <div className="card">
        <h3>Most Visited Destinations</h3>
        {destinations.mostVisited.length === 0 ? (
          <p>No destinations yet — plan your first trip to start building this list.</p>
        ) : (
          <div className="bar-chart">
            {destinations.mostVisited.map((d) => (
              <div className="bar-row" key={d.district}>
                <span className="bar-label">{d.district}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(d.count / maxDestinationCount) * 100}%` }} />
                </div>
                <span className="bar-value">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly activity */}
      <div className="card">
        <h3>Travel Activity (Last 12 Months)</h3>
        <div className="month-chart">
          {monthlyActivity.map((m) => (
            <div className="month-bar-wrap" key={m.key} title={`${m.label}: ${m.count} trip(s)`}>
              <div
                className="month-bar"
                style={{ height: `${(m.count / maxMonthCount) * 100}%` }}
              />
              <span className="month-bar-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <h3>Insights</h3>
        <ul className="insights-list">
          <li>
            🏆 <strong>Most visited destination:</strong>{" "}
            {insights.mostVisitedDestination || "Not enough data yet"}
          </li>
          <li>
            🎒 <strong>Preferred travel type:</strong>{" "}
            {insights.preferredTravelType
              ? insights.preferredTravelType[0].toUpperCase() + insights.preferredTravelType.slice(1)
              : "Not enough data yet"}
          </li>
          <li>
            📅 <strong>Most active travel period:</strong>{" "}
            {insights.mostActivePeriod || "Not enough data yet"}
          </li>
        </ul>
      </div>
    </div>
  );
}
