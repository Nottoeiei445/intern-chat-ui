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

interface MapLibreProps {
  activeHazard: HazardType | null;
  timeRange: TimeRange;
  mapMode: MapMode;
  activeBoundary: 'province' | 'district' | null;
  dynamicLayers?: DynamicLayerPayload[];
}

export const MapLibre = ({ activeHazard, timeRange, mapMode, activeBoundary, dynamicLayers = [] }: MapLibreProps) => {
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

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-lg overflow-hidden font-sans bg-background">
      
      {selectedData && (
        <div className="absolute top-4 right-4 z-20 bg-card shadow-2xl rounded-lg w-80 max-h-[90%] flex flex-col border border-border text-sm overflow-hidden animate-in fade-in slide-in-from-right-4">
          
          <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-muted/50">
            <h3 className="text-foreground text-base font-semibold">Identify results</h3>
            <button onClick={() => setSelectedData(null)} className="text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/80 rounded-md p-1 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-2 px-4 py-2 border-b border-border text-xs bg-card">
            <span className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full font-medium">Properties</span>
          </div>

          <div className="flex px-4 py-2 bg-muted/30 text-xs text-muted-foreground border-b border-border font-semibold">
            <div className="w-1/3">field</div>
            <div className="w-2/3 pl-2">value</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-card custom-scrollbar">
            {Object.entries(selectedData).map(([key, val]) => (
              <div key={key} className="flex gap-2 border-b border-border/50 pb-2 hover:bg-muted/30 transition">
                <div className="w-1/3 text-muted-foreground truncate" title={key}>{key}</div>
                <div className="w-2/3 pl-2 text-foreground break-words">
                  {val !== null && val !== undefined ? String(val) : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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