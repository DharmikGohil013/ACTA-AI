
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import SignIn from "./SignIn";
import Loader from "./components/Loader";
import "./style.css";

// Simple admin navigation bar
const AdminNavigation = () => (
  <nav className="admin-nav">
    <ul style={{ display: 'flex', gap: '1rem', listStyle: 'none', padding: 0 }}>
      <li><Link to="/">Home</Link></li>
      <li><Link to="/dashboard">Dashboard</Link></li>
      <li><Link to="/settings">Settings</Link></li>
      <li><Link to="/profile">Profile</Link></li>
    </ul>
  </nav>
);

export default function App() {
  // Add authentication logic as needed for admin
  return (
    <Router>
      <div className="min-h-screen">
        <AdminNavigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/signin" element={<SignIn />} />
        </Routes>
      </div>
    </Router>
  );
}
