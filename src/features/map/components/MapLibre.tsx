"use client"

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button'; 
import { LocateFixed } from 'lucide-react';
import { useHazardLayer } from '../hooks/useHazardLayer';
import { HazardType, TimeRange, MapMode } from '../types';

interface MapLibreProps {
  activeHazard: HazardType;
  timeRange: TimeRange;
  mapMode: MapMode;
}

export const MapLibre = ({ activeHazard, timeRange, mapMode }: MapLibreProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

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
        
        // เพิ่มหมุดชั่วคราวบอกตำแหน่งปัจจุบัน
        new maplibregl.Marker({ color: '#FF0000' })
          .setLngLat([longitude, latitude])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML("<b>คุณอยู่ที่นี่</b>"))
          .addTo(map);
          
      }, (error) => {
        alert("ไม่สามารถเข้าถึงตำแหน่งได้ครับ");
      });
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return; 

    // สร้างแผนที่ - จะเริ่มที่พิกัดที่ตั้งไว้เสมอ ไม่เด้งไปไหนเองแล้ว
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current, 
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [100.5200, 13.7500],
      zoom: 6,
    });

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, []);

  // เสียบปลั๊กเรียกชั้นข้อมูล GISTDA
  useHazardLayer(map, activeHazard, timeRange, mapMode);

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-lg overflow-hidden">
      <div className="absolute bottom-6 right-6 z-10">
        <Button 
          variant="secondary"
          size="icon" 
          className="rounded-full w-12 h-12 shadow-lg bg-white hover:bg-gray-100"
          onClick={handleLocateMe}
        >
          <LocateFixed className="w-6 h-6 text-blue-600" />
        </Button>
      </div>

      <div 
        ref={mapContainer} 
        className="w-full h-full" 
      />
    </div>
  );
};