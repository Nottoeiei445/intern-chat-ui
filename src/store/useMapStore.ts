// useMapStore.ts
import { create } from 'zustand';
import { DynamicLayerPayload } from '@/features/map/types';
import { persist, createJSONStorage } from 'zustand/middleware';
import maplibregl from 'maplibre-gl';

interface PendingChatData {
  input: string;
  model: string;
  images: string[];
  options?: any;
}

interface MapState {
  map: maplibregl.Map | null;
  setMap: (map: maplibregl.Map | null) => void;

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

  hiddenLayers: string[];
  toggleLayerVisibility: (layerId: string) => void;
  
  isBaseMapVisible: boolean;
  toggleBaseMap: () => void;

  setActiveStyle: (layerId: string, styleKey: string) => void;
  layerHistoryCount: Record<string, Record<string, number>>;
  updateLayerHistoryCount: (chatId:string, layerId: string, action: 'increment' | 'decrement' | 'init') => void;

  currentConversationApiKey?: string | null;
  setcurrentConversationApiKey: (key: string | null) => void;
  sessionKeys: Record<string, string>;
  setSessionKey: (chatId: string, key: string) => void;
  clearSessionKeys: () => void;

  pendingMention: { text: string; timestamp: number } | null;
  triggerLayerMention: (layerId: string) => void;
  clearPendingMention: () => void;

  pendingAttribute: string | null;
  setPendingAttribute: (text: string) => void;
  clearPendingAttribute: () => void;

  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;

  triggerLayerUndo?: (layerId: string) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      map: null,
      setMap: (map) => set({ map }),

      dynamicLayers: [], 
      setDynamicLayers: (layers) => set({ dynamicLayers: layers }), 
      clearLayers: () => set({ dynamicLayers: [], hiddenLayers: [] as string[], layerHistoryCount: {} }),

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
            ? state.hiddenLayers.filter(id => id !== layerId)
            : [...state.hiddenLayers, layerId] 
        };
      }),

      isBaseMapVisible: true,
      toggleBaseMap: () => set((state) => ({ isBaseMapVisible: !state.isBaseMapVisible })),

      setActiveStyle: (layerId, styleKey) => set((state) => ({
        dynamicLayers: state.dynamicLayers.map((layer) =>
          layer.id === layerId ? { ...layer, activeStyleKey: styleKey } : layer
        )
    })),

      layerHistoryCount: {},
      updateLayerHistoryCount: (chatId, layerId, action) => set((state) => {
        const currentChatHistory = state.layerHistoryCount[chatId] || {};
        let currentCount = currentChatHistory[layerId] || 0;

        if (action === 'increment') {
          currentCount += 1;
        } else if (action === 'decrement') {
          currentCount = Math.max(1, currentCount - 1);
        } else if (action === 'init') {
          currentCount = 1;
        }

        return {
          layerHistoryCount: {
            ...state.layerHistoryCount,
            [chatId]: {
              ...currentChatHistory,
              [layerId]: currentCount
            }
          }
        };
      }),
  
  currentConversationApiKey: null,
  setcurrentConversationApiKey: (key) => set({ currentConversationApiKey: key }),
  
  sessionKeys: {},
  setSessionKey: (chatId, key) => set((state) => ({ 
    sessionKeys: { ...state.sessionKeys, [chatId]: key } 
  })),
  clearSessionKeys: () => set({ sessionKeys: {} }),

  pendingMention: null,
  triggerLayerMention: (layerId) => set({ 
    pendingMention: { text: `[layer_id: ${layerId}]`, timestamp: Date.now() } 
  }),
  clearPendingMention: () => set({ pendingMention: null }),
  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),
  pendingAttribute: null,
  setPendingAttribute: (text) => set({ pendingAttribute: text }),
  clearPendingAttribute: () => set({ pendingAttribute: null }),
  triggerLayerUndo: undefined,
}),

{
      name: 'map-layer-counter-storage',
      storage: createJSONStorage(() => sessionStorage), // บังคับขังไว้ใน sessionStorage กด F5 ค่าไม่หาย ปิดแท็บล้างทิ้งทันที
      // ตัวเลือกอัจฉริยะ: สั่งให้คัดเลือก "เฉพาะ" ตัวแปร layerHistoryCount ไปจำลง Cache พอ ตัวอื่นไม่ต้องจำ
      partialize: (state) => ({
        layerHistoryCount: state.layerHistoryCount,
      }),
    }
  )
);