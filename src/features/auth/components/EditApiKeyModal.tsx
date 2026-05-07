"use client";

import { useState, useEffect } from "react";
import { Info, ChevronDown, Check, Loader2 } from "lucide-react";
import { ApiKey } from "../types";
import { apiKeyService } from "../services/apiKey.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKey: ApiKey | null;
  onSuccess: (updatedKey: ApiKey) => void;
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
      setName(apiKey.name);
      setStatus(apiKey.status || "active");
      setRestriction((apiKey.restriction as RestrictionType) || "None");
    }
  }, [apiKey, isOpen]);

  if (!isOpen || !apiKey) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // const updatedData = await apiKeyService.updateKey(apiKey.id, { name: name.trim() });
      await new Promise(resolve => setTimeout(resolve, 800)); 
      
      const finalKey = { 
        ...apiKey, 
        name: name.trim(), // อัปเดตชื่อใหม่
        status,            // อัปเดตสถานะจาก Toggle
        restriction: restriction as string 
      };
      
      onSuccess(finalKey);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-[500px] bg-[#1e1e1e] rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-white mb-6">Edit API Key</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field (เต็มบรรทัด) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-sm">Name</span>
              <Info size={14} className="cursor-help" />
            </div>
            <input
              type="text"
              className="w-full bg-[#111111] border-none rounded-xl px-4 py-3.5 text-white placeholder:text-slate-700 outline-none focus:ring-1 focus:ring-[#00a651]/50 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Status Field (ซ้าย-ขวา) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-sm">Status</span>
              <Info size={14} className="cursor-help" />
            </div>
            <button
              type="button"
              onClick={() => setStatus(status === "active" ? "revoked" : "active")}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                status === "active" ? "bg-[#00a651]" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                  status === "active" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Restriction Type Field (ซ้าย-ขวา) */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-sm">Restriction Type</span>
              <Info size={14} className="cursor-help" />
            </div>
            
            <div className="relative w-[180px]">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-[#111111] rounded-xl px-4 py-2.5 text-white text-sm"
              >
                <span>{restriction}</span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-full bg-[#252525] border border-white/5 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  {(["None", "HTTP Referer", "IP Address"] as RestrictionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setRestriction(type);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors"
                    >
                      {type}
                      {restriction === type && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Text & Links */}
          <p className="text-sm text-slate-400 leading-relaxed pt-2">
            This API Key can set up service access. To prevent reliance on unnecessary services this can be set at{" "}
            <a href="#" className="text-blue-400 hover:underline">Application access</a> or{" "}
            <a href="#" className="text-blue-400 hover:underline">Learn more</a>
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-6 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-white font-bold hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="bg-[#00a651] hover:bg-[#008f45] text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center gap-2"
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