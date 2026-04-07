"use client"

import { Database, ChevronDown } from "lucide-react"

interface Props {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const Header = ({ selectedModel, onModelChange }: Props) => {
  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#050505]/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-all text-slate-200">
          <Database size={14} className="text-blue-500" />
          <select 
            value={selectedModel} 
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-transparent text-xs font-bold focus:outline-none appearance-none cursor-pointer"
          >
            <option value="deepseek-r1:7b" className="bg-[#111]">DeepSeek-R1 (7B)</option>
            <option value="llama3" className="bg-[#111]">Llama 3 (8B)</option>
          </select>
          <ChevronDown size={14} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Ollama Local Connected
      </div>
    </header>
  )
}