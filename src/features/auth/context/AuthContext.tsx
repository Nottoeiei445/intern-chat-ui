"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile, LoginCredentials } from "../types";
import { authService } from "../services/auth.service";

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean; // 👈 Added to prevent UI flashing during initial check
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Starts as false
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // 1. Check Session on App Load (F5 Refresh)
  // ==========================================
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Silently ask backend to restore session using the HTTP-Only cookie
        const response = await authService.getCurrentUser();
        
        if (response && response.data) {
          setAccessToken(response.data.accessToken);
          setUser(response.data.user);
          console.log("✅ [Auth] Session restored successfully.");
        }
      } catch (err) {
        console.log("ℹ️ [Auth] No active session. User needs to login.");
      } finally {
        // Mark as initialized whether it succeeded or failed
        setIsInitialized(true); 
      }
    };

    restoreSession();
  }, []);

  // ==========================================
  // 2. Login Function
  // ==========================================
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      
      if (response && response.data) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        console.log("✅ [Auth] Login successful! Token received.");
      } else {
        throw new Error("Invalid response format from server.");
      }
      
    } catch (err: any) {
      setError(err.message);
      console.error("❌ [Auth] Login failed:", err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 3. Logout Function
  // ==========================================
  const logout = () => {
    setUser(null);
    setAccessToken(null);
    console.log("ℹ️ [Auth] Logged out successfully.");
    // Note: To be fully secure, you should call an API here to clear the backend cookie
    // e.g., await authService.logout();
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, isInitialized, error, login, logout }}>
      {/* Optional: Show a loading screen while checking the initial session */}
      {!isInitialized ? (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};