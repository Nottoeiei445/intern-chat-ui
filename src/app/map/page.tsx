"use client";

import { useState } from "react";
import { MapDashboard } from '../../features/map';
import { ChatFeature } from "../../features/chat"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function MapPage() {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      
      {/* 🗺️ 1. แผนที่ (ฉากหลัง) */}
      <div className="absolute inset-0 z-0">
        <MapDashboard hideControls={true} />
      </div>

      {/* 💬 2. แถบแชท (Sidebar ฝั่งซ้าย) */}
      <div
        className={`
          absolute top-0 left-0 h-full z-20 transition-all duration-300 ease-in-out
          bg-slate-950/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl flex flex-col
          /* ขยายกว้างเป็น 500px ตามสั่ง */
          ${isChatOpen 
            ? "w-full md:w-[500px] translate-x-0" 
            : "w-0 -translate-x-full opacity-0 pointer-events-none"}
        `}
      >
        {/* 🛠️ ส่วนบนสุด: แค่ปุ่มปิด Sidebar เล็กๆ ไม่ต้องมี Header มาบังหัวแชทแล้ว */}
        <div className="absolute top-4 right-4 z-30">
          <button 
            onClick={() => setIsChatOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
            title="Close Sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* 🚀 ตัวแชทหลัก: ปล่อยให้มันแสดง Model Selector และ UI ของมันเอง 100% */}
        <div className="flex-1 w-full h-full">
          <ChatFeature />
        </div>
      </div>

      {/* 🔘 3. ปุ่ม Toggle เปิดแชท (โผล่มาเมื่อปิดแชท) */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="absolute top-5 left-5 z-30 p-3.5 bg-slate-900 text-white rounded-2xl border border-white/20 shadow-2xl hover:bg-slate-800 transition-all active:scale-95 group"
        >
          <div className="flex items-center gap-2">
            <PanelLeftOpen className="w-6 h-6" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 text-sm font-semibold whitespace-nowrap">
              Open Analysis
            </span>
          </div>
        </button>
      )}

      {/* 📱 ปรับแต่งสำหรับ Mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          /* ปรับระยะห่างข้างล่างให้พิมพ์ถนัด */
          .chat-input-container {
            padding-bottom: calc(15px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>
    </main>
  );
}