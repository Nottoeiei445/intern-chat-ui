"use client";

import { useState, useRef, useEffect } from "react";
import { useMapStore } from "@/store/useMapStore"; 
import { KeyRound, ShieldAlert, ArrowRight } from "lucide-react";

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
    // 🚀 จุดสำคัญ: ใช้ absolute ยึดติดกับด้านล่าง (bottom-full) แล้วขยับขึ้นมา 12px 
    // พร้อมใส่ Animation สไลด์เด้งขึ้นมาจากด้านล่าง (slide-in-from-bottom-4)
    <div className="absolute bottom-[calc(100%+12px)] left-0 w-full z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      
      <div className="bg-[#111]/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-[0_-10px_40px_-15px_rgba(59,130,246,0.3)] p-4 flex flex-col gap-3">
        
        {/* Header แบบกะทัดรัด */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <KeyRound size={16} />
            </div>
            <span className="text-sm font-semibold text-slate-200">
              Authentication Required
            </span>
          </div>
          <span className="text-[10px] text-amber-400/80 flex items-center gap-1">
            <ShieldAlert size={12} /> Map layers need API token
          </span>
        </div>

        {/* ช่องพิมพ์ + ปุ่มกด (จัดให้อยู่บรรทัดเดียวกัน) */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="password"
            placeholder="Enter Token (GISTDA / Vallaris)..."
            className="flex-1 px-4 py-2.5 bg-black/50 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") closeKeyModal(); // กด Esc เพื่อปิดได้
            }}
          />
          <button
            onClick={handleSave}
            disabled={!inputValue.trim()}
            className="px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};