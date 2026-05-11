"use client";

import { useState, useEffect } from "react";
import { Info, ChevronDown, Check, Loader2 } from "lucide-react";
import { ApiKey } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKey: ApiKey | null;
  onSuccess: (id: string, data: { keyName: string; isActive: boolean }) => Promise<any>;
}

type RestrictionType = "None" | "HTTP Referer" | "IP Address";

export const EditApiKeyModal = ({ isOpen, onClose, apiKey, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "revoked">("active");
  const [restriction, setRestriction] = useState<RestrictionType>("None");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (apiKey && isOpen) {
      setName(apiKey.keyName);
      setStatus(apiKey.isActive ? "active" : "revoked");
    }
  }, [apiKey, isOpen]);

  if (!isOpen || !apiKey) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name?.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        keyName: name.trim(),
        isActive: status === "active"
      };
      
      await onSuccess(apiKey.id, payload);
      
      onClose(); 
    } catch (error) {
      console.error("Update Key Failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[500px] bg-popover border border-border rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-popover-foreground mb-6">Edit API Key</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">Name</span>
              <Info size={14} className="cursor-help" />
            </div>
            <input
              type="text"
              className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">Status</span>
              <Info size={14} className="cursor-help" />
            </div>
            <button
              type="button"
              onClick={() => setStatus(status === "active" ? "revoked" : "active")}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                status === "active" ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                  status === "active" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">Restriction Type</span>
              <Info size={14} className="cursor-help" />
            </div>
            
            <div className="relative w-[180px]">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:border-primary transition-all"
              >
                <span>{restriction}</span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-full bg-popover border border-border rounded-2xl p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                  {(["None", "HTTP Referer", "IP Address"] as RestrictionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setRestriction(type); setIsDropdownOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-xl transition-colors"
                    >
                      {type}
                      {restriction === type && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed pt-2">
            This API Key can set up service access. To prevent reliance on unnecessary services this can be set at{" "}
            <a href="#" className="text-primary hover:underline">Application access</a> or{" "}
            <a href="#" className="text-primary hover:underline">Learn more</a>
          </p>

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
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={18} className="animate-spin" />}
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};