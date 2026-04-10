"use client"

import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export const LoginForm = () => {
  const { login, isLoading, error, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const toast = useToast();

  // ==========================================
  // 1. 🧹 ลอจิกจัดการตัวแปร (จำ Email แต่ฆ่า Password)
  // ==========================================
  useEffect(() => {
    // ดึง Email มาใส่ตามปกติ
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }

    // 🔥 ท่าไม้ตาย 1: หน่วงเวลาล้าง Password นิดนึง (100ms)
    // เพราะเบราว์เซอร์จะ Auto-fill หลังจาก React Render เสร็จเสี้ยววินาที
    // การใช้ Timeout จะทำให้เรา "กวาดขยะ" หลังจากที่มันแอบมาหยอดเสร็จครับ
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
      setPassword(""); // ล้างรหัสถ้าล็อกอินพลาด
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
      <div className="w-full max-w-sm p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-slate-200 font-medium mb-1">Welcome back, {user.username}</h2>
          <p className="text-slate-500 text-xs">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="w-full max-w-sm p-8 bg-[#0a0a0a] border border-white/5 rounded-2xl flex flex-col gap-5 shadow-2xl"
    >
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-xl font-semibold text-slate-200">Sign In</h2>
        <p className="text-xs text-slate-500">Access your engineering node.</p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium ml-1">Email Address</label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username" 
          placeholder="name@example.com"
          className="bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-all"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium ml-1">Password</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          // 🔥 ท่าไม้ตาย 2: เปลี่ยนเป็น "new-password"
          // เบราว์เซอร์ส่วนใหญ่จะไม่ออโต้ฟิลรหัสเก่าใส่ช่องที่มีกำกับว่าเป็นรหัสใหม่ครับ
          autoComplete="new-password" 
          placeholder="••••••••"
          className="bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-all"
          required
        />
      </div>

      <button 
        type="submit" 
        disabled={isLoading}
        className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? "Authenticating..." : "Sign In"}
      </button>

      <div className="text-xs text-slate-500 text-center">
        Don't have an account?{" "}
        <button type="button" onClick={() => router.push("/register")} className="text-blue-400 hover:underline">
          Create account
        </button>
      </div>
    </form>
  );
};