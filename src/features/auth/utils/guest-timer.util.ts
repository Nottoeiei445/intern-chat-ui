import { storage } from "@/lib/storage";
import { AUTH_CONFIG } from "../config/auth.config";

export const isGuestTimeUp = (): boolean => {
  const expiresAtStr = storage.getCookie(AUTH_CONFIG.session.tokenExpiryStorageKey);
  const hasStartTime = localStorage.getItem(AUTH_CONFIG.session.guestStartTimeStorageKey);

  if (!expiresAtStr && hasStartTime) {
    return true; 
  }

  if (!expiresAtStr) return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  return Date.now() >= expiresAt;
};

export const startGuestExpiryTimer = (onExpired: () => void) => {
  const check = () => {
    if (isGuestTimeUp()) {
      console.log("[Guest Util] Token Expired according to Cookie!");
      onExpired();
    }
  };

  check();
  const interval = setInterval(check, 5000);
  return () => clearInterval(interval);
};

export const checkAndCleanupExpiredGuest = (): boolean => {
  const hasToken = storage.getCookie(AUTH_CONFIG.session.accessTokenStorageKey);
  const hasStartTime = localStorage.getItem(AUTH_CONFIG.session.guestStartTimeStorageKey);

  // ถ้ามีเวลาเริ่มแชท แต่ตอนนี้ไม่มี Token แล้ว (โดนลบตอนล็อคหน้าจอ) = ให้กวาดล้าง
  if (hasStartTime && !hasToken) {
    localStorage.removeItem(AUTH_CONFIG.session.guestStartTimeStorageKey);
    return true; 
  }
  return false;
};