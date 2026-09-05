import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import TripPlanner from "./pages/TripPlanner";
import CompanionTrips from "./pages/CompanionTrips";
import TravelLibrary from "./pages/TravelLibrary";
import Profile from "./pages/profile";
import Recommendations from "./pages/Recommendations";
import TravelStats from "./pages/TravelStats";
import HotelBooking from "./pages/HotelBooking";
import TransportBooking from "./pages/TransportBooking";
import TripDetails from "./pages/TripDetails"; // Syed: Trip Details receipt (new line)
import Achievements from "./pages/Achievements"; // Syed: Achievement & Activity Log (new line)

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/trips" element={<PrivateRoute><TripPlanner /></PrivateRoute>} />
          <Route path="/companion-trips" element={<PrivateRoute><CompanionTrips /></PrivateRoute>} />
          <Route path="/library" element={<PrivateRoute><TravelLibrary /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/recommendations" element={<PrivateRoute><Recommendations /></PrivateRoute>} />
          <Route path="/stats" element={<PrivateRoute><TravelStats /></PrivateRoute>} />
          <Route path="/transport-booking" element={<PrivateRoute><TransportBooking /></PrivateRoute>} />
          <Route path="/hotel-booking" element={<PrivateRoute><HotelBooking /></PrivateRoute>} />
          <Route path="/trip-details/:tripId" element={<PrivateRoute><TripDetails /></PrivateRoute>} />
          <Route path="/achievements" element={<PrivateRoute><Achievements /></PrivateRoute>} />

          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
