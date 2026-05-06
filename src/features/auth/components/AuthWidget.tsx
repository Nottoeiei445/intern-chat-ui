"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AUTH_CONFIG } from "@/features/auth";
import { LogIn, LogOut, KeyRound, User as UserIcon } from "lucide-react";

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const AuthWidget = () => {
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

  // 🚀 ลอจิกการดักสิทธิ์: ถ้ามี email แสดงว่าเป็น User ที่ลงทะเบียนแล้ว (ไม่ใช่ Guest)
  const canManageKeys = user && user.email;

  return (
    <div className="absolute top-4 right-4 z-30 flex items-center bg-[#050505]/60 backdrop-blur-md border border-white/10 p-1.5 rounded-full shadow-2xl">
      {user ? (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="flex items-center gap-3 px-2 py-1 rounded-full hover:bg-white/5 transition-all group"
          >
            <div className="flex flex-col items-end pr-1 hidden sm:flex">
              {/* 🚀 เปลี่ยนจาก font-bold เป็น font-bold เพื่อความคมชัด */}
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition">
                {user.username || user.email?.split('@')[0]}
              </span>
            </div>
            {/* วงกลมชื่อย่อใช้ font-bold ถูกต้องแล้ว */}
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-inner border border-blue-400/30">
              {getInitials(user.username || user.email)}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-48 bg-[#0b0b0b] border border-white/10 rounded-xl shadow-2xl p-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
              
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                 <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Account Settings</p>
              </div>

              {canManageKeys && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/setting/keys");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <KeyRound size={14} className="text-blue-400" />
                  Manage API Keys
                </button>
              )}

              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <UserIcon size={14} />
                Profile
              </button>

              <div className="h-[1px] bg-white/5 my-1" />

              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  router.push(AUTH_CONFIG.redirect.afterLogoutUrl);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <button 
          onClick={() => router.push(AUTH_CONFIG.redirect.unauthorizedUrl)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full text-sm transition-all"
        >
          <LogIn size={16} />
          <span>Login</span>
        </button>
      )}
    </div>
  );
};