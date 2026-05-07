"use client"

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle"; // 🚀 1. Import ModeToggle

export const LoginForm = () => {
  const { login, isLoading, error, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }

    const timer = setTimeout(() => {
      setPassword("");
    }, 100); 

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        router.push("/"); 
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      localStorage.setItem("remembered_email", email);
      router.push("/");
    } catch (err) {
      setPassword(""); 
      const status = (err as any)?.status ?? (err as any)?.response?.status;
      const data = (err as any)?.data ?? (err as any)?.response?.data;
      const backendMessage = (err as any)?.message ?? data?.message ?? null;

      if (status === 409) {
        toast.error(backendMessage || "Conflict: please check your credentials.");
      } else if (status === 401) {
        toast.error(backendMessage || "Incorrect email or password.");
      } else {
        toast.error(backendMessage || "An unexpected error occurred.");
      }
    }
  };

  if (user) {
    return (
      <>
        {/* 🚀 2. แปะปุ่มสลับธีมมุมขวาบน */}
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>
        {/* 🚀 3. เปลี่ยนสีกล่องให้เข้ากับ Theme (bg-card) */}
        <div className="w-full max-w-sm p-6 bg-card border border-border rounded-2xl flex flex-col items-center justify-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-foreground font-bold mb-1">Welcome back, {user.username}</h2>
            <p className="text-muted-foreground text-xs">Redirecting...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-sm p-8 bg-card border border-border rounded-2xl flex flex-col gap-5 shadow-2xl"
      >
        <div className="flex flex-col gap-1 mb-2">
          <h2 className="text-xl font-bold text-foreground">Sign In</h2>
          <p className="text-xs text-muted-foreground">Access your engineering node.</p>
        </div>
        
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground ml-1">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username" 
            placeholder="name@example.com"
            // 🚀 5. เปลี่ยนสี Input เป็น bg-background
            className="bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground ml-1">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" 
            placeholder="••••••••"
            className="bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="mt-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
        >
          {isLoading ? "Authenticating..." : "Sign In"}
        </button>

        <div className="text-xs text-muted-foreground text-center">
          Don't have an account?{" "}
          <button type="button" onClick={() => router.push("/register")} className="text-primary hover:underline font-medium">
            Create account
          </button>
        </div>
      </form>
    </>
  );
};