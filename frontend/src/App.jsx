import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ITDashboard from "./pages/dashboards/ITDashboard.jsx";
import PCMDashboard from "./pages/dashboards/PCMDashboard.jsx";
import MedTechDashboard from "./pages/dashboards/MedTechDashboard.jsx";
import CaredxDashboard from "./pages/dashboards/CaredxDashboard.jsx";
import SuperAdminDashboard from "./pages/dashboards/SuperAdminDashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        path="/dashboard/it"
        element={
          <ProtectedRoute allowedRoles={["IT"]}>
            <ITDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/pcm"
        element={
          <ProtectedRoute allowedRoles={["PCM"]}>
            <PCMDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/medtech"
        element={
          <ProtectedRoute allowedRoles={["MedTech"]}>
            <MedTechDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/caredx"
        element={
          <ProtectedRoute allowedRoles={["Caredx"]}>
            <CaredxDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRoles={["SuperAdmin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Login />} />
    </Routes>
  );
}
