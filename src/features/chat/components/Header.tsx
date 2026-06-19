"use client";

import { Database, ChevronDown } from "lucide-react";

interface Props {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isSidebarOpen: boolean;
  onToggle: () => void;
  models?: { id: string; name: string; size?: string }[]; 
  isModelDisabled?: boolean;
}

export const Header = ({ selectedModel, onModelChange, isSidebarOpen, onToggle, models = [], isModelDisabled = false }: Props) => {
  const displayModelName = models.find(m => m.id === selectedModel)?.name || selectedModel || "Loading...";

  return (
    <header className="h-16 flex items-center justify-between pl-6 pr-16 bg-background/80 backdrop-blur-md z-10 border-b border-border">
      
      <div className="flex items-center gap-4">
        <div className={`relative flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg transition-all text-foreground min-w-[160px] ${
          isModelDisabled 
            ? "opacity-50 cursor-not-allowed bg-muted/20" 
            : "hover:bg-accent cursor-pointer"          
        }`}>
          <Database size={14} className={isModelDisabled ? "text-muted-foreground" : "text-primary"} />
          
          <span className="text-xs font-bold font-ibm flex-1 truncate">
            {models.length === 0 ? "Loading models..." : displayModelName}
          </span>
          
          {/* ซ่อนไอคอนลูกศรชี้ลงเวลาโดนล็อก */}
          {!isModelDisabled && <ChevronDown size={14} className="text-muted-foreground" />}
          
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={models.length === 0 || isModelDisabled} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
          >
            {models.length === 0 ? (
              <option value="" disabled className="bg-popover text-muted-foreground">Loading...</option>
            ) : (
              models.map((model) => (
                <option key={model.id} value={model.id} className="bg-popover text-popover-foreground">
                  {model.name} {model.size ? `(${model.size})` : ""}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

    </header>
  );
};