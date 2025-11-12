'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { useState } from 'react';

interface TillReconciliationModalProps {
  isOpen: boolean;
  tillId: string;
  cashierName: string;
  expectedTotal: number;
  onSubmit: (actualTotal: number, notes: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

export function TillReconciliationModal({
  isOpen,
  tillId,
  cashierName,
  expectedTotal,
  onSubmit,
  onClose,
  isProcessing = false,
}: TillReconciliationModalProps) {
  const [actualTotal, setActualTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const actual = parseFloat(actualTotal) || 0;
  const variance = actual - expectedTotal;
  const variancePercentage = expectedTotal > 0 ? (variance / expectedTotal) * 100 : 0;

  const getVarianceStatus = (): 'balanced' | 'minor' | 'major' => {
    if (variance === 0) return 'balanced';
    if (Math.abs(variancePercentage) <= 2) return 'minor';
    return 'major';
  };

  const status = getVarianceStatus();

  const handleSubmit = () => {
    setError('');

    if (!actualTotal.trim()) {
      setError('Please enter the actual till amount');
      return;
    }

    if (actual < 0) {
      setError('Till amount cannot be negative');
      return;
    }

    onSubmit(actual, notes);
    setActualTotal('');
    setNotes('');
  };

  const handleClose = () => {
    setActualTotal('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Till Reconciliation</CardTitle>
              <CardDescription>{cashierName}</CardDescription>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Expected Amount */}
            <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expected Amount</p>
              <p className="text-2xl font-bold">Ksh {expectedTotal.toLocaleString()}</p>
            </div>

            {/* Actual Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Actual Till Amount</label>
              <input
                type="number"
                placeholder="0.00"
                value={actualTotal}
                onChange={(e) => setActualTotal(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border rounded-lg text-lg font-semibold text-center dark:bg-gray-900 dark:border-gray-700"
                aria-label="Actual till amount"
                step="0.01"
                min="0"
              />
            </div>

            {/* Variance Display */}
            {actual > 0 && (
              <div
                className={`rounded-lg p-4 ${
                  status === 'balanced'
                    ? 'bg-green-50 dark:bg-green-950'
                    : status === 'minor'
                      ? 'bg-yellow-50 dark:bg-yellow-950'
                      : 'bg-red-50 dark:bg-red-950'
                }`}
              >
                <div className="flex items-start gap-2">
                  {status === 'balanced' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {status === 'balanced' ? 'Balanced' : `Variance: Ksh ${Math.abs(variance).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {variance > 0 ? '+' : ''}{variancePercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <textarea
                placeholder="Add any notes about this reconciliation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700"
                rows={3}
                aria-label="Reconciliation notes"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleClose}
                variant="outline"
                disabled={isProcessing}
                aria-label="Cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing || !actualTotal.trim()}
                aria-label="Submit reconciliation"
              >
                {isProcessing ? 'Submitting...' : 'Submit'}
              </Button>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Reconciliation will be saved and can be approved by admin
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
