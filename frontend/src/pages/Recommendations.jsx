import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

// Liza — Travel Recommendation System (Module 3)
export default function Recommendations() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/recommendations");
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const planTripHere = (district) => {
    navigate(`/trips?destination=${encodeURIComponent(district)}`);
  };

  if (loading) return <p className="page-loading">Loading recommendations...</p>;

  return (
    <div className="recommendations-page">
      <h1>Recommended For You</h1>
      <p>
        Personalized destination picks based on where you've travelled, how you
        like to travel, and what other Travel Bucket members are exploring.
      </p>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <div className="card rec-summary">
            {data.newUser ? (
              <p>
                👋 You haven't completed any trips yet, so here are the destinations
                <strong> trending</strong> among Travel Bucket travellers right now.
                Plan your first trip and your recommendations will get more personal.
              </p>
            ) : (
              <p>
                Based on <strong>{data.meta.totalTripsAnalyzed}</strong> trip(s) across{" "}
                <strong>{data.meta.destinationsVisited}</strong> destination(s), you seem to enjoy{" "}
                <strong>{data.topCategory?.replace("-", " ")}</strong> getaways
                {data.preferredMode && (
                  <>
                    {" "}and prefer <strong>{data.preferredMode}</strong> travel
                  </>
                )}
                .
              </p>
            )}
          </div>

          <div className="grid rec-grid">
            {data.recommendations.map((r) => (
              <div className="card rec-card" key={r.district}>
                <div className="rec-card-head">
                  <span className="rec-emoji">{r.emoji}</span>
                  <div>
                    <h3 style={{ margin: 0 }}>{r.district}</h3>
                    <span className="badge rec-category">{r.category.replace("-", " ")}</span>
                  </div>
                </div>
                <p>{r.description}</p>
                <p className="rec-highlight">✨ {r.highlight}</p>
                <p className="rec-reason">{r.reason}</p>
                <button onClick={() => planTripHere(r.district)}>Plan a trip here</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
