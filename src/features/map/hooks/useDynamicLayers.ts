// src/features/map/hooks/useDynamicLayers.ts

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { DynamicLayerPayload } from '../types';
import { mapService } from '../services/map.service';

export const useDynamicLayers = (map: maplibregl.Map | null, dynamicLayers: DynamicLayerPayload[]) => {
  // เก็บ ID ของเลเยอร์ที่ถูกวาดไปแล้ว เพื่อเอาไว้ตามเช็ดตามล้าง
  const activeLayerIds = useRef<string[]>([]);

  useEffect(() => {
    if (!map) return;

    // 🧹 1. ล้างของเก่าทิ้งทุกครั้งที่ข้อมูลเปลี่ยน (ป้องกันเลเยอร์ทับกันมั่ว)
    activeLayerIds.current.forEach(layerId => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(layerId)) map.removeSource(layerId);
    });
    activeLayerIds.current = [];

    dynamicLayers.forEach(layerConfig => {
      try {
        const sourceId = `ai-source-${layerConfig.id}`;
        const layerId = `ai-layer-${layerConfig.id}`;
        
        // ให้ Service ประกอบร่าง URL ให้
        const fullUrl = mapService.buildDynamicUrl(layerConfig);

        // --- กรณี WMS / TMS ---
        if (layerConfig.type === 'wms' || layerConfig.type === 'tms') {
          map.addSource(sourceId, {
            type: 'raster',
            tiles: [fullUrl],
            tileSize: 256
          });

          map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: { 'raster-opacity': layerConfig.style?.opacity || 0.8 }
          });

          activeLayerIds.current.push(layerId);
          activeLayerIds.current.push(sourceId); // เก็บชื่อไว้ลบตอนหลัง
        }
        
        // --- กรณี GeoJSON / Vector (เอาโครงสร้างพื้นฐานไปก่อน) ---
        // (ถ้าเพื่อนโบร๋ส่ง Vector มา เราสามารถมาเขียนลอจิกเพิ่มตรงนี้ได้)

      } catch (error) {
        console.error(`[Map] Failed to add dynamic layer ${layerConfig.id}:`, error);
      }
    });

  }, [map, dynamicLayers]);
};