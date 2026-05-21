"use client";

import { useState } from "react";
import { MapDashboard } from '../features/map';
import { ChatFeature } from "../features/chat"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AuthWidget } from "@/features/auth/components/AuthWidget";
import { LayerManager } from "@/features/map/components/LayerManager";

export default function MapPage() {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      
      <div className="absolute inset-0 z-0">
        <MapDashboard />
      </div>

      {/* แถบแชท Sidebar ฝั่งซ้าย */}
      <div
        className={`
          absolute top-0 left-0 h-full z-20 transition-all duration-300 ease-in-out
          bg-background/95 backdrop-blur-2xl border-r border-border shadow-2xl flex flex-col
          /* ขยายกว้างเป็น 500px ตามสั่ง */
          ${isChatOpen 
            ? "w-full md:w-[500px] translate-x-0" 
            : "w-0 -translate-x-full opacity-0 pointer-events-none"}
        `}
      >
        <div className="absolute top-4 right-4 z-30">
          <button 
            onClick={() => setIsChatOpen(false)}
            className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title="Close Sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 w-full h-full">
          <ChatFeature />
        </div>
      </div>

      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="absolute top-5 left-5 z-30 p-3.5 bg-card text-foreground rounded-2xl border border-border shadow-2xl hover:bg-accent transition-all active:scale-95 group flex items-center justify-center"
        >
          <div className="flex items-center gap-0">
            <PanelLeftOpen className="w-6 h-6 shrink-0" />
            <span className="max-w-0 overflow-hidden opacity-0 ml-0 group-hover:ml-2.5 group-hover:opacity-100 group-hover:max-w-xs transition-all duration-500 text-sm font-bold whitespace-nowrap">
              Open Analysis
            </span>
          </div>
        </button>
      )}

      <div className="absolute top-5 right-5 z-30 flex flex-col items-end gap-3 pointer-events-none">
        <div className="pointer-events-auto">
          <AuthWidget />
        </div>
        
        <div className="pointer-events-auto">
          <LayerManager />
        </div>

      </div>

      {/* ปรับแต่งสำหรับ Mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .chat-input-container {
            padding-bottom: calc(15px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>
    </main>
  );
}