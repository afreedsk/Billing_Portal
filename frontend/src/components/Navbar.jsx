import React, { useState } from "react";
import { LogOut, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";

export default function Navbar({ title, roleColor = "#2f5dd4" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoFailed, setLogoFailed] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully.");
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          {/* Place your logo file at frontend/public/primaria.png — it's
              served from the site root, so /primaria.png resolves to it.
              If the file isn't there yet, the role-colored icon below is
              shown instead so the navbar never looks broken. */}
          {!logoFailed ? (
            <img
              src="/primaria.png"
              alt="Company Logo"
              onError={() => setLogoFailed(true)}
              style={{ height: 36, width: "auto", maxWidth: 140, objectFit: "contain", flexShrink: 0 }}
            />
          ) : (
            <div className="navbar-icon" style={{ background: roleColor }}>
              <LayoutDashboard size={18} />
            </div>
          )}
          <div className="navbar-titles">
            <p className="navbar-title">{title}</p>
            <p className="navbar-subtitle">Billing Portal</p>
          </div>
        </div>

        <div className="navbar-user">
          <div className="navbar-user-info">
            <p className="navbar-user-name">{user?.name}</p>
            <p className="navbar-user-meta">{user?.role} · {user?.email}</p>
          </div>
          <div className="navbar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
