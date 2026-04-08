import axios from "axios";
import { AuthResponse, LoginCredentials } from "../types";

const api = axios.create({
  baseURL: "https://ada-anthropopathic-ai.ngrok-free.dev",
  withCredentials: true, 
  headers: { 
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true" 
  },
});

api.interceptors.response.use(
  (response) => response, 
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true; 

      try {
        await axios.post(
          "https://ada-anthropopathic-ai.ngrok-free.dev/auth/refresh",
          {},
          { withCredentials: true }
        );

        return api(originalRequest);
        
      } catch (refreshError) {
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login"; 
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post("/auth/login", credentials);
      return response.data; 
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || `Server Error: ${error.response.status}`);
      }
      throw new Error("Cannot connect to the server or CORS blocked.");
    }
  },

  getCurrentUser: async (): Promise<AuthResponse> => {
    try {
      const response = await api.post("/auth/refresh"); 
      return response.data;
    } catch (error: any) {
      throw new Error("Session expired or not found.");
    }
  }
};