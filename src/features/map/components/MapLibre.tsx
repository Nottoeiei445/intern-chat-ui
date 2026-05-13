"use client"

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button'; 
import { LocateFixed, X } from 'lucide-react';
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

  useEffect(() => {
    if (!map) return;
    const isDark = resolvedTheme === 'dark';
    const newStyle = isDark 
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
      
    map.setStyle(newStyle);
  }, [resolvedTheme, map]);

  useDynamicLayers(map, dynamicLayers);
  useMapEvents(map, selectedData, setSelectedData);

  // สร้าง Ref เอาไว้เก็บตัว Popup ของ MapLibre จะได้ลบ/สร้างใหม่ได้ถูกต้อง
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!map) return;

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
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
        anchor: anchorPosition, 
        className: resolvedTheme === 'dark' ? 'dark-popup' : '' 
      })
        .setLngLat(selectedData.lngLat)
        .setDOMContent(popupNode)
        .addTo(map);

      popup.on('close', () => {
        setSelectedData(null);
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