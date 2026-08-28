import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if it's a login error, NOT a file view error
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes("/auth/login") &&
      !error.config.url.includes("/auth/verify-otp") &&
      !error.config.url.includes("/files/invoices")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);
export default api;