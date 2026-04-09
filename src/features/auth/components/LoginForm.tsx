"use client"

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export const LoginForm = () => {
  const { login, isLoading, error, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // 🌟 เติม useEffect ตัวนี้เข้ามาทำหน้าที่ Redirect กลับหน้าหลัก
  useEffect(() => {
    if (user) {
      // หน่วงเวลา 1 วินาทีให้เห็นแอนิเมชัน Welcome back แล้วเด้งไปหน้า /
      const timer = setTimeout(() => {
        router.push("/"); 
      }, 1000);

      // คลีนอัพ timer เผื่อ component ถูกทำลายก่อน
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      router.push("/");
    } catch (err) {
      // Error is handled by the auth context and displayed below
    }
  };

  if (user) {
    return (
      <div className="w-full max-w-sm p-6 bg-[#0a0a0a] border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-slate-200 font-medium mb-1">Welcome back, {user.username}</h2>
          <p className="text-slate-500 text-xs">Authentication successful. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className="w-full max-w-sm p-8 bg-[#0a0a0a] border border-white/5 rounded-2xl flex flex-col gap-5 shadow-2xl shadow-black/50"
    >
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-xl font-semibold text-slate-200">Sign In</h2>
        <p className="text-xs text-slate-500">Enter your credentials to access the node.</p>
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
          autoComplete="email"
          placeholder="name@example.com"
          className="bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium ml-1">Password</label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          className="bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
          required
        />
      </div>

      <button 
        type="submit" 
        disabled={isLoading}
        className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 disabled:text-slate-400 text-white text-sm font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Authenticating...
          </>
        ) : (
          "Sign In"
        )}
      </button>
        <div className="text-xs text-slate-500 text-center">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => router.push("/register")}
          className="text-blue-400 hover:underline"
        >
          Create account
        </button>
      </div>
    </form>
  );
};