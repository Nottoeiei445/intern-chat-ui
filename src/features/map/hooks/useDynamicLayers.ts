// src/features/map/hooks/useDynamicLayers.ts

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { DynamicLayerPayload } from '../types';
import { mapService } from '../services/map.service';
import { useMapStore } from '@/store/useMapStore';

export const useDynamicLayers = (map: maplibregl.Map | null, dynamicLayers: DynamicLayerPayload[]) => {
  const { apiKeys } = useMapStore();
  const activeLayerIds = useRef<string[]>([]);

  useEffect(() => {
    if (!map) return;

    // ฟังก์ชันล้างเลเยอร์
    const clearLayers = () => {
      if (!map) return; 

      try {
        if (!map.getStyle || !map.getStyle()) return;

        activeLayerIds.current.forEach(id => {
          if (id.startsWith('ai-layer-') && map.getLayer(id)) {
            map.removeLayer(id);
          }
        });
        activeLayerIds.current.forEach(id => {
          if (id.startsWith('ai-source-') && map.getSource(id)) {
            map.removeSource(id);
          }
        });
      } catch (error) {
        console.warn("MapLibre: แผนที่ถูกทำลายไปแล้ว ข้ามการลบเลเยอร์");
      } finally {
        activeLayerIds.current = [];
      }
    };

    // ฟังก์ชันวาดเลเยอร์
    const renderLayers = () => {
      if (!map.getStyle()) return; 

      dynamicLayers.forEach(layerConfig => {
        try {
          const sourceId = `ai-source-${layerConfig.id}`;
          const layerId = `ai-layer-${layerConfig.id}`;
          
          const fullUrl = mapService.buildDynamicUrl(layerConfig, apiKeys);

          if (!map.getSource(sourceId)) {
            if (layerConfig.type === 'wms' || layerConfig.type === 'tms'|| layerConfig.type === 'wmts') {
              const titleSize = layerConfig.type === 'wmts' ? 512 : 256;
              map.addSource(sourceId, { type: 'raster', tiles: [fullUrl], tileSize: titleSize });
            } else if (layerConfig.type === 'vector') {
              map.addSource(sourceId, {
                type: 'vector',
                tiles: [fullUrl],
                ...(layerConfig.minzoom && { minzoom: layerConfig.minzoom }),
                ...(layerConfig.maxzoom && { maxzoom: layerConfig.maxzoom }),
                ...(layerConfig.bounds && { bounds: layerConfig.bounds })
              });
            } else if (layerConfig.type === 'geojson') {
              map.addSource(sourceId, { type: 'geojson', data: fullUrl });
            }
            if (!activeLayerIds.current.includes(sourceId)) activeLayerIds.current.push(sourceId);
          }

          if (!map.getLayer(layerId)) {
            if (layerConfig.type === 'wms' || layerConfig.type === 'tms' || layerConfig.type === 'wmts') {
              map.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: { 'raster-opacity': layerConfig.style?.opacity || 0.8 }
              });
            } else if (layerConfig.type === 'vector') {
              map.addLayer({
                id: layerId,
                type: 'heatmap',
                source: sourceId,
                'source-layer': layerConfig.layerId || 'default',
                paint: { 
                  'heatmap-weight': 1,
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                  'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(33,102,172,0)', 0.2, 'rgb(255,255,204)', 0.4, 'rgb(255,237,160)',
                    0.6, 'rgb(254,178,76)', 0.8, 'rgb(252,78,42)', 1, 'rgb(189,0,38)'
                  ],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
                  'heatmap-opacity': 0.8
                }
              });
              if (layerConfig.bounds) map.fitBounds(layerConfig.bounds, { padding: 50, duration: 1500 });
            } else if (layerConfig.type === 'geojson') {
              map.addLayer({
                id: layerId,
                type: 'line', 
                source: sourceId,
                paint: { 'line-color': '#0000ff', 'line-width': 2 }
              });
            }
            if (!activeLayerIds.current.includes(layerId)) activeLayerIds.current.push(layerId);
          }
        } catch (error) {
          console.error(`[Map] Failed to add dynamic layer ${layerConfig.id}:`, error);
        }
      });
    };

    // ตอนแรกเริ่ม
    clearLayers();
    renderLayers();

    const handleStyleData = () => {
      if (!map.getStyle()) return;

      const isMissingSources = dynamicLayers.some(layer => !map.getSource(`ai-source-${layer.id}`));
      
      if (isMissingSources) {
        renderLayers();
      }
    };
    
    map.on('styledata', handleStyleData);

    return () => {
      map.off('styledata', handleStyleData);
      clearLayers();
    };

  }, [map, dynamicLayers, apiKeys]); 
};