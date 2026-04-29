"use client";

import React from "react";
import { Database, ChevronDown } from "lucide-react";

interface Props {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isSidebarOpen: boolean;
  onToggle: () => void;
  models?: { id: string; name: string; size?: string }[]; 
}

export const Header = ({ selectedModel, onModelChange, isSidebarOpen, onToggle, models = [] }: Props) => {
  const displayModelName = models.find(m => m.id === selectedModel)?.name || selectedModel || "Loading...";

  return (
    <header className="h-16 flex items-center justify-between pl-6 pr-16 bg-[#050505]/80 backdrop-blur-md z-10 border-b border-white/5">
      
      <div className="flex items-center gap-4">
        <div className="relative flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-slate-200 min-w-[160px]">
          <Database size={14} className="text-blue-500" />
          <span className="text-xs font-bold font-ibm flex-1 truncate">
            {models.length === 0 ? "Loading models..." : displayModelName}
          </span>
          <ChevronDown size={14} className="text-slate-500" />
          
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={models.length === 0}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          >
            {models.length === 0 ? (
              <option value="" disabled className="bg-[#111] text-slate-400">Loading...</option>
            ) : (
              models.map((model) => (
                <option key={model.id} value={model.id} className="bg-[#111] text-white">
                  {model.name} {model.size ? `(${model.size})` : ""}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* 🟢 ฝั่งขวา: Ollama Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-ibm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Ollama Connected
        </div>
      </div>

    </header>
  );
};