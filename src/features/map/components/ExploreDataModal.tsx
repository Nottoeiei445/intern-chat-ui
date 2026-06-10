// src/features/map/components/ExploreDataModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore";
import { chatService } from "@/features/chat/services/chat.service";
import { CHAT_CONFIG } from "@/features/chat/config/chat.config";
import { X, FileJson, BarChart3, Download, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";

interface ExploreDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 📌 เผื่อเฮียมีระบบสอยค่านี้จาก API แชท ให้เปลี่ยนมาใช้ตัวแปรไดนามิกได้เลยครับ 
// ตอนนี้ขอใช้ตัวแปรคงที่ที่เฮียแคะมาจากเครือข่าย GISTDA ค้ำไว้ก่อน
const CONNECTION_ID = "6734498c30535afad9a3f7ad";

export const ExploreDataModal = ({ isOpen, onClose }: ExploreDataModalProps) => {
  const { activeChatId, dynamicLayers, apiKeys } = useMapStore();
  
  const [selectedLayerId, setSelectedLayerId] = useState<string>("");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 🎯 1. กรองเฉพาะเลเยอร์ประเภทเวกเตอร์ที่สามารถคำนวณตารางสถิติได้ (Vector Only)
  const explorableLayers = dynamicLayers.filter(
    (layer) =>
      layer.type === "vector_tile" ||
      layer.type === "featureCollection"
  );

  // 🔄 จังหวะเปิด Modal: บังคับเลือกเลเยอร์ตัวแรกที่เข้าเกณฑ์ออโต้
  useEffect(() => {
    if (isOpen && explorableLayers.length > 0 && !selectedLayerId) {
      setSelectedLayerId(explorableLayers[0].id);
    }
  }, [isOpen, explorableLayers, selectedLayerId]);

  // 🚀 2. ลอจิกหัวใจหลัก: โหลดคอลลัมน์ ➡️ วนหา Number ➡️ ประกอบร่างกฎ ➡️ ยิงขอสถิติ
  useEffect(() => {
    if (!isOpen || !selectedLayerId) return;

    const fetchDynamicAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      setAnalyticsData(null);

      try {
        // เสาะหาตัวเลเยอร์เป้าหมายในคลัง Store เพื่อแงะเอาลิงก์และคีย์ประจำตัว
        const currentLayer = explorableLayers.find((l) => l.id === selectedLayerId);
        if (!currentLayer || !currentLayer.baseUrl) {
          throw new Error("ไม่พบข้อมูล Base URL ของเลเยอร์นี้");
        }

        const urlOrigin = new URL(currentLayer.baseUrl).origin;
        // ดึง API Key ข้ามค่าย (เลือกตัวของเลเยอร์นั้น หรือใช้ตัวกลางสโตร์)
        const apiKey = apiKeys.gistda || Object.values(apiKeys)[0] || ""; 

        // 🔍 STEP A: ยิงสอยพิมพ์เขียวคอลัมน์ของเลเยอร์ปัจจุบันแบบสด ๆ หน้างาน
        const columnsUrl = `${urlOrigin}/core/api/analytics/1.0/connections/${CONNECTION_ID}/datasources/${selectedLayerId}/columns?api_key=${apiKey}`;
        const columnsResponse = await axios.get(columnsUrl);
        const allColumns = columnsResponse.data?.columns || [];

        // 🔍 STEP B: วนลูปสแกนคัดกรองหา "คอลัมน์ตัวเลข" อัจฉริยะ (ข้ามพิกัดแผนที่)
        const numberFields = allColumns.filter(
          (col: any) =>
            col.dataTypeAlias === "number" &&
            col.name !== "latitude" &&
            col.name !== "longitude" &&
            col.name !== "utm_e" &&
            col.name !== "utm_n"
        );

        // 🔍 STEP C: ประกอบร่างกฎลูกเต๋า (Aggregate Rules) ดิ้นได้ตามโครงสร้างเลเยอร์
        // มีตัวนับยอดรวมยืนพื้นค้ำประกันไว้เสมอ 1 ตัวกันตาย
        const dynamicAggregateRules = [
          {
            column: "_id",
            aggregate: "count",
            alias: "total_records",
          },
        ];

        // ถ้าลูปเจอคีย์ตัวเลข ให้ปั่นคำสั่งพ่วงขบวนพ่นสถิติเฉลี่ยและจุดพีคทันที
        numberFields.forEach((col: any) => {
          dynamicAggregateRules.push({
            column: col.name,
            aggregate: "avg",
            alias: `avg_${col.name}`,
          });
          dynamicAggregateRules.push({
            column: col.name,
            aggregate: "max",
            alias: `max_${col.name}`,
          });
        });

        // 🔍 STEP D: ส่งไม้ต่อให้ท่อเซอร์วิสของแชท ยิงส่งคำขอประมวลผลบิ๊กดาต้า
        const result = await chatService.getLayerAnalytics(
          currentLayer.baseUrl,
          CONNECTION_ID,
          selectedLayerId,
          apiKey,
          dynamicAggregateRules
        );

        setAnalyticsData(result);
      } catch (err: any) {
        console.error("[Explore Engine Failure]:", err);
        setError(err?.response?.data?.message || err.message || "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDynamicAnalytics();
  }, [selectedLayerId, isOpen]);

  // 💾 3. ทริกจำลองดาวน์โหลดไฟล์ข้อความดิ่งลงคอมพิวเตอร์ผู้ใช้ด้วยกลไก Blob
  const handleDownloadJson = () => {
    if (!analyticsData) return;

    const targetLayer = explorableLayers.find((l) => l.id === selectedLayerId);
    const layerNameForFile = targetLayer?.title || targetLayer?.layerId || selectedLayerId;
    const fileName = `aggregation_${layerNameForFile}_${Date.now()}.json`;

    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col h-[80vh] transition-all">
        
        {/* 🧩 Header แผงควบคุม */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base md:text-lg">Explore Layer Data (Aggregation)</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* 🧩 Body ไส้ในหน้าต่าง */}
        <div className="p-4 flex flex-col gap-4 overflow-hidden flex-1">
          
          {/* ส่วนสับเปลี่ยนเลเยอร์ในตู้แชท */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Select Explorable Layer ({explorableLayers.length})
            </label>
            {explorableLayers.length === 0 ? (
              <div className="text-sm p-3 bg-accent/50 text-muted-foreground rounded-xl border border-dashed flex items-center gap-2">
                <AlertCircle size={16} />
                ไม่มีเลเยอร์ประเภทเวกเตอร์เปิดทำงานอยู่ในแชทนี้
              </div>
            ) : (
              <select
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="w-full bg-background border border-border p-2.5 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                {explorableLayers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.title || layer.layerId} ({layer.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 🖥️ ตู้กระจกเรนเดอร์ขุมทรัพย์ JSON */}
          <div className="flex-1 min-h-0 bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-xl font-mono text-xs p-4 overflow-auto relative custom-scrollbar group">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center bg-zinc-950/80 backdrop-blur-xs text-zinc-400 z-10 animate-fade-in">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[11px] tracking-wide">Scanning columns & generating aggregation metrics...</span>
              </div>
            )}

            {error && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-destructive gap-2">
                <AlertCircle size={24} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {!isLoading && !error && analyticsData && (
              <div className="relative h-full">
                {/* ปุ่มดาวน์โหลดด่วน แอบสว่างวาบตอนเอาเมาส์มาวางบนกล่องสถิติ */}
                <button
                  onClick={handleDownloadJson}
                  className="absolute top-0 right-0 p-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-primary-foreground hover:bg-primary rounded-lg transition-all flex items-center gap-1.5 text-[11px] font-sans font-bold shadow-xl opacity-100 md:opacity-0 md:group-hover:opacity-100"
                >
                  <Download size={14} />
                  Download JSON
                </button>
                <pre className="pt-8 md:pt-0 leading-relaxed select-text">{JSON.stringify(analyticsData, null, 2)}</pre>
              </div>
            )}

            {!isLoading && !error && !analyticsData && (
              <div className="h-full flex items-center justify-center text-zinc-500 text-center py-20">
                พร้อมวิเคราะห์ข้อมูล โปรดเลือกเลเยอร์ด้านบน
              </div>
            )}
          </div>
        </div>

        {/* 🧩 Footer แผงปุ่มเซฟท้ายแถว */}
        {!error && analyticsData && (
          <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0 bg-accent/20 rounded-b-2xl">
            <button
              onClick={handleDownloadJson}
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 shadow-md shadow-primary/10 disabled:opacity-50"
            >
              <FileJson size={16} />
              Export to File (.json)
            </button>
          </div>
        )}

      </div>
    </div>
  );
};