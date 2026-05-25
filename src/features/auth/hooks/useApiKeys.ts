"use client";

import { useState, useEffect, useCallback } from "react";
import { ApiKey, CreateApiKey } from "../types"; 
import { apiKeyService } from "../services/apiKey.service";
import { useAuth } from "@/features/auth"; 

export const useApiKeys = () => {
  const { user } = useAuth();
  
  const [keys, setKeys] = useState<ApiKey[]>([]);
  // 🌟 2. ใช้ CreateApiKey เป็น Type ของตัวเลือก Host ที่จะส่งไปให้ UI
  const [hosts, setHosts] = useState<CreateApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInitialData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 🌟 3. ยิง Promise.all ควบ 2 เส้นพร้อมกัน
      const [keysResponse, hostsResponse] = await Promise.all([
        apiKeyService.getKeys(),
        apiKeyService.getKeyHosts()
      ]);
      
      setKeys(keysResponse?.data || []);
      setHosts(hostsResponse?.data || []); 
      
    } catch (error) {
      console.error("Failed to fetch API data:", error);
      setKeys([]);
      setHosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]); 
  
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const addKey = async (data: any) => {
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

  const updateKey = async (id: string, data: any) => {
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
    hosts,
    isLoading,
    addKey,
    updateKey,
    deleteKey,
    refetch: fetchInitialData,
  };
};