"use client"
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button'; 
import { LocateFixed } from 'lucide-react';

export const MapLibre = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { longitude, latitude } = position.coords;
        map.current?.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          duration: 2000,
          essential: true
        });
      }, (error) => {
        alert("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาตรวจสอบการอนุญาตสิทธิ์ครับ");
      });
    }
  };

  useEffect(() => {
    if (map.current) return; 

    if (mapContainer.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current, 
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', 
        center: [100.5200, 13.7500], 
        zoom: 12,
      });

      map.current.on('load', () => {
        // --- หมวด POINT ---
        map.current?.addSource('point-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: 'จุดนัดพบ', description: 'นี่คือรายละเอียดของจุดนี้' },
            geometry: { type: 'Point', coordinates: [100.5200, 13.7400] }
          }
        });

        map.current?.addLayer({
          id: 'point-layer',
          type: 'circle',
          source: 'point-source',
          paint: {
            'circle-radius': 12,
            'circle-color': '#EF4444', 
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF'
          }
        });

        map.current?.addSource('line-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: 'เส้นทางวิ่ง' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [100.5100, 13.7500], [100.5150, 13.7550], 
                [100.5200, 13.7550], [100.5250, 13.7500] 
              ]
            }
          }
        });

        map.current?.addLayer({
          id: 'line-layer',
          type: 'line',
          source: 'line-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#3B82F6', 'line-width': 6 }
        });

        // --- หมวด POLYGON ---
        map.current?.addSource('polygon-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: 'สวนสาธารณะ' },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [100.5300, 13.7600], [100.5400, 13.7600], 
                [100.5400, 13.7500], [100.5300, 13.7500], 
                [100.5300, 13.7600]
              ]]
            }
          }
        });

        map.current?.addLayer({
          id: 'polygon-fill-layer',
          type: 'fill',
          source: 'polygon-source',
          paint: { 'fill-color': '#10B981', 'fill-opacity': 0.4 }
        });

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((position) => {
            const { longitude, latitude } = position.coords;
            map.current?.flyTo({
              center: [longitude, latitude],
              zoom: 16,
              duration: 3000
            });
            new maplibregl.Marker({ color: '#FF0000' })
              .setLngLat([longitude, latitude])
              .setPopup(new maplibregl.Popup().setHTML("<b>คุณอยู่ที่นี่!</b>"))
              .addTo(map.current!);
          });
        }

        map.current?.on('click', 'point-layer', (e) => {
          if (!e.features || e.features.length === 0) return;
          const coordinates = (e.features[0].geometry as any).coordinates.slice();
          const name = e.features[0].properties.name;
          const desc = e.features[0].properties.description;
          new maplibregl.Popup({ offset: 25})
            .setLngLat(coordinates)
            .setHTML(`<div style="padding: 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><h4 style="margin: 0 0 8px 0; color: #d32f2f; font-weight: bold; text-align: center;">${name}</h4><p style="margin: 0; color: #555; line-height: 1.4;">${desc}</p></div>`)
            .addTo(map.current!);
        });

        map.current?.on('mouseenter', 'point-layer', () => { map.current!.getCanvas().style.cursor = 'pointer'; });
        map.current?.on('mouseleave', 'point-layer', () => { map.current!.getCanvas().style.cursor = ''; });
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full min-h-[600px] rounded-lg shadow-inner overflow-hidden border border-gray-200">
      
      <div className="absolute bottom-6 right-6 z-10">
        <Button 
          variant="secondary"
          size="icon" 
          className="rounded-full w-12 h-12 shadow-md hover:shadow-xl transition-all"
          onClick={handleLocateMe}
        >
          <LocateFixed className="w-6 h-6 text-primary" />
        </Button>
      </div>

      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ minHeight: '600px' }} 
      />
    </div>
  );
};