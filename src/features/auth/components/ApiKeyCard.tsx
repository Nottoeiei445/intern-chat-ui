"use client";

import { useState, useRef, useEffect } from "react";
import { ApiKey } from "../types";
import { Eye, MoreVertical, CheckCircle2, Pencil, Trash2, XCircle } from "lucide-react";

interface Props {
  apiKey: ApiKey;
  onDelete: (id: string) => void;
  onEdit: (key: ApiKey) => void;
  onView: (id: string) => void;
}

export const ApiKeyCard = ({ apiKey, onDelete, onEdit, onView }: Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ปิดเมนูเมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`bg-[#181818] border rounded-[20px] p-5 w-full transition-all shadow-xl relative ${
      apiKey.isActive ? "border-white/5 hover:border-white/10" : "border-red-500/10 opacity-70"
    }`}>
      
      {/* --- Header --- */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={apiKey.isActive ? "text-[#00a651]" : "text-slate-600"}>
            {apiKey.isActive ? (
              <CheckCircle2 size={18} strokeWidth={2.5} />
            ) : (
              <XCircle size={18} strokeWidth={2.5} />
            )}
          </div>
          {/*เปลี่ยนจาก .name เป็น .keyName */}
          <span className="text-base font-bold text-white tracking-wide truncate max-w-[200px]">
            {apiKey.keyName}
          </span>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-1.5 rounded-lg transition-all ${isMenuOpen ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
          >
            <MoreVertical size={18} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
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
          {/*แสดง maskedKey ที่ได้มาจากหลังบ้าน */}
          <code className="text-xs text-slate-400 font-mono tracking-widest block truncate mt-1">
            {apiKey.maskedKey}
          </code>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 px-1">
          {/*พอกดรูปตา ให้เรียกฟังก์ชัน onView เพื่อเปิด Modal */}
          <button 
            onClick={() => onView(apiKey.id)} 
            className="text-slate-500 hover:text-white transition-all active:scale-90" 
            title="View Full API Key"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      {/* --- Details Section --- */}
      <div className="space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Provider</span>
          {/*แสดง Provider แทน Restriction */}
          <span className="text-slate-300 font-medium px-2 py-0.5 bg-white/5 rounded-md border border-white/10">
            {apiKey.provider || "Unknown"}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Status</span>
          <span className={apiKey.isActive ? "text-[#00a651]" : "text-slate-500"}>
            {apiKey.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        
        <div className="pt-3 border-t border-white/5 text-slate-500 text-[11px] tracking-wide">
          {/*จัด Format วันที่ให้สวยงาม */}
          Created: {new Date(apiKey.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};