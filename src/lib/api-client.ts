// src/lib/api-client.ts
import { ENV } from './env';
import { storage } from './storage';

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

const BASE_URL = ENV.CHAT_API_BASE_URL || 'http://localhost:3000';

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true', 
};

/**
 * ดึง Token จาก Cookie (ซึ่งอาจจะเป็น Access Token จริง หรือ Guest Token ที่หลังบ้านส่งมา)
 */
const getToken = (): string | null => {
  return storage.getCookie('access_token'); 
};

function buildUrl(path: string, params?: Record<string, any>) {
  if (/^https?:\/\//i.test(path)) return path;

  const base = BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${cleanPath}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString(); 
}

/**
 * ตัวจัดการ Request หลัก
 */
async function request<T>(
  method: string, 
  path: string, 
  options?: { params?: Record<string, any>; body?: any; headers?: Record<string, string> }
): Promise<T> {
  const res = await requestRaw(method, path, options); 
  
  const parsed = res.status === 204 ? null : await res.json().catch(() => null); 

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

  return parsed as T; 
}

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
    ...headers,
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

export const apiClient = {
  get: <T>(path: string, params?: Record<string, any>) => 
    request<T>('GET', path, { params }),
  
  post: <T>(path: string, body?: any) => 
    request<T>('POST', path, { body }),
  
  put: <T>(path: string, body?: any) => 
    request<T>('PUT', path, { body }),
  
  delete: <T>(path: string, body?: any) => 
    request<T>('DELETE', path, { body }),

  stream: (path: string, body?: any) => 
    requestRaw('POST', path, { body }),
};

export default apiClient;