'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessAnimationProps {
  isVisible: boolean;
  message?: string;
  onComplete?: () => void;
  duration?: number;
}

export function SuccessAnimation({
  isVisible,
  message = 'Success!',
  onComplete,
  duration = 2000,
}: SuccessAnimationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, duration, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="animate-in zoom-in duration-300">
        <div className="flex flex-col items-center gap-3 rounded-lg bg-white dark:bg-slate-900 p-6 shadow-xl">
          <CheckCircle2 className="h-12 w-12 text-green-500 animate-bounce" />
          <p className="text-sm font-semibold text-center text-foreground">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
