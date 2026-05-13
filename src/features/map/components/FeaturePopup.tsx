"use client";

import { MapPin } from "lucide-react";

interface FeaturePopupProps {
  properties: any;
}

export const FeaturePopup = ({ properties }: FeaturePopupProps) => {
  const title = properties.pv_tn || properties.ap_tn || properties.name || properties.title || "Feature Details";

  return (
    // คุม Theme และสีให้เหมือน LayerManager
    <div className="flex flex-col w-full min-w-[250px] max-w-[320px] bg-card text-foreground font-sans">
      
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/30 rounded-t-xl">
        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
          <MapPin className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-sm truncate">{title}</h3>
      </div>

      {/* Content List */}
      <div className="p-3 max-h-[220px] overflow-y-auto space-y-2 custom-scrollbar">
        {Object.entries(properties).map(([key, val]) => (
          <div key={key} className="flex justify-between gap-3 text-xs border-b border-border/40 pb-1.5 last:border-0 last:pb-0 hover:bg-muted/20 transition-colors rounded px-1">
            <span className="text-muted-foreground font-medium truncate w-1/3" title={key}>
              {key}
            </span>
            <span className="text-foreground text-right break-words w-2/3">
              {val !== null && val !== undefined ? String(val) : '-'}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
};