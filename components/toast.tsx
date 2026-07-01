'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(({ title, description, variant = 'info' }: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-2), { id, title, description, variant }]); // Max 3 toasts
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />,
    info: <Info className="h-4 w-4 text-indigo-500 shrink-0" />,
  };

  const borders = {
    success: 'border-green-100 dark:border-green-900/50 bg-green-50/95 dark:bg-green-950/90',
    error: 'border-red-100 dark:border-red-900/50 bg-red-50/95 dark:bg-red-950/90',
    info: 'border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/95 dark:bg-indigo-950/90',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 250 }}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-md backdrop-blur-sm ${borders[toast.variant || 'info']}`}
    >
      {icons[toast.variant || 'info']}
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{toast.title}</h4>
        {toast.description && (
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 transition-colors p-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
