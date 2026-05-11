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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-[500px] bg-[#1e1e1e] rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-white mb-6">Create API Key</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Provider Custom Dropdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-sm">Provider</span>
              <Info size={14} className="cursor-help" />
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-[#111111] rounded-xl px-4 py-3.5 text-white text-sm border border-transparent focus:border-[#00a651]/50 transition-all"
              >
                <span>{provider}</span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#252525] border border-white/5 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  {(["VALLARIS", "GISTDA"] as ProviderType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setProvider(type);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors"
                    >
                      {type}
                      {provider === type && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-sm">Key Name</span>
              <Info size={14} className="cursor-help" />
            </div>
            <input
              type="text"
              autoFocus
              className="w-full bg-[#111111] border-none rounded-xl px-4 py-3.5 text-white placeholder:text-slate-700 outline-none focus:ring-1 focus:ring-[#00a651]/50 transition-all"
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
              className="text-white font-bold hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name?.trim() || isSubmitting}
              className="bg-[#00a651] hover:bg-[#008f45] text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center gap-2"
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