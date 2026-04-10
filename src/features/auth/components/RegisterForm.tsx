"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { AUTH_CONFIG } from "../config/auth.config";

export const RegisterForm = () => {
  const router = useRouter();
  const { register } = useAuth();

  const toast = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [backendError, setBackendError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errs: typeof fieldErrors = {};
    const usernameMin = AUTH_CONFIG.validation.usernameMinLength;
    if (!username.trim() || username.trim().length < usernameMin) {
      errs.username = `Username must be at least ${usernameMin} characters.`;
    }

    const emailRegex =
      AUTH_CONFIG.validation.emailRegex instanceof RegExp
        ? AUTH_CONFIG.validation.emailRegex
        : new RegExp(String(AUTH_CONFIG.validation.emailRegex));
    if (!emailRegex.test(email)) {
      errs.email = "Please enter a valid email address.";
    }

    const minLen = AUTH_CONFIG.validation.minPasswordLength;
    if (password.length < minLen) {
      errs.password = `Password must be at least ${minLen} characters.`;
    } else {
      if (AUTH_CONFIG.validation.requireUppercase && !/[A-Z]/.test(password)) {
        errs.password = (errs.password ? errs.password + " " : "") + "Include at least one uppercase letter.";
      }
      if (AUTH_CONFIG.validation.requireNumber && !/[0-9]/.test(password)) {
        errs.password = (errs.password ? errs.password + " " : "") + "Include at least one number.";
      }
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackendError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register({ username, email, password, confirmPassword });
      // Auto-login behavior confirmed — redirect to main app
      router.push(AUTH_CONFIG.redirect.afterLoginUrl);
    } catch (err: any) {

      const status = err?.status ?? err?.response?.status;
      const data = err?.data ?? err?.response?.data;
      const backendMessage = err?.message ?? data?.message ?? null;

      if (status === 409) {
        const msg = backendMessage || "Conflict error. Please try a different value.";
        setBackendError(msg);
        toast.error(msg);
      } else if (status === 400) {
        // Validation errors
        const fieldErrors = data?.errors || null;
        if (fieldErrors && typeof fieldErrors === "object") {
          // map field errors into local state where possible
          const mapped: Record<string, string> = {};
          Object.keys(fieldErrors).forEach((k) => {
            mapped[k] = String((fieldErrors as any)[k]);
          });
          setFieldErrors(mapped as any);
          toast.error("Please fix the highlighted fields and try again.");
        } else {
          const msg = backendMessage || "Validation failed. Please check your input.";
          setBackendError(msg);
          toast.error(msg);
        }
      } else {
        const msg = backendMessage || "An unexpected error occurred. Please try again.";
        setBackendError(msg);
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm p-8 bg-[#0a0a0a] border border-white/5 rounded-2xl flex flex-col gap-5 shadow-2xl shadow-black/50"
    >
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-xl font-semibold text-slate-200">Create Account</h2>
        <p className="text-xs text-slate-500">Register a new account to access the node.</p>
      </div>

      {backendError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
          {backendError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium ml-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder="your-username"
          className="bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
          required
          aria-invalid={!!fieldErrors.username}
          aria-describedby={fieldErrors.username ? "username-error" : undefined}
        />
        {fieldErrors.username && <div id="username-error" className="text-xs text-red-400 mt-1">{fieldErrors.username}</div>}
      </div>

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
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
        {fieldErrors.email && <div id="email-error" className="text-xs text-red-400 mt-1">{fieldErrors.email}</div>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium ml-1">Password</label>
        <div className="relative w-full">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            required
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 flex items-center text-slate-400 hover:text-slate-200 bg-transparent"
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.44 21.44 0 014.88-6.25"></path>
                <path d="M1 1l22 22"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
        </div>
        {fieldErrors.password && <div id="password-error" className="text-xs text-red-400 mt-1">{fieldErrors.password}</div>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium ml-1">Confirm Password</label>
        <div className="relative w-full">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            required
            aria-invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((s) => !s)}
            aria-pressed={showConfirmPassword}
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 flex items-center text-slate-400 hover:text-slate-200 bg-transparent"
          >
            {showConfirmPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.44 21.44 0 014.88-6.25"></path>
                <path d="M1 1l22 22"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
        </div>
        {fieldErrors.confirmPassword && <div id="confirmPassword-error" className="text-xs text-red-400 mt-1">{fieldErrors.confirmPassword}</div>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 disabled:text-slate-400 text-white text-sm font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </button>

      <div className="text-xs text-slate-500 text-center">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="text-blue-400 hover:underline"
        >
          Sign in
        </button>
      </div>
    </form>
  );
};