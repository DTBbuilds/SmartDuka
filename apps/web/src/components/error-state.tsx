'use client';

import { AlertCircle, X } from 'lucide-react';
import { Button } from '@smartduka/ui';
import { useEffect, useState } from 'react';

interface ErrorStateProps {
  message: string;
  details?: string;
  onDismiss?: () => void;
  autoClose?: boolean;
  duration?: number;
  showAnimation?: boolean;
}

export function ErrorState({
  message,
  details,
  onDismiss,
  autoClose = true,
  duration = 5000,
  showAnimation = true,
}: ErrorStateProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950 ${
        showAnimation ? 'animate-in fade-in slide-in-from-top-2 duration-300' : ''
      }`}
    >
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-100">
            {message}
          </h3>
          {details && (
            <p className="mt-1 text-sm text-red-800 dark:text-red-200">
              {details}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsVisible(false);
            onDismiss?.();
          }}
          className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
