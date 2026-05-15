"use client";

import { useState } from "react";
import { useMapStore } from "@/store/useMapStore";
import { Layers, Eye, EyeOff, Map, ChevronRight, Palette, ChevronDown } from "lucide-react";

export const LayerManager = () => {
  const { 
    dynamicLayers, 
    hiddenLayers, 
    toggleLayerVisibility, 
    isBaseMapVisible, 
    toggleBaseMap,
    setActiveStyle 
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
                const hasMultipleStyles = layer.availableStyles && layer.availableStyles.length > 1;

                return (
                  <div key={layer.id} className="bg-card border border-border rounded-xl p-3 flex flex-col gap-3 shadow-sm hover:border-primary/50 transition-colors">
                    
                    {/* ข้อมูลเลเยอร์ + ปุ่มเปิด/ปิดตา */}
                    <div className="flex items-center justify-between">
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

                    {hasMultipleStyles && (
                      <div className="pt-2 border-t border-border/50">
                        <div className="relative group">
                          {/* ไอคอนด้านซ้าย */}
                          <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                            <Palette size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          
                          <select 
                            value={layer.activeStyleKey}
                            onChange={(e) => setActiveStyle(layer.id, e.target.value)}
                            className="w-full appearance-none bg-background hover:bg-accent/50 text-xs text-foreground py-2 pl-8 pr-8 rounded-lg border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-all shadow-sm"
                          >
                            {layer.availableStyles?.map((style) => (
                              <option 
                                key={style.styleKey} 
                                value={style.styleKey}
                                className="bg-background text-foreground py-1"
                              >
                                {style.styleName}
                              </option>
                            ))}
                          </select>

                          {/* ไอคอนลูกศรด้านขวา (ใส่เองแทนของเบราว์เซอร์) */}
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                            <ChevronDown size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </div>
                      </div>
                    )}
                    
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