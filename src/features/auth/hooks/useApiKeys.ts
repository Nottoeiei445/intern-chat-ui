"use client";

import { useState, useEffect, useCallback } from "react";
import { ApiKey, CreateApiKeyDTO } from "../types";
import { apiKeyService } from "../services/apiKey.service";
import { useAuth } from "@/features/auth"; 

export const useApiKeys = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    // 🌟 3. ถ้าไม่มี user (เป็น Guest) ให้หยุดทำงานเลย ไม่ต้องยิง API
    if (!user) {
      setIsLoading(false);
      return;
    }

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
  }, [user]); 
  
  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const addKey = async (data: CreateApiKeyDTO) => {
    try {
      const response = await apiKeyService.createKey(data);
      const newKey = response?.data || (response as unknown as ApiKey);

      setKeys((prev) => [...prev, newKey]);
      return newKey;
    } catch (error) {
      console.error("Failed to create API key:", error);
      throw error;
    }
  };

  const updateKey = async (id: string, data: Partial<CreateApiKeyDTO>) => {
    try {
      const response = await apiKeyService.updateKey(id, data);
      const updatedKey = response?.data || (response as unknown as ApiKey);

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