// src/features/map/hooks/useMapStyleActions.ts
import { useMapStore } from '@/store/useMapStore';

export const useMapStyleActions = () => {
  const styleHistories = useMapStore((state) => state.styleHistories);

  const undoLayerStyle = async (layerId: string) => {
    const history = styleHistories[layerId] || [];
    if (history.length === 0) return;

    const previousSnapshot = history[0];
    const remainingHistory = history.slice(1);

    useMapStore.setState((state) => ({
      dynamicLayers: state.dynamicLayers.map((layer) =>
        (layer.id === layerId || layer.layerId === layerId)
          ? {
              ...layer,
              activeStyleKey: previousSnapshot.activeStyleKey,
              renderStyles: previousSnapshot.renderStyles
            }
          : layer
      ),
      styleHistories: {
        ...state.styleHistories,
        [layerId]: remainingHistory,
      },
    }));

    const currentActiveChatId = useMapStore.getState().activeChatId;

    if (currentActiveChatId && !currentActiveChatId.startsWith('session_')) {
      try {
        console.log(`[Sync Style] Sending undo activeStyleKey: ${previousSnapshot.activeStyleKey} to backend`);
        // await chatService.updateLayerStyle(currentActiveChatId, layerId, previousSnapshot.activeStyleKey);
      } catch (error) {
        console.error('[Sync Style] Failed to sync style with backend:', error);
      }
    }
  };

  return {
    styleHistories,
    undoLayerStyle,
  };
};