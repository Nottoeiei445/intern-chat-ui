"use client";

import { useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import { Layers, Eye, EyeOff, Map, ChevronRight } from "lucide-react";

export const LayerManager = () => {
  const { 
    dynamicLayers, 
    hiddenLayers, 
    toggleLayerVisibility, 
    isBaseMapVisible, 
    toggleBaseMap 
  } = useMapStore();
  
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-3 bg-card text-foreground rounded-2xl border border-border shadow-2xl hover:bg-accent transition-all active:scale-95 group flex items-center gap-2"
        >
          <Layers className="w-5 h-5 text-primary" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 text-sm font-bold whitespace-nowrap">
            Layers
          </span>
        </button>
      )}

      {/* แถบ Sidebar ทางขวา */}
      <div
        className={`h-full transition-all duration-300 ease-in-out bg-background/95 backdrop-blur-2xl border-l border-border shadow-2xl flex flex-col ${
          isOpen ? "w-full md:w-[320px] translate-x-0" : "w-0 translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Layer Manager</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* List ของ Layers */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          
          {/* Base Map Toggle */}
          <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-accent rounded-lg text-foreground shrink-0">
                <Map size={16} />
              </div>
              <span className="font-semibold text-sm truncate">Base Map</span>
            </div>
            <button
              onClick={toggleBaseMap}
              className={`p-2 rounded-lg transition-all ${
                isBaseMapVisible ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {isBaseMapVisible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <hr className="border-border" />

          {/* Dynamic AI Layers */}
          {dynamicLayers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              No active layers. <br/> Ask AI to generate some maps!
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                AI Layers ({dynamicLayers.length})
              </h3>
              {dynamicLayers.map((layer) => {
                const isHidden = hiddenLayers.includes(layer.id);
                return (
                  <div key={layer.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between shadow-sm hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden pr-2">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm truncate">{layer.title || layer.layerId}</span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{layer.type}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLayerVisibility(layer.id)}
                      className={`p-2 rounded-lg transition-all shrink-0 ${
                        !isHidden ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {!isHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};