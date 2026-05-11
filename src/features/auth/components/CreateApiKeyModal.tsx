"use client";

import { useState, useRef, useEffect } from "react";
import { Info, Loader2, ChevronDown, Check } from "lucide-react";
import { CreateApiKeyDTO } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: CreateApiKeyDTO) => Promise<any>;
}

type ProviderType = "VALLARIS" | "GISTDA";

export const CreateApiKeyModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<ProviderType>("VALLARIS");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ปิด Dropdown เมื่อคลิกบริเวณอื่นของหน้าจอ
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name?.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: CreateApiKeyDTO = {
        provider: provider,
        keyName: name.trim()
      };

      await onSuccess(payload);
      
      setName("");
      setProvider("VALLARIS");
      onClose();
    } catch (error) {
      console.error("Create key failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[500px] bg-popover text-popover-foreground border border-border rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-foreground mb-6">Create API Key</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Provider Custom Dropdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">Provider</span>
              <Info size={14} className="cursor-help" />
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              >
                <span>{provider}</span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-popover border border-border rounded-2xl p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                  {(["VALLARIS", "GISTDA"] as ProviderType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setProvider(type);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-xl transition-colors"
                    >
                      {type}
                      {provider === type && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">Key Name</span>
              <Info size={14} className="cursor-help" />
            </div>
            <input
              type="text"
              autoFocus
              className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="e.g. Production Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-6 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-foreground font-bold hover:text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name?.trim() || isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};