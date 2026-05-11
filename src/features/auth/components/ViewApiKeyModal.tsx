// src/features/auth/components/ViewApiKeyModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Loader2, Key } from "lucide-react";
import { apiKeyService } from "../services/apiKey.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKeyId: string | null;
}

export const ViewApiKeyModal = ({ isOpen, onClose, apiKeyId }: Props) => {
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ดึงข้อมูลเมื่อ Modal เปิดและมี ID
  useEffect(() => {
    if (isOpen && apiKeyId) {
      fetchFullKey(apiKeyId);
    } else {
      setFullKey(null); // เคลียร์ค่าตอนปิด
    }
  }, [isOpen, apiKeyId]);

  const fetchFullKey = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await apiKeyService.getKeyById(id);
      // หยิบฟิลด์ apiKey ที่เป็นคีย์เต็มออกมา
      setFullKey(response?.data?.apiKey || "");
    } catch (error) {
      console.error("Failed to fetch full API key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (fullKey) {
      navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !apiKeyId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[500px] bg-[#1e1e1e] rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#00a651]/20 rounded-full text-[#00a651]">
            <Key size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">Secret API Key</h2>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Please keep this API key secret. Never share it with others or expose it in public frontend code.
        </p>

        {/* กล่องแสดง Key */}
        <div className="relative flex items-center bg-[#111111] border border-white/10 rounded-xl p-4 min-h-[60px]">
          {isLoading ? (
            <div className="flex items-center justify-center w-full text-slate-500 gap-2">
              <Loader2 size={18} className="animate-spin" /> กำลังดึงข้อมูล...
            </div>
          ) : (
            <code className="text-[#00a651] font-mono text-sm break-all pr-12">
              {fullKey}
            </code>
          )}

          {/* ปุ่ม Copy */}
          {!isLoading && fullKey && (
            <button
              onClick={handleCopy}
              className="absolute right-4 p-2 bg-[#252525] hover:bg-[#333333] text-slate-300 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={18} className="text-[#00a651]" /> : <Copy size={18} />}
            </button>
          )}
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="bg-[#333333] hover:bg-[#444444] text-white px-8 py-3 rounded-full font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};