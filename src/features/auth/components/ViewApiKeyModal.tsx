"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Loader2, Key } from "lucide-react";
import { apiKeyService } from "../services/apiKey.service";
import { useToast } from "@/components/ui/Toast"; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKeyId: string | null;
}

export const ViewApiKeyModal = ({ isOpen, onClose, apiKeyId }: Props) => {
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { success } = useToast(); 

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
      
      //ยิง Toast สีเขียวคำว่า "copied"
      success("copied"); 

      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !apiKeyId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[500px] bg-popover border border-border rounded-[24px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/20 rounded-full text-primary">
            <Key size={24} />
          </div>
          <h2 className="text-2xl font-bold text-popover-foreground">Secret API Key</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Please keep this API key secret. Never share it with others or expose it in public frontend code.
        </p>

        <div className="relative flex items-center bg-muted border border-border rounded-xl p-4 min-h-[60px]">
          {isLoading ? (
            <div className="flex items-center justify-center w-full text-muted-foreground gap-2">
              <Loader2 size={18} className="animate-spin" /> Loading...
            </div>
          ) : (
            <code className="text-primary font-mono text-sm break-all pr-12">
              {fullKey}
            </code>
          )}

          {!isLoading && fullKey && (
            <button
              onClick={handleCopy}
              className="absolute right-4 p-2 bg-background hover:bg-accent border border-border text-foreground rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
            </button>
          )}
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="bg-accent hover:bg-accent/80 border border-border text-accent-foreground px-8 py-3 rounded-full font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};