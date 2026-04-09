"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { UserProfile, LoginCredentials } from "../types";
import { authService } from "../services/auth.service";
import { AUTH_CONFIG } from "../config/auth.config";

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  timeUntilExpiry: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number>(0);

  const refreshCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const proactiveRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // 1. Initialize Session on App Load
  // ==========================================
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await authService.getCurrentUser();

        if (response && response.data) {
          setAccessToken(response.data.accessToken);
          setUser(response.data.user);
          authService.logEvent(
            "Session restored successfully on app load."
          );
        }
      } catch (err) {
        authService.logEvent(
          "No active session. User needs to login."
        );
      } finally {
        setIsInitialized(true);
      }
    };

    initializeSession();
  }, []);

  // ==========================================
  // 2. Token Expiration Checker
  // ==========================================
  useEffect(() => {
    if (!AUTH_CONFIG.features.enableProactiveRefresh) return;

    const checkTokenExpiry = async () => {
      const timeRemaining = authService.getTimeUntilExpiry();
      setTimeUntilExpiry(Math.max(0, timeRemaining));

      if (authService.isTokenExpiringSoon() && accessToken) {
        authService.logEvent(
          "Token expiring soon. Attempting proactive refresh..."
        );

        try {
          const response = await authService.refreshAccessToken();

          if (response && response.data) {
            setAccessToken(response.data.accessToken);
            authService.logEvent(
              "Proactive token refresh successful."
            );
          }
        } catch (err) {
          authService.logEvent(
            "Proactive token refresh failed: " + (err as Error).message
          );
        }
      }
    };

    refreshCheckIntervalRef.current = setInterval(
      checkTokenExpiry,
      AUTH_CONFIG.session.tokenCheckIntervalMs
    );

    return () => {
      if (refreshCheckIntervalRef.current) {
        clearInterval(refreshCheckIntervalRef.current);
      }
    };
  }, [accessToken]);

  // ==========================================
  // 3. Login Function
  // ==========================================
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);

      if (response && response.data) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        authService.logEvent("Login successful! Token received.");
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err: any) {
      const errorMsg = err.message || "Login failed";
      setError(errorMsg);
      authService.logEvent("Login failed: " + errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 4. Logout Function
  // ==========================================
  const logout = async () => {
    if (refreshCheckIntervalRef.current) {
      clearInterval(refreshCheckIntervalRef.current);
    }
    if (proactiveRefreshTimeoutRef.current) {
      clearTimeout(proactiveRefreshTimeoutRef.current);
    }

    try {
      await authService.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
      setTimeUntilExpiry(0);
      authService.logEvent("Logged out successfully.");
    }
  };

  // ==========================================
  // 5. Manual Token Refresh Function
  // ==========================================
  const refreshToken = async () => {
    try {
      const response = await authService.refreshAccessToken();

      if (response && response.data) {
        setAccessToken(response.data.accessToken);
        authService.logEvent(
          "Token manually refreshed successfully."
        );
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err: any) {
      const errorMsg = err.message || "Token refresh failed";
      setError(errorMsg);
      authService.logEvent("Token refresh failed: " + errorMsg);
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isInitialized,
    error,
    login,
    logout,
    refreshToken,
    timeUntilExpiry,
  };

  return (
    <AuthContext.Provider value={value}>
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