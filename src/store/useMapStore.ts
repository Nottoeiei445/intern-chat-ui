// useMapStore.ts
import { create } from 'zustand';
import { DynamicLayerPayload } from '@/features/map/types';

interface PendingChatData {
  input: string;
  model: string;
  images: string[];
  options?: any;
}

interface MapState {
  dynamicLayers: DynamicLayerPayload[];
  setDynamicLayers: (layers: DynamicLayerPayload[]) => void;
  clearLayers: () => void;
  
  apiKeys: Record<string, string>; 
  setApiKey: (serviceName: string, key: string) => void;
  clearApiKeys: () => void;

  isKeyModalOpen: boolean;
  openKeyModal: () => void;
  closeKeyModal: () => void;

  pendingChat: PendingChatData | null;
  setPendingChat: (chatData: PendingChatData) => void;
  clearPendingChat: () => void;

  // 🌟 [เพิ่มใหม่] ตัวจัดการการซ่อน/แสดงเลเยอร์
  hiddenLayers: string[];
  toggleLayerVisibility: (layerId: string) => void;
  
  // 🌟 [เพิ่มใหม่] ตัวจัดการพื้นหลังแผนที่ (Base Map)
  isBaseMapVisible: boolean;
  toggleBaseMap: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  dynamicLayers: [], 
  setDynamicLayers: (layers) => set({ dynamicLayers: layers }), 
  // เคลียร์ค่าที่ซ่อนไว้ด้วยเวลาสั่งล้างเลเยอร์ทั้งหมด
  clearLayers: () => set({ dynamicLayers: [], hiddenLayers: [] }), 

  apiKeys: {}, 
  setApiKey: (serviceName, key) => 
    set((state) => ({ 
      apiKeys: { ...state.apiKeys, [serviceName]: key } 
    })),
  clearApiKeys: () => set({ apiKeys: {} }),

  isKeyModalOpen: false, 
  openKeyModal: () => set({ isKeyModalOpen: true }),
  closeKeyModal: () => set({ isKeyModalOpen: false }),

  pendingChat: null,
  setPendingChat: (chatData) => set({ pendingChat: chatData }),
  clearPendingChat: () => set({ pendingChat: null }),

  hiddenLayers: [],
  toggleLayerVisibility: (layerId) => set((state) => {
    const isHidden = state.hiddenLayers.includes(layerId);
    return {
      hiddenLayers: isHidden 
        ? state.hiddenLayers.filter(id => id !== layerId) // ถ้าซ่อนอยู่ ให้เอาออก (แสดง)
        : [...state.hiddenLayers, layerId] // ถ้าแสดงอยู่ ให้เอาไปใส่ลิสต์ซ่อน
    };
  }),

  isBaseMapVisible: true,
  toggleBaseMap: () => set((state) => ({ isBaseMapVisible: !state.isBaseMapVisible })),
}));