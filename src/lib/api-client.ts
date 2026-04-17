// src/lib/api-client.ts
import { ENV } from './env';

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

const BASE_URL = ENV.CHAT_API_BASE_URL || 'http://localhost:3000';

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true', 
};

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

function buildUrl(path: string, params?: Record<string, any>) { // ถ้า path ที่ส่งมาเป็น URL เต็มๆ อยู่แล้ว (เช่น http://example.com/api) ให้ใช้เลย ไม่ต้องต่อกับ BASE_URL
  if (/^https?:\/\//i.test(path)) return path;

  const base = BASE_URL.replace(/\/+$/, ''); // ลบ / ท้ายออกให้หมดก่อนต่อกับ path
  const cleanPath = path.startsWith('/') ? path : `/${path}`; // ถ้า path ไม่มี / ข้างหน้า ให้เติมให้ (เพื่อความแน่นอนในการต่อ URL)
  const url = new URL(`${base}${cleanPath}`); // สร้าง URL จาก base และ path ที่ทำความสะอาดแล้ว

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v)); // ถ้า value เป็น undefined หรือ null ให้ข้ามการเพิ่ม query parameter ตัวนั้น (ไม่ต้องใส่ค่าเปล่าๆ ไปให้เซิร์ฟเวอร์)
    });
  }
  return url.toString(); // คืนค่า URL ที่สร้างเสร็จแล้วเป็นสตริง (พร้อมกับ query parameters ถ้ามี)
}

/**
 * ตัวจัดการ Request หลัก (แบบเดิมที่แกะ JSON ให้เลย)
 */
async function request<T>( // method, path, และ options สำหรับการส่ง request
  method: string, 
  path: string, 
  options?: { params?: Record<string, any>; body?: any; headers?: Record<string, string> }
): Promise<T> {
  const res = await requestRaw(method, path, options); // ใช้ requestRaw เพื่อส่ง request และรับ Response กลับมาแบบดิบๆ (ยังไม่แกะ JSON)
  
  // Handle empty responses (204 No Content)
  const parsed = res.status === 204 ? null : await res.json().catch(() => null); // ถ้า Response ไม่มีเนื้อหา (เช่น 204) ให้ตั้ง parsed เป็น null แทนการพยายามแปลงเป็น JSON ซึ่งจะทำให้เกิด error ได้

  if (!res.ok) {
    console.error("--- DEBUG API ERROR ---");
    console.error(`Method: ${method} | Path: ${path} | Status: ${res.status}`);
    console.error("Server Response:", parsed);
    console.error("-----------------------");

    const err = new Error(parsed?.detail || parsed?.message || res.statusText || 'API_FAILURE') as ApiError;
    err.status = res.status;
    err.data = parsed;
    throw err;
  }

  return parsed as T; // คืนค่า parsed JSON ที่ถูกแปลงเป็น type T ตามที่กำหนดใน generic ของฟังก์ชันนี้ (ถ้าไม่มีเนื้อหาเลยจะเป็น null ซึ่งก็ยังถือว่าเป็น T ได้อยู่ดี)
}

/**
 * ตัวยิง Request แบบดิบ (คืนค่า Response ทั้งก้อน ไม่แกะ JSON)
 * เอาไว้ใช้ทำ Stream เพราะต้องการเข้าถึง Header และ Body ตรงๆ
 */
async function requestRaw(
  method: string,
  path: string,
  options?: { params?: Record<string, any>; body?: any; headers?: Record<string, string> }
): Promise<Response> {
  const { params, body, headers } = options || {};
  const url = buildUrl(path, params);
  const token = getToken();

  const mergedHeaders: Record<string, string> = { 
    ...DEFAULT_HEADERS, 
    ...headers 
  };
  if (token) mergedHeaders.Authorization = `Bearer ${token}`;

  const init: RequestInit = { 
    method, 
    headers: mergedHeaders, 
    credentials: 'include' 
  };
  
  if (method !== 'GET' && body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return fetch(url, init);
}

export const apiClient = { // ฟังก์ชันสำหรับส่ง Request แบบต่างๆ ที่ใช้ request เป็นพื้นฐานในการทำงาน
  get: <T>(path: string, params?: Record<string, any>) => 
    request<T>('GET', path, { params }),
  
  post: <T>(path: string, body?: any) => 
    request<T>('POST', path, { body }),
  
  put: <T>(path: string, body?: any) => 
    request<T>('PUT', path, { body }),
  
  delete: <T>(path: string, body?: any) => 
    request<T>('DELETE', path, { body }),

  /**
   * สำหรับรับข้อมูลแบบ Stream (SSE)
   * คืนค่า Response เพื่อให้ฝั่งคนใช้ไปดึง Header และใช้ .body.getReader() เอง
   */
  stream: (path: string, body?: any) => 
    requestRaw('POST', path, { body }),
};

export default apiClient;