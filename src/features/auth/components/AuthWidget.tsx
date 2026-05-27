"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AUTH_CONFIG } from "@/features/auth";
import { LogIn, LogOut, KeyRound, User as UserIcon, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-2 py-1 rounded-full hover:bg-accent transition-all">
              <div className="flex flex-col items-end pr-1 hidden sm:flex">
                <span className="text-xs font-bold text-foreground">
                  {user.username || user.email?.split('@')[0]}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm border border-blue-400/30">
                {getInitials(user.username || user.email)}
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl z-[100]">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Account Settings
            </DropdownMenuLabel>

            {canManageKeys && (
              <DropdownMenuItem onClick={() => router.push("/setting/keys")}>
                <KeyRound size={14} className="mr-2 text-blue-400" />
                Manage API Keys
              </DropdownMenuItem>
            )}

            <DropdownMenuItem>
              <UserIcon size={14} className="mr-2" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <Sun size={14} className="mr-2 text-yellow-400" />
              ) : (
                <Moon size={14} className="mr-2 text-slate-600" />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem 
              className="text-red-500 focus:text-red-600" 
              onClick={async () => await logout()}
            >
              <LogOut size={14} className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button 
          onClick={() => router.push(AUTH_CONFIG.redirect.unauthorizedUrl)} 
          className="rounded-full px-5"
        >
          <LogIn size={16} className="mr-2" />
          Login
        </Button>
      )}
    </div>
  );
};