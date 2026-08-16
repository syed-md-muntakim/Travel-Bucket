import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="page-loading">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
