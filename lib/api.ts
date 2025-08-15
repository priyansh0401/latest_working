import axios from "axios";

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  // Get token from cookies or session storage
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },

  register: async (name: string, email: string, password: string) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};

// Cameras API
export const camerasAPI = {
  getAll: async () => {
    const response = await api.get("/cameras");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/cameras/${id}`);
    return response.data;
  },

  create: async (cameraData: any) => {
    const response = await api.post("/cameras", cameraData);
    return response.data;
  },

  update: async (id: string, cameraData: any) => {
    const response = await api.put(`/cameras/${id}`, cameraData);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/cameras/${id}`);
    return response.data;
  },

  getStreamUrl: async (id: string) => {
    const response = await api.get(`/stream/${id}`);
    return response.data.stream_url;
  },
};

// Alerts API
export const alertsAPI = {
  getAll: async () => {
    const response = await api.get("/alerts");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/alerts/${id}`);
    return response.data;
  },

  create: async (alertData: any) => {
    const response = await api.post("/alerts", alertData);
    return response.data;
  },

  update: async (id: string, alertData: any) => {
    const response = await api.put(`/alerts/${id}`, alertData);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/alerts/${id}`);
    return response.data;
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    const response = await api.get("/settings");
    return response.data;
  },

  update: async (settingsData: any) => {
    const response = await api.put("/settings", settingsData);
    return response.data;
  },
};

export default api;
