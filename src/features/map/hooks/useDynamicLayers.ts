// src/features/map/hooks/useDynamicLayers.ts

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { DynamicLayerPayload } from '../types';
import { mapService } from '../services/map.service';
import { useMapStore } from '@/store/useMapStore';

export const useDynamicLayers = (map: maplibregl.Map | null, dynamicLayers: DynamicLayerPayload[]) => {
  const { apiKeys, hiddenLayers, isBaseMapVisible } = useMapStore();
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
            } 
            else if (layerConfig.type === 'vector' || layerConfig.type === 'vector_tile') {
              map.addSource(sourceId, {
                type: 'vector',
                tiles: [fullUrl], 
                promoteId: '_id', 
                ...(layerConfig.minzoom !== undefined && { minzoom: layerConfig.minzoom }),
                ...(layerConfig.maxzoom !== undefined && { maxzoom: layerConfig.maxzoom }),
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
            } 
            else if (layerConfig.type === 'vector' || layerConfig.type === 'vector_tile') {
              const urlPathId = layerConfig.baseUrl ? layerConfig.baseUrl.split('?')[0].split('/').pop() : null;
              const sourceLayerName = layerConfig.layerId || urlPathId || 'core';

              const fillLayerId = `${layerId}-fill`;
              map.addLayer({
                id: fillLayerId,
                type: 'fill',
                source: sourceId,
                'source-layer': sourceLayerName,
                paint: { 
                  'fill-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#facc15', '#74c476'], 
                  'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.6],   
                  'fill-outline-color': '#ffffff'
                }
              });

              const lineLayerId = `${layerId}-line`;
              map.addLayer({
                id: lineLayerId,
                type: 'line',
                source: sourceId,
                'source-layer': sourceLayerName,
                paint: { 
                  'line-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#facc15', '#3b82f6'],
                  'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 4, 2] 
                }
              });

              const pointLayerId = `${layerId}-point`;
              map.addLayer({
                id: pointLayerId,
                type: 'circle',
                source: sourceId,
                'source-layer': sourceLayerName,
                paint: { 
                  'circle-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#facc15', '#ef4444'],
                  'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 8, 5],
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#ffffff'
                }
              });

              if (!activeLayerIds.current.includes(fillLayerId)) activeLayerIds.current.push(fillLayerId);
              if (!activeLayerIds.current.includes(lineLayerId)) activeLayerIds.current.push(lineLayerId);
              if (!activeLayerIds.current.includes(pointLayerId)) activeLayerIds.current.push(pointLayerId);

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

    if (map.getStyle()) {
      dynamicLayers.forEach(layer => {
        const visibility = hiddenLayers.includes(layer.id) ? 'none' : 'visible';

        const targetLayerIds = [
          `ai-layer-${layer.id}`,        // สำหรับ Raster, GeoJSON
          `ai-layer-${layer.id}-fill`,   // สำหรับ Vector polygon
          `ai-layer-${layer.id}-line`,   // สำหรับ Vector line
          `ai-layer-${layer.id}-point`   // สำหรับ Vector point
        ];

        targetLayerIds.forEach(targetId => {
          if (map.getLayer(targetId)) {
            map.setLayoutProperty(targetId, 'visibility', visibility);
          }
        });
      });
    }

    if (map.getStyle()) {
      const style = map.getStyle();
      if (style && style.layers) {
        style.layers.forEach(layer => {
          if (!layer.id.startsWith('ai-layer-')) {
             const visibility = isBaseMapVisible ? 'visible' : 'none';
             map.setLayoutProperty(layer.id, 'visibility', visibility);
          }
        });
      }
    }

    return () => {
      map.off('styledata', handleStyleData);
      clearLayers();
    };

  }, [map, dynamicLayers, apiKeys, hiddenLayers, isBaseMapVisible]); 
};