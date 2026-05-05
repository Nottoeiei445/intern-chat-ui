// src/features/map/hooks/useDynamicLayers.ts

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { DynamicLayerPayload } from '../types';
import { mapService } from '../services/map.service';
import { useMapStore } from '@/store/useMapStore'; // 🚀 1. Import Store เข้ามา

export const useDynamicLayers = (map: maplibregl.Map | null, dynamicLayers: DynamicLayerPayload[]) => {
  // 🚀 2. ดึง apiKeys ออกมาจาก Store
  const { apiKeys } = useMapStore();
  
  const activeLayerIds = useRef<string[]>([]);

  useEffect(() => {
    if (!map) return;

    // ล้างเลเยอร์เก่าทิ้งก่อนวาดใหม่
    activeLayerIds.current.forEach(layerId => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(layerId)) map.removeSource(layerId);
    });
    activeLayerIds.current = [];

    dynamicLayers.forEach(layerConfig => {
      try {
        const sourceId = `ai-source-${layerConfig.id}`;
        const layerId = `ai-layer-${layerConfig.id}`;
        const fullUrl = mapService.buildDynamicUrl(layerConfig, apiKeys);

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

        //--- กรณี VECTOR TILE ---
        else if (layerConfig.type === 'vector') {
          map.addSource(sourceId, {
            type: 'vector',
            tiles: [fullUrl],
            ...(layerConfig.minzoom && { minzoom: layerConfig.minzoom }),
            ...(layerConfig.maxzoom && { maxzoom: layerConfig.maxzoom }),
            ...(layerConfig.bounds && { bounds: layerConfig.bounds })
          });

          map.addLayer({
            id: layerId,
            type: 'circle', //บังคับว่าเป็น Circle Layer เพราะเรากำลังทำแผนที่ไฟป่า จุดไฟป่ามันต้องเป็นจุดสิ
            source: sourceId,
            'source-layer': layerConfig.layerId || 'default',
            paint: { 
              'circle-radius': 4,
              'circle-color': '#ff0000', // สีแดงไฟป่า
              'circle-stroke-width': 1,
              'circle-stroke-color': '#ffffff'
            }
          });

          activeLayerIds.current.push(layerId);
          activeLayerIds.current.push(sourceId);

          //สั่งกล้องบินไปหาขอบเขตแผนที่อัตโนมัติ!
          if (layerConfig.bounds) {
            map.fitBounds(layerConfig.bounds, {
              padding: 50, // เว้นขอบจอนิดนึงไม่ให้ชิดไป
              duration: 1500 // แอนิเมชันบิน 1.5 วินาที
            });
          }
        }

        else if (layerConfig.type === 'geojson') {
          map.addSource(sourceId, {
            type: 'geojson',
            data: fullUrl // สำหรับ GeoJSON เอาลิงก์ที่ต่อ api_key แล้วยัดใส่ช่อง data ได้เลย
          });

          // สั่งวาด 
          map.addLayer({
            id: layerId,
            type: 'line', // ถ้าเป็นโพลิกอนอำเภอ มักจะวาดเป็นเส้นขอบ (line) หรือเติมสี (fill)
            source: sourceId,
            paint: { 
              'line-color': '#0000ff', // สีน้ำเงิน
              'line-width': 2
            }
          });
        }

      } catch (error) {
        console.error(`[Map] Failed to add dynamic layer ${layerConfig.id}:`, error);
      }
    });

  }, [map, dynamicLayers, apiKeys]); //4. อัปเดตเมื่อ map, เลเยอร์, หรือคีย์เปลี่ยน
};