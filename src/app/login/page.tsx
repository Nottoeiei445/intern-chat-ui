"use client"

import { AuthProvider } from "../../features/auth/context/AuthContext";
import { LoginForm } from "../../features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <LoginForm />
      </div>
    </AuthProvider>
  );
}