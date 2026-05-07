"use client";

import { useState } from "react";
import { X, Info, ChevronDown, Check, Loader2 } from "lucide-react";
import { ApiKey } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newKey: ApiKey) => void;
}

type RestrictionType = "None" | "HTTP Referer" | "IP Address";

export const CreateApiKeyModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [restriction, setRestriction] = useState<RestrictionType>("None");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // จำลองการโหลด
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockNewKey: ApiKey = {
        id: Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        key: `g1stda-${Math.random().toString(36).substr(2, 20)}`,
        status: "active",
        restriction: restriction,
        createdAt: "Just now",
        applications: []
      };

      onSuccess(mockNewKey);
      setName("");
      setRestriction("None");
      onClose();
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
          {/* Name Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-sm">Name</span>
              <Info size={14} className="cursor-help" />
            </div>
            <input
              type="text"
              autoFocus
              className="w-full bg-[#111111] border-none rounded-xl px-4 py-3.5 text-white placeholder:text-slate-700 outline-none focus:ring-1 focus:ring-white/10 transition-all"
              placeholder="e.g. bank"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Restriction Type Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-sm">Restriction Type</span>
              <Info size={14} className="cursor-help" />
            </div>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between bg-[#111111] rounded-xl px-4 py-3.5 text-white text-sm"
              >
                <span>{restriction}</span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-[200px] bg-[#252525] border border-white/5 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
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

          {/* Link Section */}
          <p className="text-sm text-slate-400 leading-relaxed">
            Learn the benefits of using API Key and get to know API Key more{" "}
            <a href="#" className="text-blue-500 hover:underline">Learn more</a>
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
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};