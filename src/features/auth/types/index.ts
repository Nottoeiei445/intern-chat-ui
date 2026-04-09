// src/features/auth/types/index.ts

export interface UserProfile {
  id: string;
  email: string;
  username: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: UserProfile;
    accessToken: string;
    expiresIn?: number; // Token expiration time in seconds (optional)
  };
}

export interface TokenInfo {
  accessToken: string;
  expiresAt: number; // Timestamp when token expires (milliseconds)
  refreshedAt: number; // Timestamp when token was refreshed (milliseconds)
}