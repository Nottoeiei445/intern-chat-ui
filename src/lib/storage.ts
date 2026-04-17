// src/lib/storage.ts
import Cookies from "js-cookie";

export const storage = {
  // ==========================================
  // 🍪 จัดการ Cookie (สำหรับ Token)
  // ==========================================
  getCookie: (key: string): string | null => {
    return Cookies.get(key) || null;
  },

  setCookie: (key: string, value: string, expiresAtMs?: number): void => {
    const options: Cookies.CookieAttributes = { path: '/' };
    if (expiresAtMs) {
      options.expires = new Date(expiresAtMs);
    }
    Cookies.set(key, value, options);
  },

  removeCookie: (key: string): void => {
    Cookies.remove(key, { path: '/' });
  },

  // ==========================================
  // 📦 จัดการ LocalStorage (สำหรับ User Data ทั่วไป)
  // ==========================================
  getLocal: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  },

  setLocal: (key: string, value: any): void => {
    if (typeof window === "undefined") return;
    const stringValue = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  },

  removeLocal: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  }
};