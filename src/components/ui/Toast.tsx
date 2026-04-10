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

      <div aria-live="polite" className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-[320px] max-w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 p-3 rounded-lg shadow-lg bg-[#0b0b0b] border border-white/5"
            role="status"
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.type === "success" && (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879A1 1 0 003.293 9.293l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                </svg>
              )}
              {t.type === "error" && (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M8.257 3.099c.366-.446.957-.57 1.438-.28l.094.07 7 5.5A1 1 0 0117 9.5V15a3 3 0 01-3 3H6a3 3 0 01-3-3V6.5a1 1 0 01.379-.774l5.878-4.627zM9 7a1 1 0 10-2 0v4a1 1 0 102 0V7zm1 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                </svg>
              )}
              {t.type === "info" && (
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-9-1a1 1 0 10-2 0v4a1 1 0 102 0V9zm1-3a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <div className="text-sm font-semibold text-slate-200">{t.title}</div>}
              <div className="mt-1 text-xs text-slate-400">{t.description}</div>
            </div>

            <div className="flex-shrink-0">
              <button
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-slate-200 focus:outline-none"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
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
