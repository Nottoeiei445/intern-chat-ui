// src/features/map/components/MapLibre.tsx
"use client"

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button'; 
import { LocateFixed } from 'lucide-react';
import { HazardType, TimeRange, MapMode } from '../types';
import { useDynamicLayers } from '../hooks/useDynamicLayers';
import { DynamicLayerPayload } from '../types';
import { useTheme } from 'next-themes';
import { useMapEvents } from '../hooks/useMapEvents';
import { FeaturePopup } from './FeaturePopup';
import { createRoot } from 'react-dom/client';

interface MapLibreProps {
  activeHazard: HazardType | null;
  timeRange: TimeRange;
  mapMode: MapMode;
  activeBoundary: 'province' | 'district' | null;
  dynamicLayers?: DynamicLayerPayload[];
}

export const MapLibre = ({ activeBoundary, dynamicLayers = [] }: MapLibreProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  
  const { resolvedTheme } = useTheme();
  
  useEffect(() => {
    setSelectedData(null);
  }, [activeBoundary]);

  const handleLocateMe = () => {
    if ("geolocation" in navigator && map) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { longitude, latitude } = position.coords;
        map.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          duration: 2000,
          essential: true
        });
        
        new maplibregl.Marker({ color: '#FF0000' })
          .setLngLat([longitude, latitude])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML("<b>คุณอยู่ที่นี่</b>"))
          .addTo(map);
          
      }, (error) => {
        alert("Could not get your location. Please allow location access and try again.");
      });
    }
  };

  // บล็อกสร้างแผนที่รอบแรกตอนเปิดเว็บ (คงเดิมไว้)
  useEffect(() => {
    if (!mapContainer.current) return; 

    const isDark = resolvedTheme === 'dark';
    const initialStyle = isDark 
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current, 
      style: initialStyle,
      center: [100.5200, 13.7500],
      zoom: 6,
    });

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, []); 

  // 🌟 [CHANGED]: บล็อกเปลี่ยนสไตล์แผนที่ฐานอัจฉริยะแบบไร้รอยต่อ (Style JSON Injection)
  useEffect(() => {
    if (!map) return;
    
    const changeThemeSafely = async () => {
      try {
        const isDark = resolvedTheme === 'dark';
        const newStyleUrl = isDark 
          ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
          : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
          
        // 1. ดึงข้อมูลสไตล์ผืนแผ่นปัจจุบันในหน้าจอที่เลเยอร์ AI สิงอยู่ขึ้นมาดักไว้
        const currentStyle = map.getStyle();
        
        // 2. ยิงไป Fetch โครงสร้างสไตล์ของธีมใหม่มารอไว้ใน RAM ของเครื่อง
        const response = await fetch(newStyleUrl);
        const newStyleJson = await response.json();
        
        if (currentStyle) {
          // 3. คว้าเฉพาะ Sources ที่สร้างจากหน้าบ้าน (ตัวที่มีคำว่า ai-source- นำหน้า)
          const myCustomSources = Object.keys(currentStyle.sources)
            .filter(key => key.startsWith('ai-source-'))
            .reduce((obj, key) => ({ ...obj, [key]: currentStyle.sources[key] }), {});
            
          // 4. คว้าเฉพาะ Layers ที่สร้างจากหน้าบ้าน (ตัวที่มีคำว่า ai-layer- นำหน้า)
          const myCustomLayers = currentStyle.layers.filter((l: any) => 
            l.id.startsWith('ai-layer-')
          );
          
          // 5. จัดแจงเย็บรวมร่าง: เอาข้อมูล Custom แปะพ่วงเข้าไปท้ายก้อนธีมใหม่ดิ่งตรงเนื้อสกิน
          newStyleJson.sources = { ...newStyleJson.sources, ...myCustomSources };
          newStyleJson.layers = [...newStyleJson.layers, ...myCustomLayers];
        }
        
        // 6. สั่งอัปเดตสไตล์ด้วยก้อนวัตถุ JSON (ระบบสั่งตรวจ Diffing จะทำงานทันที ข้อมูลเดิมไม่โหลดใหม่)
        map.setStyle(newStyleJson);
        
      } catch (error) {
        console.error("[Theme Switch Error] Failed to inject custom layers:", error);
        // Fallback กันตาย: ถ้าระบบเครือข่าย Fetch พัง ให้สับธีมด้วยวิธีส่ง URL ทื่อๆ แบบเดิมเพื่อไม่ให้แอปค้าง
        const isDark = resolvedTheme === 'dark';
        const fallbackStyle = isDark 
          ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
          : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
        map.setStyle(fallbackStyle);
      }
    };

    changeThemeSafely();
  }, [resolvedTheme, map]);

  useDynamicLayers(map, dynamicLayers);
  useMapEvents(map, selectedData, setSelectedData);

  const popupRef = useRef<maplibregl.Popup | null>(null);
  const isUpdatingPopup = useRef(false);

  useEffect(() => {
    if (!map) return;

    if (popupRef.current) {
      isUpdatingPopup.current = true; 
      popupRef.current.remove();      
      popupRef.current = null;
      isUpdatingPopup.current = false; 
    }

    if (selectedData) {
      const popupNode = document.createElement('div');
      const root = createRoot(popupNode);
      root.render(<FeaturePopup properties={selectedData.properties} />);

      const anchorPosition = selectedData.point.y < 350 ? 'top' : 'bottom';

      const popup = new maplibregl.Popup({ 
        maxWidth: '320px',
        closeButton: true,
        focusAfterOpen: false,
        closeOnClick: false,
        anchor: anchorPosition, 
        className: resolvedTheme === 'dark' ? 'dark-popup' : '' 
      })
        .setLngLat(selectedData.lngLat)
        .setDOMContent(popupNode)
        .addTo(map);

      popup.on('close', () => {
        if (!isUpdatingPopup.current) {
          setSelectedData(null);
        }
        setTimeout(() => root.unmount(), 0); 
      });

      popupRef.current = popup;
    }
  }, [selectedData, map, resolvedTheme]);

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-lg overflow-hidden font-sans bg-background">

      <div className="absolute bottom-6 right-6 z-10">
        <Button 
          variant="secondary"
          size="icon" 
          className="rounded-full w-12 h-12 shadow-lg bg-background hover:bg-accent border border-border"
          onClick={handleLocateMe}
        >
          <LocateFixed className="w-6 h-6 text-primary" />
        </Button>
      </div>

      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};