// frontend/src/pages/Achievements.jsx
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.

import { useEffect, useState } from "react";
import api from "../api/axios";

const ACTIVITY_LABELS = {
  trip_planned: "Planned a trip",
  trip_joined: "Joined a companion trip",
  review_added: "Posted a review",
  trip_completed: "Completed a trip",
};

export default function Achievements() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/achievements/me")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load achievements"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="page-loading">Loading your achievements...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <h1>Travel Achievement & Activity Log</h1>
      <p>Earn points by planning trips (+3) and posting reviews (+2), and unlock badges as you go.</p>

      <div className="card points-card">
        <div className="points-total">{data.totalPoints} pts</div>
        {data.nextBadge ? (
          <p className="points-next">
            {data.nextBadge.threshold - data.totalPoints} point{data.nextBadge.threshold - data.totalPoints !== 1 ? "s" : ""} to
            {" "}<strong>{data.nextBadge.name}</strong>
          </p>
        ) : (
          <p className="points-next">All badges unlocked — Free Spirit achieved!</p>
        )}
      </div>

      <h2>Badges</h2>
      <div className="badge-grid">
        {data.badges.map((b) => (
          <div className={`badge-card ${b.unlocked ? "unlocked" : "locked"}`} key={b.name}>
            <div className="badge-icon">{b.unlocked ? "🏅" : "🔒"}</div>
            <div className="badge-name">{b.name}</div>
            <div className="badge-threshold">{b.threshold} pts</div>
          </div>
        ))}
      </div>

      <h2>Activity Log</h2>
      <div className="card">
        {data.log.length === 0 && <p>No activity yet — plan a trip or post a review to get started.</p>}
        {data.log.length > 0 && (
          <table>
            <thead>
              <tr><th>Activity</th><th>Details</th><th>Points</th><th>Date</th></tr>
            </thead>
            <tbody>
              {data.log.map((entry) => (
                <tr key={entry._id}>
                  <td>{ACTIVITY_LABELS[entry.type] || entry.type}</td>
                  <td>
                    {entry.description}
                    {entry.trip && (
                      <span className="activity-trip-tag">
                        {" "}({entry.trip.departureDistrict} → {entry.trip.destinationDistrict})
                      </span>
                    )}
                  </td>
                  <td>{entry.points > 0 ? `+${entry.points}` : "—"}</td>
                  <td>{new Date(entry.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
