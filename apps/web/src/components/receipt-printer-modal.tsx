'use client';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smartduka/ui';
import { Printer, Mail, Download, X } from 'lucide-react';
import { useState } from 'react';

interface ReceiptPrinterModalProps {
  isOpen: boolean;
  receiptData: any;
  isPrinting: boolean;
  printError: string | null;
  onPrint: () => void;
  onEmail: (email: string) => void;
  onClose: () => void;
}

export function ReceiptPrinterModal({
  isOpen,
  receiptData,
  isPrinting,
  printError,
  onPrint,
  onEmail,
  onClose,
}: ReceiptPrinterModalProps) {
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  if (!isOpen || !receiptData) return null;

  const handleEmailSubmit = () => {
    if (emailAddress.trim()) {
      onEmail(emailAddress);
      setEmailAddress('');
      setShowEmailInput(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Receipt Options</CardTitle>
                <CardDescription>
                  Receipt #{receiptData.receiptNumber}
                </CardDescription>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Message */}
            {printError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                {printError}
              </div>
            )}

            {/* Receipt Preview */}
            <div className="rounded-lg border bg-gray-50 p-3 dark:bg-gray-900">
              <div className="text-center text-xs font-mono">
                <div className="font-bold">{receiptData.shopName || 'SmartDuka'}</div>
                <div className="text-gray-600 dark:text-gray-400">
                  {new Date().toLocaleString()}
                </div>
                <div className="my-2 border-t border-b py-2">
                  {receiptData.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span>{item.name}</span>
                      <span>Ksh {(item.unitPrice * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="font-bold">
                  Total: Ksh {receiptData.total?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onPrint}
                disabled={isPrinting}
                className="gap-2"
                aria-label="Print receipt"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                onClick={() => setShowEmailInput(!showEmailInput)}
                variant="outline"
                className="gap-2"
                aria-label="Email receipt"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>

            {/* Email Input */}
            {showEmailInput && (
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700"
                  aria-label="Email address"
                />
                <Button
                  onClick={handleEmailSubmit}
                  disabled={!emailAddress.trim() || isPrinting}
                  className="w-full"
                  aria-label="Send email"
                >
                  Send
                </Button>
              </div>
            )}

            {/* Close Button */}
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
              aria-label="Close"
            >
              Close
            </Button>

            {/* Helper Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Receipt will be saved automatically
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
