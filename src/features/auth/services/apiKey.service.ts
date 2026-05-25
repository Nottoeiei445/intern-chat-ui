import { apiClient } from '@/lib/api-client';
import { ApiKey, CreateApiKey } from '../types';
import { AUTH_CONFIG } from '../config/auth.config';

export const apiKeyService = {
  /**
   * ดึงรายการ API Key ทั้งหมดของผู้ใช้
   */
  getKeys: () => 
    apiClient.get<{ data: ApiKey[] }>(AUTH_CONFIG.endpoints.apiKeys),

  /**
   * สร้าง API Key ใหม่
   */
  createKey: (data: CreateApiKey) => 
    apiClient.post<{ data: ApiKey }>(AUTH_CONFIG.endpoints.apiKeys, data),

  /**
   * แก้ไขข้อมูลคีย์ (เช่น เปลี่ยนชื่อ)
   */
  updateKey: (id: string, data: Partial<CreateApiKey>) => 
    apiClient.put<{ data: ApiKey }>(AUTH_CONFIG.endpoints.apiKeyDetail(id), data),

  /**
   * ลบ API Key
   */
  deleteKey: (id: string) => 
    apiClient.delete<void>(AUTH_CONFIG.endpoints.apiKeyDetail(id)),
    
  getKeyById: (id: string) => 
    apiClient.get<{ data: ApiKey & { apiKey: string } }>(AUTH_CONFIG.endpoints.apiKeyDetail(id)),

  /**
   * ตรวจสอบความถูกต้องของคีย์ (สำหรับ Popover ที่เราทำค้างไว้)
   
  verifyKey: (key: string) => 
    apiClient.post<{ isValid: boolean }>(AUTH_CONFIG.endpoints.verifyKey, { key }),
  */
  getKeyHosts: () =>
    apiClient.get<{ data: CreateApiKey[] }>(AUTH_CONFIG.endpoints.apiKeyHosts),
};