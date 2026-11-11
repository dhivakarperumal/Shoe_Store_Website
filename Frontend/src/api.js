import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
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
    const token = localStorage.getItem("token");
    const isAuthRequest = /\/auth\/(login|google-login|register)(?:\?|$)/.test(error.config?.url || "");

    if (error.response?.status === 401 && token && !isAuthRequest) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:session-expired"));
    }

    return Promise.reject(error);
  },
);

export default api;