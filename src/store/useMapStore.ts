import { create } from 'zustand';
import { DynamicLayerPayload } from '@/features/map/types';

// สร้าง Type สำหรับเก็บข้อมูลแชทที่ค้างไว้
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

  // 🚀 1. เพิ่มของเกี่ยวกับ Modal ขอคีย์
  isKeyModalOpen: boolean;
  openKeyModal: () => void;
  closeKeyModal: () => void;

  // 🚀 2. เพิ่มของเกี่ยวกับระบบ แอบจำแล้วยิงซ้ำ (Silent Retry)
  pendingChat: PendingChatData | null;
  setPendingChat: (chatData: PendingChatData) => void;
  clearPendingChat: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  dynamicLayers: [], 
  setDynamicLayers: (layers) => set({ dynamicLayers: layers }), 
  clearLayers: () => set({ dynamicLayers: [] }), 

  apiKeys: {}, 
  setApiKey: (serviceName, key) => 
    set((state) => ({ 
      apiKeys: { ...state.apiKeys, [serviceName]: key } 
    })),
  clearApiKeys: () => set({ apiKeys: {} }),

  // 1. ตัวจัดการ Modal
  isKeyModalOpen: false, // เริ่มต้นให้ซ่อนไว้ก่อน
  openKeyModal: () => {
    set({ isKeyModalOpen: true });
  },
  closeKeyModal: () => set({ isKeyModalOpen: false }),

  //2. ตัวจัดการโพสต์อิทจำคำสั่ง
  pendingChat: null,
  setPendingChat: (chatData) => set({ pendingChat: chatData }),
  clearPendingChat: () => set({ pendingChat: null }),
}));