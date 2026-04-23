// src/features/map/hooks/useDistrictLayer.ts
"use client"

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { DISTRICT_GEOJSON_URL } from '../config/map.config';

export const useDistrictLayer = (
  map: maplibregl.Map | null,
  isActive: boolean, // 🚀 เพิ่มสถานะเปิด/ปิด
  selectedDistrict: any,
  onDistrictClick: (properties: any) => void
) => {
  const clickHandler = useRef(onDistrictClick);
  useEffect(() => {
    clickHandler.current = onDistrictClick;
  }, [onDistrictClick]);

  useEffect(() => {
    // 🚀 ด่านสกัด
    if (!map || !isActive) return;

    const layerIdFill = 'district-layer-fill';
    const layerIdHighlight = 'district-layer-highlight';
    const layerIdLine = 'district-layer-line';
    const sourceId = 'district-source';

    const loadDistrictLayer = () => {
      if (map.getSource(sourceId)) return;

      map.addSource(sourceId, {
        type: 'geojson',
        data: DISTRICT_GEOJSON_URL
      });

      map.addLayer({
        id: layerIdFill,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.6 }
      });

      map.addLayer({
        id: layerIdHighlight,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 1.0 },
        filter: ['==', '_id', ''] 
      });

      map.addLayer({
        id: layerIdLine,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': '#60a5fa', 'line-width': 0.5, 'line-opacity': 0.4 }
      });

      map.on('click', layerIdFill, (e) => {
        if (e.features && e.features.length > 0) {
          clickHandler.current(e.features[0].properties);
        }
      });

      map.on('mouseenter', layerIdFill, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', layerIdFill, () => map.getCanvas().style.cursor = '');
    };

    if (map.isStyleLoaded()) loadDistrictLayer();
    else map.once('load', loadDistrictLayer);

    // 🚀 Cleanup ล้างแผนที่เมื่อปิดปุ่ม
    return () => {
      if (map.getLayer(layerIdFill)) map.removeLayer(layerIdFill);
      if (map.getLayer(layerIdHighlight)) map.removeLayer(layerIdHighlight);
      if (map.getLayer(layerIdLine)) map.removeLayer(layerIdLine);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, isActive]); // 🚀 อิงค่าตาม isActive

  useEffect(() => {
    if (!map || !isActive || !map.getLayer('district-layer-highlight')) return;
    
    const districtId = selectedDistrict?._id || selectedDistrict?._id;

    if (selectedDistrict && districtId) {
      map.setFilter('district-layer-highlight', ['==', ['get', '_id'], districtId]);
    } else {
      map.setFilter('district-layer-highlight', ['==', ['get', '_id'], '']);
    }
  }, [map, selectedDistrict, isActive]);
};