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

  // 👇 เพิ่มฟังก์ชันนี้สำหรับเช็ค Session ตอนกด F5
  getCurrentUser: async (): Promise<AuthResponse> => {
    try {
      // 💡 ผมเดาทางเพื่อนเฮียว่าน่าจะใช้ /auth/refresh (ถ้าไม่ใช่ เฮียแก้ตรงนี้นะครับ)
      const response = await api.post("/auth/refresh"); 
      return response.data;
    } catch (error: any) {
      throw new Error("Session expired or not found.");
    }
  }
};