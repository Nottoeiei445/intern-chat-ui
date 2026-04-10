import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { HAZARD_URLS, HazardType, TimeRange } from '../config/map.config';

export const useHazardLayer = (map: maplibregl.Map | null, type: HazardType, days: TimeRange) => {
  useEffect(() => {
    if (!map) return;

    const layerId = `hazard-raster-layer`;
    const sourceId = `hazard-raster-source`;

    const updateLayer = () => {
      // 1. ดึง URL ของ WMS Tiles ที่เตรียมไว้
      const tilesUrl = HAZARD_URLS[type][days];

      // 2. 🧹 ล้างของเก่าทิ้งก่อน
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      // 3. เพิ่ม Source แบบ 'raster' (สำหรับ WMS)
      map.addSource(sourceId, {
        type: 'raster',
        tiles: tilesUrl,
        tileSize: 256
      });

      // 4. วาดเลเยอร์แบบ 'raster'
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': 0.55, 
          'raster-fade-duration': 300 
        }
      });

      console.log(`✅ Loaded WMS: ${type} (${days} days)`);
    };

    if (map.isStyleLoaded()) {
      updateLayer();
    } else {
      map.on('load', updateLayer);
    }

    // 🧹 Cleanup เมื่อสลับปุ่ม
    return () => {
      if (map) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
    };
  }, [map, type, days]); 
};