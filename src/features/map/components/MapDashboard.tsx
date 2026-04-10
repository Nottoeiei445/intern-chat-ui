"use client"

import React, { useState } from 'react';
import { MapLibre } from './MapLibre';
// 🚀 อย่าลืมเช็ค path ตรงนี้ให้ตรงกับโฟลเดอร์ของเฮียนะครับ
import { HazardType, TimeRange } from '../config/map.config'; 

export const MapDashboard = () => {
  // 1. สร้าง State สำหรับเก็บค่าที่ User กำลังเลือกอยู่
  const [activeHazard, setActiveHazard] = useState<HazardType>('fire');
  const [timeRange, setTimeRange] = useState<TimeRange>(7);

  return (
    <div className="p-4 h-screen flex flex-col bg-gray-50">
      
      {/* Header เดิมของเฮีย */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-800">ระบบแผนที่ภูมิศาสตร์ (GIS)</h1>
        <p className="text-gray-500">แสดงผลข้อมูลพิกัดและภัยพิบัติด้วย MapLibre GL</p>
      </div>
      
      {/* กล่องใส่แผนที่ ให้มันขยายเต็มพื้นที่ที่เหลือ (flex-1) */}
      <div className="flex-1 w-full relative rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
        
        {/* 🎛️ แผงควบคุม (Control Panel) ลอยอยู่บนแผนที่ (z-10) */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 p-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg">
          <h3 className="text-gray-800 text-sm font-bold">แผงควบคุมภัยพิบัติ</h3>
          
          {/* ปุ่มเลือกประเภทภัย */}
          <div className="flex gap-2">
            {(['fire', 'flood', 'drought'] as HazardType[]).map((type) => (
              <button 
                key={type}
                onClick={() => setActiveHazard(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeHazard === type 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'fire' ? '🔥 ไฟป่า' : type === 'flood' ? '🌊 น้ำท่วม' : '☀️ ภัยแล้ง'}
              </button>
            ))}
          </div>

          {/* ปุ่มเลือกช่วงเวลา */}
          <div className="flex gap-2 border-t border-gray-100 pt-3">
            {([1, 3, 7, 30] as TimeRange[]).map((days) => (
              <button 
                key={days}
                onClick={() => setTimeRange(days)}
                className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                  timeRange === days 
                    ? 'bg-green-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {days} วัน
              </button>
            ))}
          </div>
        </div>

        {/* 🗺️ เรียกใช้ Component แผนที่ พร้อมโยน Props ใส่เข้าไป */}
        <MapLibre 
          activeHazard={activeHazard} 
          timeRange={timeRange} 
        />
        
      </div>
    </div>
  );
};