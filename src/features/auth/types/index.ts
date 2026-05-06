// src/features/auth/types/index.ts

export interface UserProfile {
  id: string;
  email: string;
  username: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  guest_id?: string | null; // เพิ่ม guest_id สำหรับการย้ายข้อมูลจาก Guest มา User
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

export interface ApiKey {
  id: string;
  name: string;           // เช่น "chaiwatAPI"
  key: string;            // คีย์จริง (มักจะ masked มาจากหลังบ้าน เช่น "g1stda-********")
  status: 'active' | 'revoked';
  restriction: string;    // เช่น "None" หรือ "Restricted"
  createdAt: string;      // ISO Date string
  lastUsedAt?: string;
  applications?: string[]; // ไอคอนแอปต่างๆ ที่แสดงในรูป
}

// สำหรับตอนสร้างคีย์ใหม่
export interface CreateApiKeyDTO {
  name: string;
}