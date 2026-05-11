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
      <main className="min-h-screen bg-background pb-20 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-6 pt-10">
          
          <Link 
            href="/" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 w-fit"
          >
            <ChevronLeft size={18} />
            <span className="text-sm">Back to Chat</span>
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <KeyRound size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">Manage your API authentication tokens</p>
            </div>
          </div>

          <ApiKeyManager />
          
        </div>
      </main>
    </AuthGuard>
  );
}