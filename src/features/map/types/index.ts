// src/features/map/types/index.ts
// ประกาศ type ที่เกี่ยวข้องกับฟีเจอร์แผนที่ (Map)

export type TimeRange = 1 | 3 | 7 | 30;
export type HazardType = 'viirs' | 'flood' | 'drought';
export type MapMode = 'wms' | 'tms' | 'wmts' | 'vector_tile' | 'geojson' | 'vector'| 'coverage_tile'; // vector เผื่อหลังบ้านส่งมาเฉยๆ ไม่บอกว่าเป็น vector_tile หรือ geojson

// ==========================================
//1. พิมพ์เขียวสำหรับรับข้อมูลดิบจาก Backend (เพื่อนส่งมา)
// อ้างอิงจาก JSON: {"hazard":"viirs","days":30,"type":"wms","url":"...","layerName":"..."}
// ==========================================
export interface StreamLayerData {
  hazard?: HazardType | string;
  days?: TimeRange | number;
  type: MapMode;
  url: string;
  layerName: string;
  title?: string;
  mapAction?: {
    type: string;
  };
}

// ==========================================
//2. พิมพ์เขียวสำหรับข้อมูลที่พร้อมใช้งานใน MapLibre ของเรา
// (ตัวนี้คือสิ่งที่เราจะโยนเข้า useDynamicLayers ในสเต็ปหลังๆ)
// ==========================================
export interface DynamicLayerPayload {
  id: string;              // ไอดีของเลเยอร์ (เอาไว้อ้างอิงตอนลบ/แก้ไข)
  type: MapMode;           // รูปแบบแผนที่
  baseUrl: string;         // URL หลักที่ยังไม่เติม API Key (ได้จาก url ของเพื่อน)
  layerId?: string;        // (จำเป็นสำหรับ WMS - ได้จาก layerName ของเพื่อน)
  styleId?: string;        // (ถ้าเป็น Vector บางทีอาจมี styleId มาให้ด้วย)
  title?: string;          // ชื่อเลเยอร์เอาไว้ทำ UI
  apiProvider?: 'gistda' | 'vallaris'; // เพื่อบอกว่าใช้ API Key ตัวไหน
  style?: any;             // เผื่อหลังบ้านส่งสี/สไตล์ของ Vector มาให้ด้วย
  bounds?: [number, number, number, number]; // บังคับว่าเป็น Array ตัวเลข 4 ตัว
  minzoom?: number;
  maxzoom?: number;
  tiles?: string[];
  renderStyles?: any[]; 
  availableStyles?: any[];
  activeStyleKey?: string;
}