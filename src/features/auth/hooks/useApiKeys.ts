"use client";

import { useState, useEffect, useCallback } from "react";
import { ApiKey, CreateApiKeyDTO } from "../types";
import { apiKeyService } from "../services/apiKey.service";

export const useApiKeys = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 1. ดึงรายการคีย์ทั้งหมด
   */
  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiKeyService.getKeys();
      
      const actualKeys = response?.data || []; 
      
      setKeys(actualKeys);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      setKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  /**
   * 2. สร้างคีย์ใหม่ (ใช้ CreateApiKeyDTO)
   */
  const addKey = async (data: CreateApiKeyDTO) => {
    try {
      const response = await apiKeyService.createKey(data);
      const newKey = response?.data || (response as unknown as ApiKey); // ปรับ

      setKeys((prev) => [...prev, newKey]);
      return newKey;
    } catch (error) {
      console.error("Failed to create API key:", error);
      throw error;
    }
  };

  /**
   * 3. อัปเดตข้อมูลคีย์ (ส่ง id แยก และใช้ Partial<CreateApiKeyDTO>)
   */
  const updateKey = async (id: string, data: Partial<CreateApiKeyDTO>) => {
    try {
      const response = await apiKeyService.updateKey(id, data);
      const updatedKey = response?.data || (response as unknown as ApiKey); // ปรับตามโครงสร้างจริงของ response

      setKeys((prev) =>
        prev.map((k) => 
          k.id === id ? { ...k, ...updatedKey } : k
        )
      );
      return updatedKey;
    } catch (error) {
      console.error("Failed to update API key:", error);
      throw error;
    }
  };

  /**
   * 4. ลบ API Key
   */
  const deleteKey = async (id: string) => {
    try {
      await apiKeyService.deleteKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (error) {
      console.error("Failed to delete API key:", error);
      throw error;
    }
  };

  return {
    keys,
    isLoading,
    addKey,
    updateKey,
    deleteKey,
    refetch: fetchKeys,
  };
};