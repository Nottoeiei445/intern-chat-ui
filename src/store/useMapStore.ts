import { create } from 'zustand';
import { DynamicLayerPayload } from '@/features/map/types';

interface MapState {
  dynamicLayers: DynamicLayerPayload[];
  setDynamicLayers: (layers: DynamicLayerPayload[]) => void;
  clearLayers: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  dynamicLayers: [], // เริ่มต้นเป็นกระดานเปล่า
  setDynamicLayers: (layers) => set({ dynamicLayers: layers }), // ฟังก์ชันเขียนกระดาน
  clearLayers: () => set({ dynamicLayers: [] }), // ฟังก์ชันลบกระดาน
}));