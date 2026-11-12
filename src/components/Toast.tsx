import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

type Listener = (toast: ToastData) => void;
const listeners = new Set<Listener>();

export const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
  const toast: ToastData = {
    id: Math.random().toString(36).substring(2, 9),
    message,
    type,
  };
  listeners.forEach((fn) => fn(toast));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handler: Listener = (newToast) => {
      setToasts((prev) => [...prev.slice(-3), newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-sm">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarn = toast.type === 'warning';
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs font-semibold animate-in fade-in slide-in-from-top duration-200 transition-all ${
              isSuccess
                ? 'bg-[#121c14]/95 text-emerald-200 border-emerald-500/30'
                : isWarn
                ? 'bg-[#211608]/95 text-amber-200 border-amber-500/30'
                : 'bg-[#161622]/95 text-slate-100 border-amber-500/30'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {isWarn && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {!isSuccess && !isWarn && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
