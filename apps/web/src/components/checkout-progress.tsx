'use client';

import { Check } from 'lucide-react';

export interface CheckoutStep {
  id: string;
  label: string;
  description: string;
}

interface CheckoutProgressProps {
  steps: CheckoutStep[];
  currentStep: number;
  isProcessing?: boolean;
}

export function CheckoutProgress({
  steps,
  currentStep,
  isProcessing = false,
}: CheckoutProgressProps) {
  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="flex gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;

          return (
            <div key={step.id} className="flex flex-1 items-center gap-2">
              {/* Step Circle */}
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full font-semibold text-sm
                  transition-all duration-200
                  ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-1 rounded-full transition-all duration-200
                    ${isCompleted
                      ? 'bg-green-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                    }
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Info */}
      <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Step {currentStep + 1} of {steps.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {steps[currentStep]?.label}
            </p>
          </div>
          {isProcessing && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary">Processing...</span>
            </div>
          )}
        </div>
        {steps[currentStep]?.description && (
          <p className="mt-2 text-xs text-muted-foreground">
            {steps[currentStep].description}
          </p>
        )}
      </div>
    </div>
  );
}
