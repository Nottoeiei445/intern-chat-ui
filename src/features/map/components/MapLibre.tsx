"use client"
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export const MapLibre = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current) return; 

    if (mapContainer.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current, 
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json', 
        center: [100.5200, 13.7500], 
        zoom: 12, // ซูมเข้ามาอีกนิดให้เห็นตึกชัดๆ
      });

      map.current.on('load', () => {
        
        // ==========================================
        // 1. หมวด POINT (จุดพิกัดเดี่ยวๆ)
        // ==========================================
        map.current?.addSource('point-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: 'จุดนัดพบ (คลิกฉันสิ!)', description: 'นี่คือรายละเอียดของจุดนี้' },
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

        // ==========================================
        // 2. หมวด LINE (เส้นทาง)
        // ==========================================
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

        // ==========================================
        // 3. หมวด POLYGON (พื้นที่ปิด)
        // ==========================================
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

        // ==========================================
        // 🎯 สั่งให้ "วิ่ง" ไปหาตำแหน่งปัจจุบันของผู้ใช้
        // ==========================================
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((position) => {
            const { longitude, latitude } = position.coords;

            // สั่งให้แผนที่บินไปหาพิกัดที่ได้จาก GPS
            map.current?.flyTo({
              center: [longitude, latitude],
              zoom: 16,        // ซูมเข้าไปใกล้ๆ จะได้เห็นบ้านตัวเองชัดๆ
              essential: true, // การบินนี้ถือเป็นสิ่งสำคัญ (ข้ามอนิเมชั่นถ้าผู้ใช้ตั้งค่าลดการเคลื่อนไหว)
              duration: 3000   // ใช้เวลาบิน 3 วินาที
            });

            // (แถม) ปักหมุดสีแดงตรงที่เฮียอยู่ด้วยเลย
            new maplibregl.Marker({ color: '#FF0000' })
              .setLngLat([longitude, latitude])
              .setPopup(new maplibregl.Popup().setHTML("<b>คุณอยู่ที่นี่!</b>"))
              .addTo(map.current!);
              
          }, (error) => {
            console.error("GPS Error:", error.message);
            alert("เฮียครับ! อย่าลืมกดอนุญาตให้เข้าถึงตำแหน่ง (Location) ในเบราว์เซอร์นะ");
          });
        }

        // ==========================================
        // 🎯 ACTION: ทำให้คลิกที่จุดสีแดงแล้วมี Popup เด้ง!
        // ==========================================
        map.current?.on('click', 'point-layer', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const coordinates = (e.features[0].geometry as any).coordinates.slice();
          const name = e.features[0].properties.name;
          const desc = e.features[0].properties.description;

          // สร้าง Popup และแปะลงแผนที่
          new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <div style="padding: 5px;">
                <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${name}</h3>
                <p style="margin: 0; color: #666;">${desc}</p>
              </div>
            `)
            .addTo(map.current!);
        });

        // เปลี่ยนเคอร์เซอร์เป็นรูปนิ้วชี้เวลาเอาเมาส์ไปวางบนจุด
        map.current?.on('mouseenter', 'point-layer', () => {
          map.current!.getCanvas().style.cursor = 'pointer';
        });
        map.current?.on('mouseleave', 'point-layer', () => {
          map.current!.getCanvas().style.cursor = '';
        });

      });
    }
  }, []);

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full rounded-lg shadow-inner overflow-hidden border border-gray-200"
      style={{ minHeight: '600px' }} 
    />
  );
};