// src/features/map/hooks/useProvinceLayer.ts
"use client"

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { PROVINCE_GEOJSON_URL } from '../config/map.config';

export const useProvinceLayer = (
  map: maplibregl.Map | null,
  isActive: boolean, // 🚀 เพิ่มสถานะเปิด/ปิด
  selectedProvince: any,
  onProvinceClick: (properties: any) => void
) => {
  const clickHandler = useRef(onProvinceClick);
  useEffect(() => {
    clickHandler.current = onProvinceClick;
  }, [onProvinceClick]);

  useEffect(() => {
    // 🚀 ถ้าไม่ได้เปืดใช้งาน ให้หยุดและเคลียร์แผนที่
    if (!map || !isActive) return;

    const layerIdFill = 'province-layer-fill';
    const layerIdHighlight = 'province-layer-highlight';
    const layerIdLine = 'province-layer-line';
    const sourceId = 'province-source';

    const loadProvinceLayer = () => {
      if (map.getSource(sourceId)) return; 

      map.addSource(sourceId, {
        type: 'geojson',
        data: PROVINCE_GEOJSON_URL
      });

      map.addLayer({
        id: layerIdFill,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': '#4ade80', 'fill-opacity': 0.9 }
      });

      map.addLayer({
        id: layerIdHighlight,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 1 },
        filter: ['==', '_id', ''] 
      });

      map.addLayer({
        id: layerIdLine,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': '#ffffff', 'line-width': 1 }
      });

      map.on('click', layerIdFill, (e) => {
        if (e.features && e.features.length > 0) {
          clickHandler.current(e.features[0].properties);
        }
      });

      map.on('mouseenter', layerIdFill, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', layerIdFill, () => map.getCanvas().style.cursor = '');
    };

    if (map.isStyleLoaded()) loadProvinceLayer();
    else map.once('load', loadProvinceLayer);

    // 🚀 Cleanup: ลบออกเมื่อ User กดปิดปุ่ม
    return () => {
      if (map.getLayer(layerIdFill)) map.removeLayer(layerIdFill);
      if (map.getLayer(layerIdHighlight)) map.removeLayer(layerIdHighlight);
      if (map.getLayer(layerIdLine)) map.removeLayer(layerIdLine);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isActive]); // 🚀 อิงค่าตาม isActive

  useEffect(() => {
    if (!map || !isActive || !map.getLayer('province-layer-highlight')) return;

    if (selectedProvince && selectedProvince._id) {
      map.setFilter('province-layer-highlight', ['==', '_id', selectedProvince._id]);
    } else {
      map.setFilter('province-layer-highlight', ['==', '_id', '']);
    }
  }, [map, selectedProvince, isActive]);
};