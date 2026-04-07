"use client"

import { Database, ChevronDown } from "lucide-react"

interface Props {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isSidebarOpen: boolean; 
  onToggle: () => void;
}

export const Header = ({ selectedModel, onModelChange, isSidebarOpen, onToggle }: Props) => {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[#050505]/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <div className="relative flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-slate-200 min-w-[160px]">
          <Database size={14} className="text-blue-500" />
          
          <span className="text-xs font-bold font-ibm flex-1 truncate">
            {selectedModel}
          </span>
          
          <ChevronDown size={14} className="text-slate-500" />

          <select 
            value={selectedModel} 
            onChange={(e) => onModelChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            <option value="qwen2.5:7b" className="bg-[#111] text-white">Qwen 2.5 (7B)</option>
            <option value="llama3" className="bg-[#111] text-white">Llama 3 (8B)</option>
          </select>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-slate-500 font-ibm">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Ollama Connected
      </div>
    </header>
  )
}