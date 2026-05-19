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

  hiddenLayers: string[];
  toggleLayerVisibility: (layerId: string) => void;
  
  isBaseMapVisible: boolean;
  toggleBaseMap: () => void;

  setActiveStyle: (layerId: string, styleKey: string) => void;

  currentConversationApiKey?: string | null;
  setcurrentConversationApiKey: (key: string | null) => void;
  sessionKeys: Record<string, string>;
  setSessionKey: (chatId: string, key: string) => void;
  clearSessionKeys: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  dynamicLayers: [], 
  setDynamicLayers: (layers) => set({ dynamicLayers: layers }), 
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
        ? state.hiddenLayers.filter(id => id !== layerId)
        : [...state.hiddenLayers, layerId] 
    };
  }),

  isBaseMapVisible: true,
  toggleBaseMap: () => set((state) => ({ isBaseMapVisible: !state.isBaseMapVisible })),

  // เพิ่มฟังก์ชันสลับ Style ค้นหาเลเยอร์ที่ตรงกับ ID แล้วแก้ค่า activeStyleKey
  setActiveStyle: (layerId, styleKey) => set((state) => ({
    dynamicLayers: state.dynamicLayers.map((layer) =>
      layer.id === layerId ? { ...layer, activeStyleKey: styleKey } : layer
    )
  })),
  currentConversationApiKey: null,
  setcurrentConversationApiKey: (key) => set({ currentConversationApiKey: key }),
  sessionKeys: {},
  setSessionKey: (chatId, key) => set((state) => ({ 
    sessionKeys: { ...state.sessionKeys, [chatId]: key } 
  })),
  clearSessionKeys: () => set({ sessionKeys: {} }),
}));