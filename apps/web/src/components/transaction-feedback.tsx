'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export type FeedbackType = 'loading' | 'success' | 'error' | null;

interface TransactionFeedbackProps {
  type: FeedbackType;
  message?: string;
  duration?: number;
  onComplete?: () => void;
}

export function TransactionFeedback({
  type,
  message,
  duration = 3000,
  onComplete,
}: TransactionFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (type) {
      setIsVisible(true);

      if (type !== 'loading') {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [type, duration, onComplete]);

  if (!isVisible || !type) return null;

  const baseClasses =
    'fixed bottom-4 right-4 md:bottom-6 md:right-6 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm z-50 animate-in fade-in slide-in-from-bottom-4 duration-300';

  const typeClasses = {
    loading: 'bg-blue-500/90 text-white',
    success: 'bg-green-500/90 text-white',
    error: 'bg-red-500/90 text-white',
  };

  const Icon = {
    loading: Loader2,
    success: CheckCircle2,
    error: AlertCircle,
  }[type];

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <Icon
        className={`h-5 w-5 flex-shrink-0 ${
          type === 'loading' ? 'animate-spin' : ''
        }`}
      />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
