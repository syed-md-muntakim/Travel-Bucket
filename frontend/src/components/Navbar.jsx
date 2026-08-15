import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand"> 🛫 Travel Bucket</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/trips">Plan a Trip</Link>
            <Link to="/companion-trips">Companion Trips</Link>
            <Link to="/library">Travel Library</Link>
            <Link to="/profile">My Profile</Link>
            {user.role === "admin" && <Link to="/admin">Admin</Link>}
            <span className="nav-user">Hi, {user.username}</span>
            <button className="btn-link" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
