"use client";

import { useState, useRef, useEffect } from "react";
import { Info, Loader2, ChevronDown, Check } from "lucide-react";
import { CreateApiKey } from "../types"; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => Promise<any>; 
  hosts: CreateApiKey[];
}

export const CreateApiKeyModal = ({ isOpen, onClose, onSuccess, hosts }: Props) => {
  const [name, setName] = useState("");
  const [keyValue, setKeyValue] = useState(""); 
  const [selectedHostId, setSelectedHostId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && hosts.length > 0 && !selectedHostId) {
      setSelectedHostId(hosts[0].id);
    }
  }, [isOpen, hosts, selectedHostId]);

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
    if (!name?.trim() || !selectedHostId || isSubmitting) return;

    // หา Object Host ตัวที่ User เลือก
    const selectedHost = hosts.find((h) => h.id === selectedHostId);
    if (!selectedHost) return;

    setIsSubmitting(true);
    try {
      const payload = {
        provider: selectedHost.provider,
        hostId: selectedHost.id,
        keyName: name.trim(),
        keyValue: keyValue.trim(), 
      };

      await onSuccess(payload);
      
      // ล้างค่าฟอร์มหลังส่งเสร็จ
      setName("");
      setKeyValue("");
      if (hosts.length > 0) setSelectedHostId(hosts[0].id);
      onClose();
    } catch (error) {
      console.error("Create key failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ดึงข้อมูล Host ปัจจุบันมาแสดงบนปุ่ม Dropdown
  const activeHost = hosts.find((h) => h.id === selectedHostId);
  const displayHostName = activeHost 
    ? `${activeHost.provider.toUpperCase()} - ${activeHost.hostname}` 
    : "Select Provider & Host";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[500px] bg-popover text-popover-foreground border border-border rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold text-foreground mb-6">Create API Key</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">Provider & Host</span>
              <Info size={14} className="cursor-help" />
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={hosts.length === 0}
                className="w-full flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3.5 text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
              >
                <span>{hosts.length === 0 ? "Loading hosts..." : displayHostName}</span>
                <ChevronDown size={18} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && hosts.length > 0 && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-popover border border-border rounded-2xl p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {hosts.map((host) => (
                    <button
                      key={host.id}
                      type="button"
                      onClick={() => {
                        setSelectedHostId(host.id);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-xl transition-colors"
                    >
                      {host.provider.toUpperCase()} - {host.hostname}
                      {selectedHostId === host.id && <Check size={14} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key Name Field */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">Key Name</span>
            </div>
            <input
              type="text"
              autoFocus
              className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="e.g. Production Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="text-sm">Key Value (Optional)</span>
            </div>
            <input
              type="text"
              className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="Leave blank to auto-generate"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
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
              disabled={!name?.trim() || !selectedHostId || isSubmitting}
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