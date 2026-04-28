"use client";

import { useState, useEffect } from "react";
import { chatService } from "../services/chat.service";

export function useModels() {
  const [models, setModels] = useState<{ id: string; name: string; size?: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("llama3"); // ค่า Default
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);
        const responseData = await chatService.getModels();
        const rawList = responseData?.data || responseData;

        if (Array.isArray(rawList) && rawList.length > 0) {
          setModels(rawList);
          // ออโต้เลือกโมเดลตัวแรกสุดที่โหลดมาได้
          setSelectedModel(rawList[0].id);
        }
      } catch (error) {
        console.error("[useModels] Failed to fetch models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  return {
    models,
    selectedModel,
    setSelectedModel,
    isLoadingModels
  };
}