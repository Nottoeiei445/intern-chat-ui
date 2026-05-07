"use client"

import React from 'react';
import { MapLibre } from './MapLibre';
import { useMapStore } from '@/store/useMapStore';

export const MapDashboard = () => { 
  const dynamicLayers = useMapStore((state) => state.dynamicLayers);

  return (
    <div className="h-full w-full relative overflow-hidden bg-background">
      
      <MapLibre 
        activeHazard={null} 
        timeRange={7} 
        mapMode={'vector'} // ให้ default เป็น vector ไปเลยสำหรับ AI
        activeBoundary={null} 
        dynamicLayers={dynamicLayers} 
      />
      
    </div>
  );
};