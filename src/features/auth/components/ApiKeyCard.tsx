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
    <div className={`bg-card rounded-[20px] p-5 w-full transition-all shadow-md relative ${
      apiKey.isActive ? "border-border hover:border-primary/50" : "border-destructive/30 opacity-70"
    }`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={apiKey.isActive ? "text-primary" : "text-muted-foreground"}>
            {apiKey.isActive ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <XCircle size={18} strokeWidth={2.5} />}
          </div>
          <span className="text-base font-bold text-card-foreground tracking-wide truncate max-w-[200px]">
            {apiKey.keyName}
          </span>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-1.5 rounded-lg transition-all ${isMenuOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          >
            <MoreVertical size={18} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-popover rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 border border-border">
              <button 
                onClick={() => { setIsMenuOpen(false); onEdit(apiKey); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
              >
                <Pencil size={16} className="text-muted-foreground" />
                <span>Edit</span>
              </button>
              
              <button 
                onClick={() => { setIsMenuOpen(false); onDelete(apiKey.id); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={16} className="text-destructive" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* API Key Box */}
      <div className="bg-muted rounded-xl p-3 flex items-center justify-between gap-3 mb-5 border border-border">
        <div className="flex-1 overflow-hidden">
          <code className="text-xs text-muted-foreground font-mono tracking-widest block truncate mt-1">
            {apiKey.maskedKey}
          </code>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 px-1">
          <button 
            onClick={() => onView(apiKey.id)} 
            className="text-muted-foreground hover:text-foreground transition-all active:scale-90" 
            title="View Full API Key"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Provider</span>
          <span className="text-foreground font-medium px-2 py-0.5 bg-background rounded-md border border-border">
            {apiKey.provider || "Unknown"}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Status</span>
          <span className={apiKey.isActive ? "text-primary" : "text-muted-foreground"}>
            {apiKey.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        
        <div className="pt-3 border-t border-border text-muted-foreground text-[11px] tracking-wide">
          Created: {new Date(apiKey.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};