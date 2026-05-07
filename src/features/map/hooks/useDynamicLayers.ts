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
          activeLayerIds.current.push(sourceId);
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

          // เปลี่ยนการ Render เป็น Heatmap ตรงนี้
          map.addLayer({
            id: layerId,
            type: 'heatmap',
            source: sourceId,
            'source-layer': layerConfig.layerId || 'default',
            paint: { 
              // กำหนดน้ำหนักของแต่ละจุด (ถ้ามีข้อมูล magnitude ใส่แทน 1 ได้)
              'heatmap-weight': 1,
              // ปรับความเข้มข้นตามระดับการซูม (ยิ่งซูมยิ่งเข้ม)
              'heatmap-intensity': [
                'interpolate', ['linear'], ['zoom'],
                0, 1,
                9, 3
              ],
              // ไล่เฉดสีจากใสไปหาแดงเข้ม
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(33,102,172,0)',
                0.2, 'rgb(255,255,204)',
                0.4, 'rgb(255,237,160)',
                0.6, 'rgb(254,178,76)',
                0.8, 'rgb(252,78,42)',
                1, 'rgb(189,0,38)'
              ],
              // รัศมีของความร้อน ยิ่งซูมใกล้รัศมียิ่งใหญ่
              'heatmap-radius': [
                'interpolate', ['linear'], ['zoom'],
                0, 2,
                9, 20
              ],
              // ความโปร่งแสงรวม
              'heatmap-opacity': 0.8
            }
          });

          activeLayerIds.current.push(layerId);
          activeLayerIds.current.push(sourceId);

          // สั่งกล้องบินไปหาขอบเขตแผนที่อัตโนมัติ
          if (layerConfig.bounds) {
            map.fitBounds(layerConfig.bounds, {
              padding: 50,
              duration: 1500
            });
          }
        }

        //--- กรณี GEOJSON ---
        else if (layerConfig.type === 'geojson') {
          map.addSource(sourceId, {
            type: 'geojson',
            data: fullUrl
          });

          map.addLayer({
            id: layerId,
            type: 'line', 
            source: sourceId,
            paint: { 
              'line-color': '#0000ff',
              'line-width': 2
            }
          });
          
          activeLayerIds.current.push(layerId);
          activeLayerIds.current.push(sourceId);
        }

      } catch (error) {
        console.error(`[Map] Failed to add dynamic layer ${layerConfig.id}:`, error);
      }
    });

  }, [map, dynamicLayers, apiKeys]); 
};