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
  styleHistories: Record<string, { activeStyleKey: string; renderStyles: any[] }[]>;
  recordLayerSnapshot: (layerId: string) => void;

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
}

export const useMapStore = create<MapState>((set) => ({
  dynamicLayers: [], 
  setDynamicLayers: (layers) => set({ dynamicLayers: layers }), 
  clearLayers: () => set({ dynamicLayers: [], hiddenLayers: [] as string[], styleHistories: {} }), 

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

  styleHistories: {},
  recordLayerSnapshot: (layerId) => set((state) => {
    const targetLayer = state.dynamicLayers.find((l) => l.id === layerId || l.layerId === layerId);
    if (!targetLayer) return {};

    const currentSnapshot = {
      activeStyleKey: targetLayer.activeStyleKey || 'default',
      renderStyles: JSON.parse(JSON.stringify(targetLayer.renderStyles || []))
    };

    const history = state.styleHistories[layerId] || [];
    const updatedHistory = [currentSnapshot, ...history].slice(0, 5);

    return {
      styleHistories: {
        ...state.styleHistories,
        [layerId]: updatedHistory
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
}));