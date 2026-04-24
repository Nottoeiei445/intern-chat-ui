"use client"

import React, { useState, useEffect } from 'react';
import { MapLibre } from './MapLibre';
import { HazardType, TimeRange, MapMode } from '../types';

// 🚀 เพิ่ม Props: hideControls เพื่อคุมความคลีน
interface MapDashboardProps {
  hideControls?: boolean;
}

export const MapDashboard = ({ hideControls = false }: MapDashboardProps) => {
  const [activeHazard, setActiveHazard] = useState<HazardType | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [mapMode, setMapMode] = useState<MapMode>('wms');
  const [activeBoundary, setActiveBoundary] = useState<'province' | 'district' | null>(null);

  // 🤖 AI Control Center: ดักฟังคำสั่งจากแชท
  useEffect(() => {
    const handleMapCommand = (e: any) => {
      const { method, args } = e.detail;
      console.log("🛠️ Map receiving command:", method, args);

      if (method === 'controlMap') {
        if (args.action === 'TOGGLE_LAYER') {
          // สั่งเปิด/ปิด Hazard (เช่น wildfire, flood)
          const target = args.target === 'wildfire' ? 'viirs' : args.target;
          setActiveHazard(prev => prev === target ? null : target as HazardType);
        }
        if (args.action === 'SET_TIMELINE') {
          setTimeRange(args.value as TimeRange);
        }
        if (args.action === 'SET_BOUNDARY') {
          setActiveBoundary(args.target as any);
        }
      }
    };

    window.addEventListener('map-command', handleMapCommand);
    return () => window.removeEventListener('map-command', handleMapCommand);
  }, []);

  return (
    <div className={`h-screen flex flex-col ${hideControls ? 'p-0 bg-black' : 'p-4 bg-gray-50'}`}>
      
      {/* 🚫 ซ่อนหัวข้อถ้าอยู่ในโหมด AI */}
      {!hideControls && (
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">Geographic Information System (GIS)</h1>
          <p className="text-gray-500">Display location and hazard data with MapLibre GL</p>
        </div>
      )}
      
      <div className={`flex-1 w-full relative overflow-hidden ${hideControls ? '' : 'rounded-xl shadow-sm border border-gray-200 bg-white'}`}>
        
        {!hideControls && (
          <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/95 p-2 rounded-xl shadow-md border border-gray-200">
            {(['wms', 'tms', 'vector'] as MapMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setMapMode(mode)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mapMode === mode ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {!hideControls && (
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 p-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg">
            <h3 className="text-gray-800 text-sm font-bold">Hazard Controls</h3>
            <div className="flex gap-2">
              {(['viirs', 'flood', 'drought'] as HazardType[]).map((type) => (
                <button 
                  key={type}
                  onClick={() => setActiveHazard(activeHazard === type ? null : type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeHazard === type ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'viirs' ? '🔥 Wildfire' : type === 'flood' ? '🌊 Flood' : '☀️ Drought'}
                </button>
              ))}
            </div>
          </div>
        )}

        <MapLibre 
          activeHazard={activeHazard} 
          timeRange={timeRange} 
          mapMode={mapMode}
          activeBoundary={activeBoundary} 
        />
        
      </div>
    </div>
  );
};