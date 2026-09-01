// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import "./Login.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" | "otp" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("OTP sent to your email. Check your inbox.");
      setStep("otp");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send OTP.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Please enter the OTP.");
      return;
    }
    setLoading(true);
    // We'll simply move to reset step – the actual verification happens on reset.
    setStep("reset");
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, new_password: newPassword });
      toast.success("Password reset successful. Please login.");
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.message || "Reset failed.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrap">
        <div className="login-logo-wrap">
          <img src="/primaria.png" alt="Company Logo" className="login-logo" />
        </div>
        <div className="login-brand"><h1>Reset Password</h1></div>

        <div className="login-card">
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="login-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Mail size={16} /></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@primaria.com"
                    className="form-control"
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Sending..." : "Send Reset OTP"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 10 }}
                onClick={() => navigate("/")}
              >
                <ArrowLeft size={16} /> Back to Login
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="login-form">
              <div className="otp-header" style={{ textAlign: "center", marginBottom: 16 }}>
                <ShieldCheck size={32} color="#2f5dd4" style={{ marginBottom: 8 }} />
                <h3>Enter OTP</h3>
                <p className="text-muted" style={{ fontSize: 14 }}>
                  We sent a 6-digit code to {email}
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><ShieldCheck size={16} /></span>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className="form-control"
                    maxLength={6}
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 10 }}
                onClick={() => setStep("email")}
              >
                Change Email
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="login-form">
              <h3>Set New Password</h3>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Lock size={16} /></span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="form-control"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-icon-wrap">
                  <span className="input-icon"><Lock size={16} /></span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="form-control"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 10 }}
                onClick={() => navigate("/")}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}