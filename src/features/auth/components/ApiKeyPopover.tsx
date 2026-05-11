"use client";

import { useState, useRef, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore"; 
import { KeyRound, ShieldAlert, ArrowRight, X } from "lucide-react";

export const ApiKeyPopover = () => {
  const { setApiKey, isKeyModalOpen, closeKeyModal } = useMapStore();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // พอ Popover เด้งปุ๊บ ให้ Cursor ไปรอที่ช่องพิมพ์ทันที
  useEffect(() => {
    if (isKeyModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isKeyModalOpen]);

  if (!isKeyModalOpen) return null;

  const handleSave = () => {
    if (inputValue.trim() === "") return;
    setApiKey("gistda", inputValue.trim());
    closeKeyModal();
    setInputValue("");
  };

  return (
    // ยึดติดกับด้านล่างแบบลอยๆ เหมือนเดิม
    <div className="absolute bottom-[calc(100%+12px)] left-0 w-full z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      
      <div className="relative">
        
        {/* 🌟 1. ปุ่ม Close: เปลี่ยนสีให้กลืนกับ Theme และเด้งเป็นสีแดงตอน Hover */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            closeKeyModal();
          }}
          className="absolute -top-3 -right-2 bg-muted border border-border hover:bg-destructive hover:border-destructive text-muted-foreground hover:text-destructive-foreground rounded-full p-1.5 shadow-xl z-50 transition-all scale-100 hover:scale-110 active:scale-90"
          title="Close"
        >
          <X size={14} strokeWidth={3} />
        </button>

        {/* 🌟 2. กล่องหลัก: ใช้ bg-card เพื่อสลับ ขาว/ดำ อัตโนมัติตาม Theme และมีเงา shadow-xl เพื่อให้ Popover เด่นขึ้นครับ */}
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-4 flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 🌟 3. ไอคอนกุญแจ: ใช้สี Primary ของ Theme */}
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <KeyRound size={16} />
              </div>
              <span className="text-sm font-bold text-card-foreground">
                Authentication Required
              </span>
            </div>
            {/* 🌟 4. ข้อความเตือน: สลับสีส้มเข้ม/ส้มสว่าง ตามโหมด */}
            <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 hidden sm:flex font-medium">
              <ShieldAlert size={12} /> Map layers need API token
            </span>
          </div>

          {/* ช่องพิมพ์ + ปุ่มกด */}
          <div className="flex gap-2">
            {/* 🌟 5. ช่องกรอกคีย์: ใช้ bg-background */}
            <input
              ref={inputRef}
              type="password"
              placeholder="Enter API Key"
              className="flex-1 px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") closeKeyModal(); 
              }}
            />
            {/* 🌟 6. ปุ่ม Submit: เพิ่มเงา shadow-lg shadow-primary/25, hover:shadow-primary/40 และเอฟเฟกต์ active:scale-95 เพื่อให้ดูเด่นและมีน้ำหนักขึ้นครับ */}
            <button
              onClick={handleSave}
              disabled={!inputValue.trim()}
              className="px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95"
            >
              <ArrowRight size={18} />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};