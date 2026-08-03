import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth, ROLE_ROUTES } from "../context/AuthContext.jsx";
import "./Login.css";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      toast.success(`Welcome, ${result.user.name}!`);
      const destination = ROLE_ROUTES[result.user.role] || "/";
      navigate(destination);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrap">
        <div className="login-logo-wrap">
          {!logoFailed ? (
            <img
              src="/primaria.png"
              alt="Company Logo"
              className="login-logo"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="login-logo-fallback">
              <Lock color="#fff" size={24} />
            </div>
          )}
        </div>

        <div className="login-brand">
          <h1>Billing Portal</h1>
          <p>One login for IT, PCM, MedTech, Caredx &amp; SuperAdmin</p>
        </div>

        <div className="login-card">
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Mail size={16} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@primaria.com"
                  className="form-control"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrap">
                <span className="input-icon"><Lock size={16} /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the Password"
                  className="form-control"
                  style={{ paddingRight: 36 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="input-icon-toggle"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="login-footer-note">
            Your dashboard is determined automatically by your account role —
            no need to pick a portal.
          </p>
        </div>
      </div>
    </div>
  );
}
