"use client"

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button'; 
import { LocateFixed, X } from 'lucide-react';
import { useHazardLayer } from '../hooks/useHazardLayer';
import { useProvinceLayer } from '../hooks/useProvinceLayer'; 
import { HazardType, TimeRange, MapMode } from '../types';
import { useDistrictLayer } from '../hooks/useDistrictLayer';

// 🚀 Interface ถูกต้องแล้ว
interface MapLibreProps {
  activeHazard: HazardType | null;
  timeRange: TimeRange;
  mapMode: MapMode;
  activeBoundary: 'province' | 'district' | null;
}

// 🚀 แก้ตรงนี้ครับ: เติม activeBoundary เข้าไปในวงเล็บ
export const MapLibre = ({ activeHazard, timeRange, mapMode, activeBoundary }: MapLibreProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  
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
        
        // เพิ่มหมุดชั่วคราวบอกตำแหน่งปัจจุบัน
        new maplibregl.Marker({ color: '#FF0000' })
          .setLngLat([longitude, latitude])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML("<b>คุณอยู่ที่นี่</b>"))
          .addTo(map);
          
      }, (error) => {
        alert("Could not get your location. Please allow location access and try again.");
      });
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return; 

    // สร้างแผนที่
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

  // 🚀 เรียกใช้ 2 เลเยอร์พร้อมกัน
  useProvinceLayer(map, activeBoundary === 'province', selectedData, setSelectedData);
  useDistrictLayer(map, activeBoundary === 'district', selectedData, setSelectedData);
  useHazardLayer(map, activeHazard, timeRange, mapMode);

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-lg overflow-hidden font-sans bg-gray-100">
      
      {selectedData && (
        <div className="absolute top-4 right-4 z-20 bg-white shadow-xl rounded-lg w-80 max-h-[90%] flex flex-col border border-gray-200 text-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
          
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
            <h3 className="font-semibold text-gray-800 text-base">Identify results</h3>
            <button onClick={() => setSelectedData(null)} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md p-1 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-2 px-4 py-2 border-b border-gray-100 text-xs bg-white">
            <span className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-medium">Properties</span>
          </div>

          <div className="flex px-4 py-2 bg-gray-50/80 text-xs font-semibold text-gray-500 border-b border-gray-100">
            <div className="w-1/3">field</div>
            <div className="w-2/3 pl-2">value</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-white scrollbar-thin scrollbar-thumb-gray-200">
            {Object.entries(selectedData).map(([key, val]) => (
              <div key={key} className="flex gap-2 border-b border-gray-50 pb-2 hover:bg-gray-50 transition">
                <div className="w-1/3 text-gray-500 font-medium truncate" title={key}>{key}</div>
                <div className="w-2/3 pl-2 text-gray-800 break-words">
                  {val !== null && val !== undefined ? String(val) : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ปุ่ม Locate Me */}
      <div className="absolute bottom-6 right-6 z-10">
        <Button 
          variant="secondary"
          size="icon" 
          className="rounded-full w-12 h-12 shadow-lg bg-white hover:bg-gray-100 border border-slate-200"
          onClick={handleLocateMe}
        >
          <LocateFixed className="w-6 h-6 text-blue-600" />
        </Button>
      </div>

      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};