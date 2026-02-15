'use client';

import { Toast } from '@/lib/use-toast';

type ToastContainerProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-md p-4 text-sm shadow-lg border animate-in slide-in-from-top-2 fade-in ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400'
              : toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400'
              : 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-400'
          }`}
        >
          <div className="font-medium">{toast.title}</div>
          {toast.message && <div className="text-xs opacity-90 mt-1">{toast.message}</div>}
          <button
            onClick={() => onDismiss(toast.id)}
            className="absolute top-2 right-2 text-foreground/50 hover:text-foreground"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
