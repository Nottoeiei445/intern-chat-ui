import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/store/useMapStore';

export const useMapEvents = (
  map: maplibregl.Map | null,
  selectedData: any, // 🌟 1. รับ selectedData เข้ามาเพื่อเช็คว่ามี Popup เปิดอยู่ไหม
  setSelectedData: (data: any) => void
) => {
  const { dynamicLayers } = useMapStore();
  
  // 🌟 ใช้ useRef เก็บข้อมูลจุดที่กำลังเป็น "สีเหลือง" เพื่อให้ลบถูกจุด
  const highlightedFeature = useRef<{ id: string | number; source: string; sourceLayer: string } | null>(null);

  useEffect(() => {
    if (!map) return;

    // ฟังก์ชันตัวช่วยสำหรับ "ล้างสีเหลือง"
    const clearHighlight = () => {
      if (highlightedFeature.current && map.getSource(highlightedFeature.current.source)) {
        map.setFeatureState(highlightedFeature.current, { hover: false });
        highlightedFeature.current = null;
      }
    };

    // 🌟 2. ดักจับเมื่อ Popup ถูกปิด (selectedData เปลี่ยนเป็น null) ให้เคลียร์สีเหลืองทิ้ง
    if (!selectedData) {
      clearHighlight();
    }

    const targetLayerIds = dynamicLayers.flatMap(layer => [
      `ai-layer-${layer.id}-fill`,
      `ai-layer-${layer.id}-line`,
      `ai-layer-${layer.id}-point`
    ]);

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const activeLayers = targetLayerIds.filter(id => map.getLayer(id));
      const features = map.queryRenderedFeatures(e.point, { layers: activeLayers });

      if (features.length > 0) {
        const feature = features[0];
        const fId = feature.id ?? feature.properties._id;

        if (fId !== undefined) {
          // ล้างสีเก่า -> แต้มสีเหลืองใหม่ให้จุดที่คลิก -> ล็อคเป้า!
          clearHighlight();
          highlightedFeature.current = { id: fId, source: feature.source, sourceLayer: feature.sourceLayer! };
          map.setFeatureState(highlightedFeature.current, { hover: true });

          setSelectedData({
            properties: feature.properties,
            lngLat: e.lngLat,
            point: e.point 
          });
        }
      } else {
        // ถ้าคลิกโดนที่ว่างเปล่า ให้ปิด Popup
        setSelectedData(null); 
      }
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (selectedData) return;

      const activeLayers = targetLayerIds.filter(id => map.getLayer(id));
      if (activeLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, { layers: activeLayers });

      if (features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';
        const feature = features[0];
        const fId = feature.id ?? feature.properties._id;

        if (fId !== undefined) {
          // ถ้าชี้จุดใหม่ ให้ย้ายสีเหลืองไป
          if (highlightedFeature.current?.id !== fId) {
            clearHighlight();
            highlightedFeature.current = { id: fId, source: feature.source, sourceLayer: feature.sourceLayer! };
            map.setFeatureState(highlightedFeature.current, { hover: true });
          }
        }
      } else {
        // ถ้าไม่โดนอะไรเลย ก็เอาสีเหลืองออก
        map.getCanvas().style.cursor = '';
        clearHighlight();
      }
    };

    const handleMouseOut = () => {
      // เอาเมาส์ออกนอกจอ ถ้าไม่มีข้อมูลเปิดอยู่ ก็ให้ล้างสีทิ้งซะ
      if (!selectedData) {
        map.getCanvas().style.cursor = '';
        clearHighlight();
      }
    };

    // --- ลงทะเบียน Events ---
    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    map.on('mouseout', handleMouseOut);

    // --- Cleanup ---
    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
      map.off('mouseout', handleMouseOut);
    };
  }, [map, dynamicLayers, selectedData, setSelectedData]); // 🌟 ดึง selectedData เข้ามาใน Dependency ด้วย
};