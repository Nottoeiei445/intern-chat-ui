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

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: UserProfile;
    accessToken: string;
  };
}