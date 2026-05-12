"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AUTH_CONFIG } from "@/features/auth";
import { LogIn, LogOut, KeyRound, User as UserIcon, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

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
  
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const canManageKeys = user && user.email;

  return (
    <div className="flex items-center bg-background/80 backdrop-blur-md border border-border p-1.5 rounded-full shadow-lg">
      {user ? (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((s) => !s)}
            className="flex items-center gap-3 px-2 py-1 rounded-full hover:bg-accent transition-all group"
          >
            <div className="flex flex-col items-end pr-1 hidden sm:flex">
              <span className="text-xs font-bold text-foreground transition">
                {user.username || user.email?.split('@')[0]}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-inner border border-blue-400/30">
              {getInitials(user.username || user.email)}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-48 bg-popover border border-border rounded-xl shadow-xl p-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
              
              <div className="px-3 py-2 border-b border-border mb-1">
                 <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Account Settings</p>
              </div>

              {canManageKeys && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/setting/keys");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <KeyRound size={14} className="text-blue-400" />
                  Manage API Keys
                </button>
              )}

              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <UserIcon size={14} />
                Profile
              </button>

              <button
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                {theme === "dark" ? (
                  <Sun size={14} className="text-yellow-400" />
                ) : (
                  <Moon size={14} className="text-slate-600" />
                )}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>

              <div className="h-[1px] bg-border my-1" />

              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  router.push(AUTH_CONFIG.redirect.afterLogoutUrl);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
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
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-full text-sm transition-all"
        >
          <LogIn size={16} />
          <span>Login</span>
        </button>
      )}
    </div>
  );
};