"use client";

import { useState, useRef, useEffect } from "react";
import { ApiKey } from "../types";
import { Copy, Eye, EyeOff, MoreVertical, CheckCircle2, Check, Pencil, Grip, Trash2 } from "lucide-react";

interface Props {
  apiKey: ApiKey;
  onDelete: (id: string) => void;
  onEdit: (key: ApiKey) => void;
}

export const ApiKeyCard = ({ apiKey, onDelete, onEdit }: Props) => {
  const [showFullKey, setShowFullKey] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#181818] border border-white/5 rounded-[20px] p-5 w-full hover:border-white/10 transition-all shadow-xl relative">
      
      {/* --- Header --- */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="text-[#00a651]">
            <CheckCircle2 size={18} strokeWidth={2.5} />
          </div>
          {/* 🚀 เปลี่ยนมาใช้ font-bold แทน เพราะโบร๋มีไฟล์ Bold.ttf หรือถ้าอยากให้บางลงก็ลบ font-bold ออกเพื่อให้เป็น Regular */}
          <span className="text-base font-bold text-white tracking-wide">{apiKey.name}</span>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-1.5 rounded-lg transition-all ${isMenuOpen ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            <MoreVertical size={18} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  onEdit(apiKey);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Pencil size={16} className="text-slate-500" />
                <span>Edit</span>
              </button>
              
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Grip size={16} className="text-slate-500" />
                <span>Application Access</span>
              </button>
              
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  onDelete(apiKey.id);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} className="text-red-500" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- API Key Box --- */}
      <div className="bg-[#0c0c0c] rounded-xl p-3 flex items-center justify-between gap-3 mb-5 border border-white/5">
        <div className="flex-1 overflow-hidden">
          <code className="text-xs text-slate-400 font-mono tracking-widest block truncate mt-1">
            {showFullKey ? apiKey.key : "••••••••••••••••••••••••••••"}
          </code>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 px-1">
          <button onClick={handleCopy} className="transition-all active:scale-90" title="Copy API Key">
            {copied ? <Check size={16} className="text-[#00a651]" strokeWidth={3} /> : <Copy size={16} className="text-slate-500 hover:text-slate-300 transition-colors" />}
          </button>
          <button onClick={() => setShowFullKey(!showFullKey)} className="text-slate-500 hover:text-white transition-all active:scale-90" title={showFullKey ? "Hide API Key" : "Show API Key"}>
            {showFullKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* --- Details Section --- */}
      <div className="space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Restriction</span>
          <span className="text-slate-300">{apiKey.restriction}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Application</span>
          <div className="flex -space-x-1.5">
            <div className="w-6 h-6 rounded-full bg-[#1a2e25] border border-[#181818] flex items-center justify-center text-[9px] shadow-lg">🍃</div>
            <div className="w-6 h-6 rounded-full bg-[#1e253c] border border-[#181818] flex items-center justify-center text-[9px] shadow-lg">📊</div>
            <div className="w-6 h-6 rounded-full bg-[#2a2a2a] border border-[#181818] flex items-center justify-center text-[9px] text-slate-400 font-bold shadow-lg">+2</div>
          </div>
        </div>
        
        <div className="pt-3 border-t border-white/5 text-slate-500 italic text-[11px] tracking-wide">
          Edited {apiKey.createdAt}
        </div>
      </div>
    </div>
  );
};