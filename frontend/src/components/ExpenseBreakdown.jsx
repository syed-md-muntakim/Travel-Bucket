// frontend/src/components/ExpenseBreakdown.jsx
// MEMBER 2 FEATURE FILE — new addition, no other member's code touches this file.
//
// Given a tripId, fetches and displays the transport cost, hotel cost,
// miscellaneous cost, and total for that trip.

import { useEffect, useState } from "react";
import api from "../api/axios";

const formatBDT = (n) => `৳${Number(n || 0).toLocaleString()}`;

export default function ExpenseBreakdown({ tripId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    setError("");
    api
      .get(`/expenses/trip/${tripId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load expense breakdown"))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return <p className="expense-status">Calculating trip expenses...</p>;
  if (error) return <p className="expense-status expense-error">{error}</p>;
  if (!data) return null;

  return (
    <div className="expense-breakdown">
      <h4>Expense Breakdown</h4>
      <table className="expense-table">
        <tbody>
          <tr>
            <td>Transport cost</td>
            <td>{formatBDT(data.transportCost)}</td>
          </tr>
          <tr>
            <td>Hotel cost</td>
            <td>{formatBDT(data.hotelCost)}</td>
          </tr>
          <tr>
            <td>
              Miscellaneous cost
              <span className="expense-hint"> (min ৳10,000, or 10% of transport + hotel)</span>
            </td>
            <td>{formatBDT(data.miscCost)}</td>
          </tr>
          <tr className="expense-total-row">
            <td>Total</td>
            <td>{formatBDT(data.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
