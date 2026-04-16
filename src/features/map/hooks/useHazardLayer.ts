// useHazardLayer.ts
import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { HAZARD_URLS, HAZARD_TMS_URLS, HAZARD_VECTOR_URLS } from '../config/map.config'; // อย่าลืม Import VECTOR เข้ามาด้วย
import { HazardType, TimeRange, MapMode } from '../types';

export const useHazardLayer = (
  map: maplibregl.Map | null,
  type: HazardType,
  days: TimeRange,
  mapMode: MapMode = 'wms'
) => {
  useEffect(() => {
    if (!map) return;

    const layerId = `hazard-layer`; // เปลี่ยนชื่อให้เป็นกลางๆ ไม่ระบุว่า raster แล้ว
    const sourceId = `hazard-source`;

    const updateLayer = () => {
      // 1. ดึง URL ของ Tiles ตามโหมด
      const tilesUrl = mapMode === 'tms'
        ? HAZARD_TMS_URLS[type][days]
        : mapMode === 'vector'
        ? HAZARD_VECTOR_URLS[type][days]
        : HAZARD_URLS[type][days];

      if (!tilesUrl || tilesUrl.length === 0) return;

      // 2. 🧹 ล้างของเก่าทิ้งก่อน
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      // 3. เพิ่ม Source
      map.addSource(sourceId, {
        type: mapMode === 'vector' ? 'vector' : 'raster', // ถ้าเป็นโหมด vector ต้องเปลี่ยน type
        tiles: tilesUrl,
        tileSize: mapMode === 'vector' ? 512 : 256
      });

      // 4. วาดเลเยอร์
      if (mapMode === 'vector') {
        // 🔥 โหมด Vector: ต้องระบายสีเอง
        map.addLayer({
          id: layerId,
          type: 'fill', // สมมติว่าน้ำท่วม/ไฟป่า เป็นรูปพื้นที่ (Polygon)
          source: sourceId,
          'source-layer': 'default', // ⚠️ สำคัญมาก! GISTDA อาจจะใช้ชื่ออื่น ถ้าแผนที่ไม่ขึ้นต้องมาเปลี่ยนตรงนี้ (เช่น 'viirs', 'flood')
          paint: {
            'fill-color': type === 'viirs' ? '#ef4444' : type === 'flood' ? '#3b82f6' : '#f59e0b',
            'fill-opacity': 0.6,
            'fill-outline-color': '#ffffff' // ตัดขอบให้สวยๆ
          }
        });
      } else {
        // 🖼️ โหมด Raster (WMS/TMS)
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': 0.6,
            'raster-fade-duration': 300
          }
        });
      }

      console.log(`✅ Loaded ${mapMode.toUpperCase()}: ${type} (${days} days)`);
    };

    if (map.isStyleLoaded()) {
      updateLayer();
    } else {
      map.once('load', updateLayer);
    }

    return () => {
      if (map) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, type, days, mapMode]);
};