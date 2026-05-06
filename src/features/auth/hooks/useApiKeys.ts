"use client";

import { useState, useEffect, useCallback } from "react";
import { ApiKey } from "../types";

const MOCK_KEYS: ApiKey[] = [
  {
    id: "1",
    name: "chaiwatAPI",
    key: "g1stda-9db10283-4a12-4c91",
    status: "active",
    restriction: "None",
    createdAt: "13 days ago",
    applications: ["🍃", "📊", "📈"]
  },
  {
    id: "2",
    name: "Development_Key",
    key: "g1stda-7fac2011-8b33-2a01",
    status: "active",
    restriction: "IP Restricted",
    createdAt: "2 days ago",
    applications: ["⚙️"]
  }
];

export const useApiKeys = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: อนาคตเปลี่ยนเป็น const data = await apiKeyService.getKeys();
      await new Promise((resolve) => setTimeout(resolve, 800));
      setKeys(MOCK_KEYS);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ดึงข้อมูลครั้งแรกเมื่อ Component ถูก Mount
  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const addKey = (newKey: ApiKey) => {
    setKeys((prev) => [newKey, ...prev]);
  };

  const updateKey = (updatedKey: ApiKey) => {
    setKeys((prev) => prev.map((k) => (k.id === updatedKey.id ? updatedKey : k)));
  };

  const deleteKey = async (id: string) => {
    try {
      // TODO: อนาคตเรียก await apiKeyService.deleteKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  };

  return {
    keys,
    isLoading,
    addKey,
    updateKey,
    deleteKey,
    refetch: fetchKeys, // เผื่อปุ่มอยากกด Refresh ข้อมูลใหม่
  };
};