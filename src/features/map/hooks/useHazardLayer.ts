// src/features/map/hooks/useHazardLayer.ts
"use client"

import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { mapService } from '../services/map.service';
import { HazardType, TimeRange, MapMode } from '../types';

export const useHazardLayer = (
  map: maplibregl.Map | null,
  type: HazardType | null, // 🚀 1. อนุญาตให้ค่าเป็น null ได้ (เพื่อบอกว่ายังไม่ได้เลือก)
  days: TimeRange,
  mapMode: MapMode = 'wms'
) => {
  useEffect(() => {
    // 🚀 2. ด่านสกัด: ถ้า map ยังไม่มา หรือ User ยังไม่เลือก type ให้หยุดทำงานและไม่โหลดข้อมูลใดๆ!
    if (!map || !type) return;

    const layerId = `hazard-layer`;
    const sourceId = `hazard-source`;

    const updateLayer = () => {
      const tilesUrl = mapService.getTileUrls(mapMode, type, days);
      if (tilesUrl.length === 0) {
        console.warn(`[MAP_LOG] No URLs found for ${type} in ${mapMode} mode.`);
        return;
      }

      // Cleanup existing resources
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      // 1. Setup Source
      if (mapMode === 'vector') {
        const isTileJSON = !tilesUrl[0].includes('{z}');
        map.addSource(sourceId, {
          type: 'vector',
          ...(isTileJSON ? { url: tilesUrl[0] } : { tiles: tilesUrl })
          // Note: tileSize 512 is removed for vector to avoid TS errors
        });
      } else {
        map.addSource(sourceId, {
          type: 'raster',
          tiles: tilesUrl,
          tileSize: 256
        });
      }

      // 2. Setup Layer based on Mode
      if (mapMode === 'vector') {
        const sourceLayer = mapService.getSourceLayer(type, days);
        const color = mapService.getLayerStyle(type);

        // Standardizing VIIRS as points (circle) and others as areas (fill)
        if (type === 'viirs') {
          map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            'source-layer': sourceLayer,
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 8],
              'circle-color': color,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#ffffff'
            }
          });
        } else {
          map.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            'source-layer': sourceLayer,
            paint: {
              'fill-color': color,
              'fill-opacity': 0.6,
              'fill-outline-color': '#ffffff'
            }
          });
        }
      } else {
        // Raster Layer (WMS/TMS)
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: { 'raster-opacity': 0.6 }
        });
      }

      console.log(`✅ [SUCCESS] Map Layer Updated: ${type.toUpperCase()} | Mode: ${mapMode.toUpperCase()}`);
    };

    if (map.isStyleLoaded()) updateLayer();
    else map.once('load', updateLayer);

    return () => {
      // 🚀 Cleanup ตรงนี้จะทำงานตอนเปลี่ยนหน้า หรือตอนที่ User กดปิด Hazard (type เป็น null)
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, type, days, mapMode]);
};