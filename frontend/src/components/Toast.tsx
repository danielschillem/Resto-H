"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// Global emitter so non-React code (api.ts) can trigger toasts
type Listener = (message: string, type: ToastType) => void;
const listeners = new Set<Listener>();
export function emitToast(message: string, type: ToastType = "error") {
  listeners.forEach((fn) => fn(message, type));
}

let nextId = 1;

const ICONS: Record<ToastType, string> = {
  success: "fa-circle-check",
  error: "fa-circle-exclamation",
  warning: "fa-triangle-exclamation",
  info: "fa-circle-info",
};

const TYPE_CLASSES: Record<ToastType, string> = {
  success: "bg-green-50 border-green-300 text-green-800",
  error: "bg-red-50 border-red-300 text-red-800",
  warning: "bg-amber-50 border-amber-300 text-amber-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "error") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  // Subscribe to global emitter for non-React callers (api.ts)
  useEffect(() => {
    const handler: Listener = (msg, t) => showToast(msg, t);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, [showToast]);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-4 right-4 z-99999 flex flex-col gap-2 max-w-105"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg ${TYPE_CLASSES[t.type]}`}
          >
            <i className={`fa-solid ${ICONS[t.type]} text-base shrink-0`} />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              title="Fermer"
              className="bg-transparent border-none cursor-pointer opacity-60 p-0 text-sm hover:opacity-100"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
