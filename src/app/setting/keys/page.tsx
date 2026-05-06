"use client";

import { useAuth } from "@/features/auth/context/AuthContext";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { ApiKeyManager } from "@/features/auth/components/ApiKeyManager";
import { redirect } from "next/navigation";
import { KeyRound, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ApiKeysPage() {
  const { user } = useAuth();

  if (user && !user.email) {
    redirect("/");
    return null;
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050505] pb-20">
        <div className="max-w-5xl mx-auto px-6 pt-10">
          
          {/* Navigation Back */}
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8 w-fit"
          >
            <ChevronLeft size={18} />
            <span className="text-sm">Back to Chat</span>
          </Link>

          {/* Page Header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <KeyRound size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="text-slate-500">Manage your API authentication tokens</p>
            </div>
          </div>

          {/* 🚀 ตัวจัดการ API Key ที่เราทำ Mock ไว้ */}
          <ApiKeyManager />
          
        </div>
      </main>
    </AuthGuard>
  );
}