"use client";

import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <RegisterForm />
    </div>
  );
}