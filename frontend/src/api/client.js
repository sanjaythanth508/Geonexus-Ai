import axios from "axios";

// Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 90000, // 90 seconds for ML inference & GIS processing
});

// ========================
// Request Interceptor
// ========================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ========================
// Response Interceptor
// ========================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh_token");

      if (refresh) {
        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/"}users/token/refresh/`,
            {
              refresh,
            }
          );

          localStorage.setItem("access_token", res.data.access);

          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;

          return api(originalRequest);
        } catch (err) {
          console.warn("Token refresh failed:", err);
          return Promise.reject(err);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;