"use client";

import React, { useState, useRef, useEffect } from "react";
import { Database, ChevronDown } from "lucide-react";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AUTH_CONFIG } from "@/features/auth";

interface Props {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isSidebarOpen: boolean;
  onToggle: () => void;
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const Header = ({ selectedModel, onModelChange, isSidebarOpen, onToggle }: Props) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[#050505]/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <div className="relative flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-slate-200 min-w-[160px]">
          <Database size={14} className="text-blue-500" />
          <span className="text-xs font-bold font-ibm flex-1 truncate">{selectedModel}</span>
          <ChevronDown size={14} className="text-slate-500" />
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            <option value="qwen2.5:7b" className="bg-[#111] text-white">
              Qwen 2.5 (7B)
            </option>
            <option value="llama3" className="bg-[#111] text-white">
              Llama 3 (8B)
            </option>
            <option value="gemma4" className="bg-[#111] text-white">
              gemma4 (8B)
            </option>
            <option value="qwen3-vl" className="bg-[#111] text-white">
              Qwen 3 VL (8B)
            </option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-ibm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Ollama Connected
        </div>

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {getInitials(user.username || user.email)}
              </div>
              <span className="text-sm text-slate-200 truncate max-w-[120px]">{user.username}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#0b0b0b] border border-white/5 rounded-md shadow-lg p-1 z-20">
                <button
                  onClick={async () => {
                    await logout();
                    router.push(AUTH_CONFIG.redirect.afterLogoutUrl);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-white/5 rounded"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => router.push(AUTH_CONFIG.redirect.unauthorizedUrl)}>
            Login
          </Button>
        )}
      </div>
    </header>
  );
};