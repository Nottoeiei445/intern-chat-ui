import React from 'react';
import { MapLibre } from './MapLibre'; // 👈 เรียกใช้ตัวแผนที่ที่เพิ่งสร้าง

export const MapDashboard = () => {
  return (
    <div className="p-4 h-screen flex flex-col bg-gray-50">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">ระบบแผนที่ภูมิศาสตร์ (GIS)</h1>
        <p className="text-gray-500">แสดงผลข้อมูลพิกัดด้วย MapLibre GL</p>
      </div>
      
      {/* กล่องใส่แผนที่ ให้มันขยายเต็มพื้นที่ที่เหลือ (flex-1) */}
      <div className="flex-1 w-full relative">
        <MapLibre />
      </div>
    </div>
  );
};