"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  title?: string;
  description: string;
  type: ToastType;
  duration?: number; // ms, 0 = persistent
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => string;
  success: (description: string, title?: string, duration?: number) => string;
  error: (description: string, title?: string, duration?: number) => string;
  info: (description: string, title?: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = {
      id,
      title: t.title,
      description: t.description,
      type: t.type || "info",
      duration: typeof t.duration === "number" ? t.duration : 5000,
    };
    setToasts((s) => [...s, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== id));
      }, toast.duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (description: string, title?: string, duration?: number) =>
      push({ title, description, type: "success", duration }),
    [push]
  );

  const error = useCallback(
    (description: string, title?: string, duration?: number) =>
      push({ title, description, type: "error", duration }),
    [push]
  );

  const info = useCallback(
    (description: string, title?: string, duration?: number) =>
      push({ title, description, type: "info", duration }),
    [push]
  );

  return (
    <ToastContext.Provider value={{ push, success, error, info, dismiss }}>
      {children}

      <div 
        aria-live="polite" 
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] flex flex-col items-center gap-3 w-max pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 p-1.5 pl-4 rounded-full shadow-2xl bg-[#141414] border border-white/10 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300"
            role="status"
          >
            {/* ไอคอนด้านซ้าย */}
            <div className="flex-shrink-0">
              {t.type === "success" && (
                <svg className="h-5 w-5 text-[#00a651]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {t.type === "error" && (
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {t.type === "info" && (
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="text-sm font-medium text-white pr-4">
              {t.description || t.title}
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="bg-[#1a3324] hover:bg-[#20402d] text-[#00a651] px-5 py-2 rounded-full text-xs font-bold transition-colors focus:outline-none"
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};

export default ToastProvider;