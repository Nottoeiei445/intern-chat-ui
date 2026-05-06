import { apiClient } from '@/lib/api-client';
import { ApiKey, CreateApiKeyDTO } from '../types';
import { AUTH_CONFIG } from '../config/auth.config';

export const apiKeyService = {
  /**
   * ดึงรายการ API Key ทั้งหมดของผู้ใช้
   */
  getKeys: () => 
    apiClient.get<ApiKey[]>(AUTH_CONFIG.endpoints.apiKeys),

  /**
   * สร้าง API Key ใหม่
   */
  createKey: (data: CreateApiKeyDTO) => 
    apiClient.post<ApiKey>(AUTH_CONFIG.endpoints.apiKeys, data),

  /**
   * แก้ไขข้อมูลคีย์ (เช่น เปลี่ยนชื่อ)
   */
  updateKey: (id: string, data: Partial<CreateApiKeyDTO>) => 
    apiClient.put<ApiKey>(AUTH_CONFIG.endpoints.apiKeyDetail(id), data),

  /**
   * ลบ API Key
   */
  deleteKey: (id: string) => 
    apiClient.delete<void>(AUTH_CONFIG.endpoints.apiKeyDetail(id)),
    
  /**
   * ตรวจสอบความถูกต้องของคีย์ (สำหรับ Popover ที่เราทำค้างไว้)
   */
  verifyKey: (key: string) => 
    apiClient.post<{ isValid: boolean }>(AUTH_CONFIG.endpoints.verifyKey, { key }),
};